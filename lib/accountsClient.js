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
  // Ojo: quemarse NO detiene el cobro recurrente en la práctica — la prop firm
  // reestablece la cuenta sola en la fecha de cobro y te cobra de nuevo, a menos
  // que ya haya pasado (funded) o el usuario haya cancelado explícitamente.
  if (acc.passed_date) return acc.passed_date;
  if (acc.cancelled && acc.cancelled_date) return acc.cancelled_date;
  return null;
}

/* última fecha en que se quemó la cuenta (incluye quemadas adicionales por reinicios de cobro) */
export function latestBurnDate(acc) {
  const dates = [acc.burned_date, ...((acc.burned_dates || []).map((b) => b && b.date))].filter(Boolean);
  if (!dates.length) return null;
  return dates.sort().slice(-1)[0];
}

/* true si la cuenta debe reestablecerse sola a "activa" porque ya se le hizo
   un cobro recurrente después de la última vez que se quemó */
export function shouldAutoReactivate(acc) {
  if (!acc.recurring || acc.cancelled || acc.passed_date) return false;
  if (acc.status !== "quemada") return false;
  const burnDate = latestBurnDate(acc);
  if (!burnDate) return false;
  const chargeDates = getRecurringChargeDates(acc);
  return chargeDates.some((d) => d > burnDate);
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

/* ---------- top-level totals (invested/withdrawn/approval/avg cost, etc.) ---------- */
export function computeTopStats(list) {
  const counts = { activa: 0, pasada: 0, live: 0, quemada: 0 };
  let totalInvertido = 0,
    totalRetirado = 0;
  let numReinicios = 0,
    costoReinicios = 0,
    costoActivacion = 0;
  let numRecurrentes = 0,
    costoRecurrentes = 0;
  let numRetirosHechos = 0;

  list.forEach((acc) => {
    counts[acc.status] = (counts[acc.status] || 0) + 1;
    const m = accountMetrics(acc);
    totalInvertido += m.invested;
    totalRetirado += m.withdrawn;
    costoReinicios += m.resetsCost;
    costoActivacion += m.activationFee;
    numReinicios += (acc.resets || []).length;
    numRecurrentes += m.recurringCharges;
    costoRecurrentes += m.recurringChargesCost;
    (acc.withdrawals || []).forEach((w) => {
      if (w.status === "recibido" && w.amount && Number(w.amount) > 0) numRetirosHechos++;
    });
  });

  const netProfit = totalRetirado - totalInvertido;
  const roiGlobal = totalInvertido > 0 ? (netProfit / totalInvertido) * 100 : 0;
  const resueltas = counts.pasada + counts.quemada;
  const tasaAprobacion = resueltas > 0 ? (counts.pasada / resueltas) * 100 : 0;
  const costoPromedio = list.length > 0 ? totalInvertido / list.length : 0;
  const retiroPromedio = numRetirosHechos > 0 ? totalRetirado / numRetirosHechos : 0;

  return {
    counts,
    totalInvertido,
    totalRetirado,
    netProfit,
    roiGlobal,
    tasaAprobacion,
    costoPromedio,
    retiroPromedio,
    numReinicios,
    costoReinicios,
    costoActivacion,
    numRecurrentes,
    costoRecurrentes,
    totalCuentas: list.length,
  };
}

/* ---------- lifecycle ---------- */
export function computeLifecycle(list) {
  const total = list.length;
  let pasadas = 0,
    quemadas = 0,
    liveCount = 0,
    canceladasCount = 0;
  let sumDaysPass = 0,
    cntDaysPass = 0;
  let sumDaysBurn = 0,
    cntDaysBurn = 0;
  let sumRetiroPasadas = 0,
    cntPasadas = 0;
  let sumInvertidoQuemadas = 0,
    cntQuemadas = 0;
  let fundedTotal = 0;
  let burnedNoWithdrawal = 0;
  let sumWdCountFinalized = 0,
    cntFinalizedWithWd = 0;
  let sumWdCountAll = 0,
    cntAllWithWd = 0;

  list.forEach((acc) => {
    if (acc.status === "pasada") pasadas++;
    if (acc.status === "quemada") quemadas++;
    if (acc.status === "live") liveCount++;
    if (acc.cancelled) canceladasCount++;
    if (acc.passed_date) fundedTotal++;

    const wdCount = (acc.withdrawals || []).filter(
      (w) => w.status === "recibido" && w.amount && Number(w.amount) > 0
    ).length;

    if (acc.passed_date && acc.status === "quemada" && wdCount === 0) {
      burnedNoWithdrawal++;
    }

    if (wdCount > 0) {
      sumWdCountAll += wdCount;
      cntAllWithWd++;
      if (acc.status === "quemada" || acc.cancelled) {
        sumWdCountFinalized += wdCount;
        cntFinalizedWithWd++;
      }
    }

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
      const m = accountMetrics(acc);
      sumRetiroPasadas += m.withdrawn;
      cntPasadas++;
    }

    if (acc.burned_date) {
      let ref = acc.purchase_date;
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
      const m = accountMetrics(acc);
      sumInvertidoQuemadas += m.invested;
      cntQuemadas++;
    }
  });

  return {
    total,
    pasadas,
    quemadas,
    liveCount,
    canceladasCount,
    fundedTotal,
    pctPasadas: total > 0 ? (pasadas / total) * 100 : 0,
    pctQuemadas: total > 0 ? (quemadas / total) * 100 : 0,
    avgDaysToPass: cntDaysPass ? sumDaysPass / cntDaysPass : null,
    avgDaysToBurn: cntDaysBurn ? sumDaysBurn / cntDaysBurn : null,
    ltvPromedio: cntPasadas ? sumRetiroPasadas / cntPasadas : 0,
    costoPromedioQuemada: cntQuemadas ? sumInvertidoQuemadas / cntQuemadas : 0,
    pctBurnedNoWithdrawal: fundedTotal ? (burnedNoWithdrawal / fundedTotal) * 100 : 0,
    avgWithdrawalsPerAccountFinalized: cntFinalizedWithWd ? sumWdCountFinalized / cntFinalizedWithWd : null,
    cntFinalizedWithWd,
    avgWithdrawalsPerAccountAll: cntAllWithWd ? sumWdCountAll / cntAllWithWd : null,
    cntAllWithWd,
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
  const deniedList = [];

  list.forEach((acc) => {
    (acc.withdrawals || []).forEach((w) => {
      if (!w.status) return;
      if (w.status === "solicitado") solicitados++;
      else if (w.status === "aprobado") aprobados++;
      else if (w.status === "recibido") recibidos++;
      else if (w.status === "denegado") {
        denegados++;
        deniedList.push({ acc, w });
      }

      if (w.status === "recibido" && w.requestDate && w.receivedDate) {
        const days = daysBetween(w.requestDate, w.receivedDate);
        if (days >= 0) {
          sumDays += days;
          cntDays++;
          const key = (acc.company || "Sin empresa").trim() || "Sin empresa";
          companyDays[key] = companyDays[key] || { sum: 0, cnt: 0 };
          companyDays[key].sum += days;
          companyDays[key].cnt++;
        }
      }
    });
  });

  const avgDaysToReceive = cntDays ? sumDays / cntDays : null;
  const companyAvg = Object.entries(companyDays)
    .map(([empresa, v]) => ({ empresa, avgDays: v.sum / v.cnt, cnt: v.cnt }))
    .sort((a, b) => a.avgDays - b.avgDays);
  const bestCompany = companyAvg.length ? companyAvg[0] : null;

  return { solicitados, aprobados, recibidos, denegados, avgDaysToReceive, bestCompany, companyAvg, deniedList };
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

/* ---------- filtro de rango de fechas ---------- */
export function getDateRangePreset(preset, customFrom, customTo) {
  if (preset === "all") return { from: null, to: null };
  if (preset === "custom") return { from: customFrom || null, to: customTo || null };
  const to = todayISO();
  const todayD = new Date(to + "T00:00:00");
  if (preset === "ytd") return { from: todayD.getFullYear() + "-01-01", to };
  const days = { "7d": 7, "30d": 30, "90d": 90 }[preset] || 0;
  const d = new Date(todayD);
  d.setDate(d.getDate() - days);
  return { from: isoFromDate(d), to };
}

export function filterByDateRange(list, range) {
  if (!range.from && !range.to) return list;
  return list.filter((acc) => {
    if (!acc.purchase_date) return false;
    if (range.from && acc.purchase_date < range.from) return false;
    if (range.to && acc.purchase_date > range.to) return false;
    return true;
  });
}

/* ---------- serie acumulada (para gráficas de línea) ---------- */
export function buildTimelineSeries(list) {
  const events = [];
  list.forEach((acc) => {
    if (acc.purchase_date) events.push({ date: acc.purchase_date, expense: Number(acc.purchase_cost) || 0, income: 0 });
    if (acc.passed_date && Number(acc.activation_fee) > 0) {
      events.push({ date: acc.passed_date, expense: Number(acc.activation_fee) || 0, income: 0 });
    }
    (acc.resets || []).forEach((r) => {
      if (r.date) events.push({ date: r.date, expense: Number(r.cost) || 0, income: 0 });
    });
    getRecurringChargeDates(acc).forEach((dt) => {
      events.push({ date: dt, expense: Number(acc.purchase_cost) || 0, income: 0 });
    });
    (acc.withdrawals || []).forEach((w) => {
      if (w.status === "recibido" && w.receivedDate && w.amount) {
        events.push({ date: w.receivedDate, expense: 0, income: Number(w.amount) || 0 });
      }
    });
  });

  const byDate = {};
  events.forEach((e) => {
    byDate[e.date] = byDate[e.date] || { expense: 0, income: 0 };
    byDate[e.date].expense += e.expense;
    byDate[e.date].income += e.income;
  });

  const dates = Object.keys(byDate).sort();
  let cumExp = 0,
    cumInc = 0;
  const expenseSeries = [],
    incomeSeries = [],
    netSeries = [];
  dates.forEach((dt) => {
    cumExp += byDate[dt].expense;
    cumInc += byDate[dt].income;
    expenseSeries.push({ date: dt, value: cumExp });
    incomeSeries.push({ date: dt, value: cumInc });
    netSeries.push({ date: dt, value: cumInc - cumExp });
  });

  return { expenseSeries, incomeSeries, netSeries };
}

/* ---------- top / peores cuentas por ROI ---------- */
export function computeTopWorst(list) {
  const withMetrics = list.map((a) => ({ acc: a, m: accountMetrics(a) }));
  const top = [...withMetrics].sort((a, b) => b.m.roi - a.m.roi).slice(0, 5);
  const worst = [...withMetrics].sort((a, b) => a.m.net - b.m.net).slice(0, 5);
  return { top, worst };
}

/* ---------- desglose por empresa / método ---------- */
export function computeBreakdown(list) {
  const companyMap = {};
  const methodMap = {};
  list.forEach((acc) => {
    const m = accountMetrics(acc);
    const ck = (acc.company || "").trim() || "Sin empresa";
    companyMap[ck] = companyMap[ck] || { name: ck, cuentas: 0, invertido: 0, retirado: 0 };
    companyMap[ck].cuentas++;
    companyMap[ck].invertido += m.invested;
    companyMap[ck].retirado += m.withdrawn;

    const mk = (acc.method || "").trim() || "Sin método";
    methodMap[mk] = methodMap[mk] || { name: mk, cuentas: 0, invertido: 0, retirado: 0 };
    methodMap[mk].cuentas++;
    methodMap[mk].invertido += m.invested;
    methodMap[mk].retirado += m.withdrawn;
  });
  const withRoi = (c) => ({
    ...c,
    neto: c.retirado - c.invertido,
    roi: c.invertido > 0 ? ((c.retirado - c.invertido) / c.invertido) * 100 : 0,
  });
  return {
    byCompany: Object.values(companyMap).map(withRoi).sort((a, b) => b.roi - a.roi),
    byMethod: Object.values(methodMap).map(withRoi).sort((a, b) => b.roi - a.roi),
  };
}

/* ---------- cuentas activas con retiros ---------- */
export function computeActiveWithdrawals(list) {
  return list
    .filter((acc) => acc.status === "activa")
    .map((acc) => {
      const wds = (acc.withdrawals || []).filter((w) => w.status === "recibido" && w.amount && Number(w.amount) > 0);
      return { acc, wdCount: wds.length, wdTotal: wds.reduce((s, w) => s + (Number(w.amount) || 0), 0) };
    })
    .filter((x) => x.wdCount > 0)
    .sort((a, b) => b.wdCount - a.wdCount);
}

/* ---------- fondeadas quemadas sin retirar ---------- */
export function computeBurnedNoWithdrawalList(list) {
  return list.filter((acc) => {
    if (!acc.passed_date || acc.status !== "quemada") return false;
    const wds = (acc.withdrawals || []).filter((w) => w.status === "recibido" && w.amount && Number(w.amount) > 0);
    return wds.length === 0;
  });
}

/* ---------- baneos registrados ---------- */
export function computeBannedList(list) {
  return list.filter((acc) => acc.banned);
}
