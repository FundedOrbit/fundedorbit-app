import { supabase } from "./supabaseClient";

/* ---------- fechas ---------- */
export function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}
export function isoFromDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}
export function nextMonthlyAnniversary(purchaseDateStr, todayStr) {
  const purchase = new Date(purchaseDateStr + "T00:00:00");
  const today = new Date(todayStr + "T00:00:00");
  if (isNaN(purchase) || isNaN(today)) return null;
  const day = purchase.getDate();
  let candidate = new Date(today.getFullYear(), today.getMonth(), day);
  if (candidate < today) candidate = new Date(today.getFullYear(), today.getMonth() + 1, day);
  return candidate;
}
export function recurringChargeEndDate(acc) {
  if (acc.passed_date) return acc.passed_date;
  if (acc.status === "quemada" && acc.burned_date) return acc.burned_date;
  if (acc.cancelled && acc.cancelled_date) return acc.cancelled_date;
  return null;
}
export function getRecurringChargeDates(acc) {
  if (!acc.recurring || !acc.purchase_date) return [];
  const endStr = recurringChargeEndDate(acc) || todayISO();
  const purchase = new Date(acc.purchase_date + "T00:00:00");
  const end = new Date(endStr + "T00:00:00");
  if (isNaN(purchase) || isNaN(end) || end < purchase) return [];
  const dates = [];
  let cursor = new Date(purchase.getFullYear(), purchase.getMonth() + 1, purchase.getDate());
  while (cursor <= end) {
    dates.push(isoFromDate(cursor));
    cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, cursor.getDate());
  }
  return dates;
}

/* ---------- métricas por cuenta (misma lógica que la app local) ---------- */
export function accountMetrics(acc) {
  const resetsCost = (acc.resets || []).reduce((s, r) => s + (Number(r.cost) || 0), 0);
  const activationFee = Number(acc.activation_fee) || 0;
  const recurringChargeDates = getRecurringChargeDates(acc);
  const recurringCharges = recurringChargeDates.length;
  const recurringChargesCost = recurringCharges * (Number(acc.purchase_cost) || 0);
  const invested =
    (Number(acc.purchase_cost) || 0) + resetsCost + activationFee + recurringChargesCost;

  const wds = acc.withdrawals || [];
  const withdrawn = wds.reduce(
    (s, w) => s + (w.status === "recibido" ? Number(w.amount) || 0 : 0),
    0
  );
  const pending = wds.reduce(
    (s, w) =>
      s + (w.status === "solicitado" || w.status === "aprobado" ? Number(w.amount) || 0 : 0),
    0
  );
  const denied = wds.reduce(
    (s, w) => s + (w.status === "denegado" ? Number(w.amount) || 0 : 0),
    0
  );
  const net = withdrawn - invested;
  const roi = invested > 0 ? (net / invested) * 100 : 0;

  return {
    invested,
    withdrawn,
    pending,
    denied,
    net,
    roi,
    resetsCost,
    activationFee,
    recurringCharges,
    recurringChargesCost,
  };
}

/* ---------- CRUD ---------- */
export async function fetchAccounts(userId) {
  const { data, error } = await supabase
    .from("accounts")
    .select("*")
    .eq("user_id", userId)
    .order("purchase_date", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function createAccount(userId, payload) {
  const { data, error } = await supabase
    .from("accounts")
    .insert([{ ...payload, user_id: userId }])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateAccount(id, payload) {
  const { data, error } = await supabase
    .from("accounts")
    .update(payload)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteAccount(id) {
  const { error } = await supabase.from("accounts").delete().eq("id", id);
  if (error) throw error;
}

export function daysBetween(a, b) {
  const d1 = new Date(a + "T00:00:00");
  const d2 = new Date(b + "T00:00:00");
  if (isNaN(d1) || isNaN(d2)) return 0;
  return Math.round((d2 - d1) / 86400000);
}

/* ---------- alertas (devuelve datos estructurados, el texto se arma en la UI con i18n) ---------- */
export function computeAlerts(list) {
  const alerts = [];
  const today = todayISO();

  list.forEach((acc) => {
    const m = accountMetrics(acc);
    const id = acc.account_id || "(sin ID)";
    const company = acc.company || "—";

    if (acc.status === "activa") {
      let refDate = acc.purchase_date;
      (acc.resets || []).forEach((r) => {
        if (r.date && refDate && r.date > refDate) refDate = r.date;
      });
      if (refDate) {
        const days = daysBetween(refDate, today);
        if (days > 45) {
          alerts.push({ type: "warn", kind: "inactiveDays", vars: { id, company, days } });
        }
      }
      const wdActiva = (acc.withdrawals || []).filter(
        (w) => w.status === "recibido" && w.amount && Number(w.amount) > 0
      );
      if (wdActiva.length >= 3) {
        alerts.push({ type: "warn", kind: "watchWithdrawals", vars: { id, company, count: wdActiva.length } });
      }
    }

    if (acc.status === "pasada") {
      const wd = (acc.withdrawals || []).filter(
        (w) => w.status === "recibido" && w.amount && Number(w.amount) > 0
      );
      if (wd.length === 0) {
        alerts.push({ type: "info", kind: "fundedNoWithdrawal", vars: { id, company } });
      }
    }

    if (acc.recurring && !acc.cancelled && acc.status === "activa" && acc.purchase_date) {
      const nextBill = nextMonthlyAnniversary(acc.purchase_date, today);
      if (nextBill) {
        const nextBillISO = isoFromDate(nextBill);
        const daysUntil = daysBetween(today, nextBillISO);
        if (daysUntil >= 0 && daysUntil <= 5) {
          alerts.push({
            type: "info",
            kind: "recurringRenewal",
            vars: {
              id,
              company,
              date: nextBillISO,
              days: daysUntil,
              num: m.recurringCharges + 1,
              amount: Number(acc.purchase_cost) || 0,
            },
          });
        }
      }
    }

    (acc.withdrawals || [])
      .filter((w) => w.status === "denegado")
      .forEach((w) => {
        alerts.push({
          type: "warn",
          kind: "denied",
          vars: { id, company, reason: w.denialReason ? `: "${w.denialReason}"` : "" },
        });
      });
  });

  return alerts;
}

export function renderAlert(dict, alert) {
  const template = dict.alerts[alert.kind] || "";
  return template.replace(/\{(\w+)\}/g, (_, k) => (alert.vars[k] != null ? alert.vars[k] : ""));
}

/* ---------- lifecycle ---------- */
export function computeLifecycle(list) {
  const total = list.length;
  const pasadas = list.filter((a) => a.status === "pasada").length;
  const quemadas = list.filter((a) => a.status === "quemada").length;
  const liveCount = list.filter((a) => a.status === "live").length;
  const fundedTotal = list.filter((a) => !!a.passed_date).length;

  let sumDaysPass = 0,
    cntDaysPass = 0;
  let sumDaysBurn = 0,
    cntDaysBurn = 0;
  let burnedNoWithdrawal = 0;
  let sumWithdrawalsAll = 0,
    cntWithWithdrawals = 0;

  list.forEach((acc) => {
    if (acc.passed_date) {
      let ref = acc.purchase_date;
      (acc.resets || []).forEach((r) => {
        if (r.date && r.date <= acc.passed_date && (!ref || r.date > ref)) ref = r.date;
      });
      if (ref) {
        const days = daysBetween(ref, acc.passed_date);
        if (days >= 0) {
          sumDaysPass += days;
          cntDaysPass++;
        }
      }
    }
    if (acc.status === "quemada" && acc.burned_date) {
      let ref = acc.passed_date || acc.purchase_date;
      (acc.resets || []).forEach((r) => {
        if (r.date && r.date <= acc.burned_date && (!ref || r.date > ref)) ref = r.date;
      });
      if (ref) {
        const days = daysBetween(ref, acc.burned_date);
        if (days >= 0) {
          sumDaysBurn += days;
          cntDaysBurn++;
        }
      }
    }
    const wdCount = (acc.withdrawals || []).filter(
      (w) => w.status === "recibido" && w.amount && Number(w.amount) > 0
    ).length;
    if (wdCount > 0) {
      sumWithdrawalsAll += wdCount;
      cntWithWithdrawals++;
    }
    if (acc.passed_date && acc.status === "quemada" && wdCount === 0) {
      burnedNoWithdrawal++;
    }
  });

  return {
    total,
    pasadas,
    quemadas,
    liveCount,
    fundedTotal,
    pctPasadas: total > 0 ? (pasadas / total) * 100 : 0,
    avgDaysToPass: cntDaysPass ? sumDaysPass / cntDaysPass : null,
    avgDaysToBurn: cntDaysBurn ? sumDaysBurn / cntDaysBurn : null,
    avgWithdrawalsPerAccount: cntWithWithdrawals ? sumWithdrawalsAll / cntWithWithdrawals : null,
    burnedNoWithdrawal,
  };
}

/* ---------- payouts ---------- */
export function computePayouts(list) {
  let solicitados = 0,
    aprobados = 0,
    recibidos = 0,
    denegados = 0;
  let sumDays = 0,
    cntDays = 0;
  const companyDays = {};

  list.forEach((acc) => {
    (acc.withdrawals || []).forEach((w) => {
      if (!w.amount) return;
      const amt = Number(w.amount) || 0;
      if (w.status === "solicitado") solicitados += amt;
      if (w.status === "aprobado") aprobados += amt;
      if (w.status === "recibido") recibidos += amt;
      if (w.status === "denegado") denegados += amt;

      if (w.status === "recibido" && w.requestDate && w.receivedDate) {
        const days = daysBetween(w.requestDate, w.receivedDate);
        if (days >= 0) {
          sumDays += days;
          cntDays++;
          const key = acc.company || "Sin empresa";
          companyDays[key] = companyDays[key] || { sum: 0, cnt: 0 };
          companyDays[key].sum += days;
          companyDays[key].cnt++;
        }
      }
    });
  });

  const avgDaysToReceive = cntDays ? sumDays / cntDays : null;
  const companyAvg = Object.entries(companyDays)
    .map(([empresa, v]) => ({ empresa, avgDays: v.sum / v.cnt }))
    .sort((a, b) => a.avgDays - b.avgDays);
  const bestCompany = companyAvg.length ? companyAvg[0] : null;

  return { solicitados, aprobados, recibidos, denegados, avgDaysToReceive, bestCompany };
}

/* ---------- serie mensual (para gráfica de barras) ---------- */
export function computeMonthly(list) {
  const monthly = {};
  function key(dateStr) {
    return dateStr ? dateStr.slice(0, 7) : null;
  }
  list.forEach((acc) => {
    const m = accountMetrics(acc);
    if (acc.purchase_date) {
      const k = key(acc.purchase_date);
      monthly[k] = monthly[k] || { invertido: 0, retirado: 0 };
      monthly[k].invertido += Number(acc.purchase_cost) || 0;
    }
    if (acc.passed_date && m.activationFee > 0) {
      const k = key(acc.passed_date);
      monthly[k] = monthly[k] || { invertido: 0, retirado: 0 };
      monthly[k].invertido += m.activationFee;
    }
    (acc.resets || []).forEach((r) => {
      if (r.date) {
        const k = key(r.date);
        monthly[k] = monthly[k] || { invertido: 0, retirado: 0 };
        monthly[k].invertido += Number(r.cost) || 0;
      }
    });
    getRecurringChargeDates(acc).forEach((dt) => {
      const k = key(dt);
      monthly[k] = monthly[k] || { invertido: 0, retirado: 0 };
      monthly[k].invertido += Number(acc.purchase_cost) || 0;
    });
    (acc.withdrawals || []).forEach((w) => {
      if (w.status === "recibido" && w.receivedDate && w.amount) {
        const k = key(w.receivedDate);
        monthly[k] = monthly[k] || { invertido: 0, retirado: 0 };
        monthly[k].retirado += Number(w.amount) || 0;
      }
    });
  });
  return Object.entries(monthly)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-12)
    .map(([k, v]) => ({ month: k, ...v }));
}
