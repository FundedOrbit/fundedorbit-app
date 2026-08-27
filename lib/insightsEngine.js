import {
  accountMetrics,
  daysBetween,
  todayISO,
  isoFromDate,
  getRecurringChargeDates,
  nextMonthlyAnniversary,
  latestBurnDate,
  buildTimelineSeries,
  computeTopStats,
  computeLifecycle,
  computeMonthly,
} from "./accountsClient";

/* =========================================================================
   MOTOR DE INSIGHTS — analista automático del negocio de fondeo.
   No es una lista fija de warnings: compara los datos del usuario contra su
   propio historial, periodo anterior, promedios, otras prop firms, otros
   tamaños de cuenta y etapas del ciclo de vida, y devuelve una lista de
   insights tipados (success/insight/opportunity/attention/warning).
   ========================================================================= */

/* ---------- formato ---------- */
function fmtMoney(n) {
  return "$" + (Number(n) || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtPctSigned(n, digits = 1) {
  const v = Number(n) || 0;
  return (v >= 0 ? "+" : "") + v.toFixed(digits) + "%";
}
function fmtPctPlain(n, digits = 1) {
  return (Number(n) || 0).toFixed(digits) + "%";
}
function fmtDays1(n) {
  return (Math.round((Number(n) || 0) * 10) / 10) + "d";
}
function t(lang, es, en) {
  return lang === "en" ? en : es;
}

/* ---------- fechas ---------- */
function subDays(dateStr, days) {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() - days);
  return isoFromDate(d);
}
function inRange(dateStr, from, to) {
  if (!dateStr) return false;
  if (from && dateStr < from) return false;
  if (to && dateStr > to) return false;
  return true;
}
function windowPair(days) {
  const to = todayISO();
  const from = subDays(to, days);
  const prevTo = from;
  const prevFrom = subDays(from, days);
  return { from, to, prevFrom, prevTo };
}

/* ---------- constructor de insight ---------- */
function insight({ key, type, category, behavior, priority, title, subject }) {
  return { key, type, category, behavior, priority, title, subject: subject || null };
}

/* ---------- estadísticas de una ventana de fechas (por fecha de evento) ---------- */
function computeWindowStats(list, from, to) {
  let invested = 0,
    withdrawn = 0,
    resetsCost = 0,
    resetsCount = 0,
    withdrawalsCount = 0,
    newAccounts = 0;

  list.forEach((acc) => {
    if (acc.purchase_date && inRange(acc.purchase_date, from, to)) {
      invested += Number(acc.purchase_cost) || 0;
      newAccounts++;
    }
    if (acc.passed_date && Number(acc.activation_fee) > 0 && inRange(acc.passed_date, from, to)) {
      invested += Number(acc.activation_fee) || 0;
    }
    (acc.resets || []).forEach((r) => {
      if (r.date && inRange(r.date, from, to)) {
        const c = Number(r.cost) || 0;
        invested += c;
        resetsCost += c;
        resetsCount++;
      }
    });
    getRecurringChargeDates(acc).forEach((dt) => {
      if (inRange(dt, from, to)) invested += Number(acc.purchase_cost) || 0;
    });
    (acc.withdrawals || []).forEach((w) => {
      if (w.status === "recibido" && w.receivedDate && inRange(w.receivedDate, from, to) && Number(w.amount) > 0) {
        withdrawn += Number(w.amount) || 0;
        withdrawalsCount++;
      }
    });
  });

  const net = withdrawn - invested;
  const roi = invested > 0 ? (net / invested) * 100 : null;
  return { invested, withdrawn, net, roi, resetsCost, resetsCount, withdrawalsCount, newAccounts };
}

/* ---------- serie acumulada de ROI (para detectar récords / cruces) ---------- */
function buildRoiSeries(list) {
  const { expenseSeries, netSeries } = buildTimelineSeries(list);
  return expenseSeries.map((e, i) => ({
    date: e.date,
    invested: e.value,
    roi: e.value > 0 ? (netSeries[i].value / e.value) * 100 : null,
    net: netSeries[i].value,
  }));
}

/* ---------- agregación genérica por empresa / tamaño ---------- */
function aggregateByKey(list, keyFn, labelFn) {
  const map = {};
  list.forEach((acc) => {
    const k = keyFn(acc);
    if (!k) return;
    const m = accountMetrics(acc);
    map[k] = map[k] || { key: k, label: labelFn(acc), cuentas: 0, invertido: 0, retirado: 0, pasadas: 0, quemadas: 0, wdDays: [] };
    const g = map[k];
    g.cuentas++;
    g.invertido += m.invested;
    g.retirado += m.withdrawn;
    if (acc.status === "pasada") g.pasadas++;
    if (acc.status === "quemada") g.quemadas++;
    (acc.withdrawals || []).forEach((w) => {
      if (w.status === "recibido" && w.requestDate && w.receivedDate) {
        const d = daysBetween(w.requestDate, w.receivedDate);
        if (d >= 0) g.wdDays.push(d);
      }
    });
  });
  return Object.values(map).map((g) => {
    const net = g.retirado - g.invertido;
    const roi = g.invertido > 0 ? (net / g.invertido) * 100 : null;
    const resolved = g.pasadas + g.quemadas;
    const approvalRate = resolved > 0 ? (g.pasadas / resolved) * 100 : null;
    const avgPayoutDays = g.wdDays.length ? g.wdDays.reduce((s, x) => s + x, 0) / g.wdDays.length : null;
    return { ...g, net, roi, resolved, approvalRate, avgPayoutDays };
  });
}
function byCompany(list) {
  return aggregateByKey(
    list,
    (acc) => (acc.company || "").trim() || null,
    (acc) => acc.company.trim()
  );
}
function bySize(list) {
  return aggregateByKey(
    list,
    (acc) => (acc.size || "").trim() || null,
    (acc) => acc.size.trim()
  );
}

/* =========================================================================
   1. RENTABILIDAD / ROI
   ========================================================================= */
function roiInsights(list, lang, stats) {
  const out = [];
  const series = buildRoiSeries(list).filter((p) => p.roi != null || p.net != null);

  // nuevo máximo de ROI
  const roiSeries = series.filter((p) => p.roi != null);
  if (roiSeries.length >= 2) {
    const last = roiSeries[roiSeries.length - 1];
    const priorMax = Math.max(...roiSeries.slice(0, -1).map((p) => p.roi));
    if (last.roi > priorMax && last.roi > 0) {
      out.push(
        insight({
          key: `roi:new_high:${Math.round(last.roi)}`,
          type: "success",
          category: "roi",
          behavior: "event",
          priority: 90,
          title: t(lang, `Tu ROI alcanzó un nuevo máximo de ${fmtPctPlain(last.roi)}.`, `Your ROI reached a new high of ${fmtPctPlain(last.roi)}.`),
        })
      );
    }
  }

  // break-even / recuperación del 100% de la inversión (cruce reciente a neto positivo)
  if (series.length >= 2) {
    const last = series[series.length - 1];
    const prev = series[series.length - 2];
    if (last.net >= 0 && prev.net < 0) {
      out.push(
        insight({
          key: `roi:break_even:${last.date}`,
          type: "success",
          category: "roi",
          behavior: "event",
          priority: 95,
          title: t(
            lang,
            `Alcanzaste break-even: ya recuperaste toda tu inversión (${fmtMoney(last.net)} neto).`,
            `You hit break-even: you've fully recovered your investment (${fmtMoney(last.net)} net).`
          ),
        })
      );
    }
  }

  // ROI 30d vs periodo anterior
  const w30 = windowPair(30);
  const cur30 = computeWindowStats(list, w30.from, w30.to);
  const prev30 = computeWindowStats(list, w30.prevFrom, w30.prevTo);
  if (cur30.roi != null && prev30.roi != null && Math.abs(cur30.roi - prev30.roi) >= 15) {
    out.push(
      insight({
        key: `roi:trend30:${Math.round(cur30.roi)}`,
        type: cur30.roi > prev30.roi ? "success" : "warning",
        category: "roi",
        behavior: "status",
        priority: 70,
        title: t(
          lang,
          `Tu ROI de los últimos 30 días es ${fmtPctPlain(cur30.roi)}, comparado con ${fmtPctPlain(prev30.roi)} del periodo anterior.`,
          `Your ROI over the last 30 days is ${fmtPctPlain(cur30.roi)}, vs ${fmtPctPlain(prev30.roi)} the previous period.`
        ),
      })
    );
  }

  // ROI global negativo
  if (stats.totalInvertido > 0 && stats.roiGlobal < 0) {
    out.push(
      insight({
        key: "roi:negative_global",
        type: "warning",
        category: "roi",
        behavior: "status",
        priority: 80,
        title: t(
          lang,
          `Tu ROI global es negativo (${fmtPctPlain(stats.roiGlobal)}). Ahora mismo estás invirtiendo más de lo que retiras.`,
          `Your global ROI is negative (${fmtPctPlain(stats.roiGlobal)}). You're currently investing more than you're withdrawing.`
        ),
      })
    );
  }

  // cuenta activa que no recupera inversión hace tiempo
  const today = todayISO();
  const stalled = list
    .filter((acc) => (acc.status === "activa" || acc.status === "live") && acc.purchase_date)
    .map((acc) => ({ acc, m: accountMetrics(acc) }))
    .filter(({ acc, m }) => m.net < 0 && daysBetween(acc.purchase_date, today) >= 90)
    .sort((a, b) => daysBetween(b.acc.purchase_date, today) - daysBetween(a.acc.purchase_date, today));
  if (stalled.length) {
    const { acc, m } = stalled[0];
    const days = daysBetween(acc.purchase_date, today);
    out.push(
      insight({
        key: `roi:stalled:${acc.id}`,
        type: "attention",
        category: "roi",
        behavior: "status",
        priority: 50,
        title: t(
          lang,
          `${acc.account_id || "Una de tus cuentas"} (${acc.company || "—"}) lleva ${days} días sin recuperar su inversión (${fmtMoney(m.net)} neto).`,
          `${acc.account_id || "One of your accounts"} (${acc.company || "—"}) has gone ${days} days without recovering its investment (${fmtMoney(m.net)} net).`
        ),
      })
    );
  }

  return out;
}

/* =========================================================================
   2. GASTOS
   ========================================================================= */
function expenseInsights(list, lang) {
  const out = [];

  const w60 = windowPair(60);
  const cur60 = computeWindowStats(list, w60.from, w60.to);
  const prev60 = computeWindowStats(list, w60.prevFrom, w60.prevTo);
  if (cur60.resetsCost > 0 || prev60.resetsCost > 0) {
    const change = prev60.resetsCost > 0 ? ((cur60.resetsCost - prev60.resetsCost) / prev60.resetsCost) * 100 : 100;
    if (Math.abs(change) >= 40 && (cur60.resetsCost >= 20 || prev60.resetsCost >= 20)) {
      out.push(
        insight({
          key: `expenses:resets_trend:${Math.round(cur60.resetsCost)}`,
          type: change > 0 ? "warning" : "success",
          category: "expenses",
          behavior: "status",
          priority: change > 0 ? 54 : 46,
          subject: "resets_trend",
          title: t(
            lang,
            `Has gastado ${fmtMoney(cur60.resetsCost)} en reinicios durante los últimos 60 días, ${fmtPctSigned(change)} frente al periodo anterior.`,
            `You've spent ${fmtMoney(cur60.resetsCost)} on resets over the last 60 days, ${fmtPctSigned(change)} vs the previous period.`
          ),
        })
      );
    }
  }

  const noReturn = list.filter((a) => {
    const m = accountMetrics(a);
    return m.invested > 0 && m.withdrawn === 0;
  });
  const noReturnInvested = noReturn.reduce((s, a) => s + accountMetrics(a).invested, 0);
  const totalInvertido = list.reduce((s, a) => s + accountMetrics(a).invested, 0);
  if (totalInvertido > 0) {
    const pct = (noReturnInvested / totalInvertido) * 100;
    if (pct >= 40 && noReturnInvested >= 50) {
      out.push(
        insight({
          key: `expenses:no_return:${Math.round(pct)}`,
          type: "attention",
          category: "expenses",
          behavior: "status",
          priority: 47,
          title: t(
            lang,
            `${fmtPctPlain(pct)} de tu inversión total (${fmtMoney(noReturnInvested)}) está en cuentas que todavía no han generado ningún payout.`,
            `${fmtPctPlain(pct)} of your total investment (${fmtMoney(noReturnInvested)}) sits in accounts that haven't produced a single payout yet.`
          ),
        })
      );
    }
  }

  const w90 = windowPair(90);
  const cur90 = computeWindowStats(list, w90.from, w90.to);
  const prev90 = computeWindowStats(list, w90.prevFrom, w90.prevTo);
  if (prev90.invested > 0) {
    const change = ((cur90.invested - prev90.invested) / prev90.invested) * 100;
    if (Math.abs(change) >= 40 && cur90.invested >= 30) {
      out.push(
        insight({
          key: `expenses:total_trend:${Math.round(cur90.invested)}`,
          type: "insight",
          category: "expenses",
          behavior: "status",
          priority: 32,
          title: t(
            lang,
            `Tu gasto total ${change > 0 ? "aumentó" : "bajó"} ${fmtPctPlain(Math.abs(change))} en los últimos 90 días (${fmtMoney(cur90.invested)}).`,
            `Your total spend ${change > 0 ? "increased" : "decreased"} ${fmtPctPlain(Math.abs(change))} over the last 90 days (${fmtMoney(cur90.invested)}).`
          ),
        })
      );
    }
  }

  return out;
}

/* =========================================================================
   3. PROP FIRMS
   ========================================================================= */
function firmInsights(list, lang) {
  const out = [];
  const firms = byCompany(list);
  const withRoi = firms.filter((f) => f.invertido > 0);

  if (withRoi.length >= 2) {
    const best = [...withRoi].sort((a, b) => b.roi - a.roi)[0];
    const worst = [...withRoi].sort((a, b) => a.roi - b.roi)[0];
    if (best.key !== worst.key && best.roi > 0) {
      out.push(
        insight({
          key: `firm:best:${best.key}`,
          type: "success",
          category: "firms",
          behavior: "status",
          priority: 65,
          subject: `firm:${best.key}`,
          title: t(
            lang,
            `${best.label} es actualmente tu prop firm más rentable, con ${fmtPctPlain(best.roi)} de ROI.`,
            `${best.label} is currently your most profitable prop firm, with ${fmtPctPlain(best.roi)} ROI.`
          ),
        })
      );
    }
    if (worst.roi < 0 && worst.invertido >= 50) {
      out.push(
        insight({
          key: `firm:worst:${worst.key}`,
          type: "warning",
          category: "firms",
          behavior: "status",
          priority: 60,
          title: t(
            lang,
            `Has invertido ${fmtMoney(worst.invertido)} en ${worst.label} y todavía no recuperas esa inversión (${fmtMoney(worst.net)} neto).`,
            `You've invested ${fmtMoney(worst.invertido)} in ${worst.label} and still haven't recovered it (${fmtMoney(worst.net)} net).`
          ),
        })
      );
    }
  }

  const withSpeed = firms.filter((f) => f.avgPayoutDays != null);
  if (withSpeed.length >= 2) {
    const fastest = [...withSpeed].sort((a, b) => a.avgPayoutDays - b.avgPayoutDays)[0];
    const slowest = [...withSpeed].sort((a, b) => b.avgPayoutDays - a.avgPayoutDays)[0];
    if (fastest.key !== slowest.key && slowest.avgPayoutDays - fastest.avgPayoutDays >= 3) {
      out.push(
        insight({
          key: `firm:speed:${fastest.key}:${slowest.key}`,
          type: "insight",
          category: "firms",
          behavior: "status",
          priority: 42,
          title: t(
            lang,
            `${fastest.label} te paga en ${fmtDays1(fastest.avgPayoutDays)} en promedio, mucho más rápido que ${slowest.label} (${fmtDays1(slowest.avgPayoutDays)}).`,
            `${fastest.label} pays you in ${fmtDays1(fastest.avgPayoutDays)} on average, much faster than ${slowest.label} (${fmtDays1(slowest.avgPayoutDays)}).`
          ),
        })
      );
    }
  }

  const withApproval = firms.filter((f) => f.approvalRate != null && f.resolved >= 2);
  if (withApproval.length >= 2) {
    const best = [...withApproval].sort((a, b) => b.approvalRate - a.approvalRate)[0];
    const worst = [...withApproval].sort((a, b) => a.approvalRate - b.approvalRate)[0];
    if (best.key !== worst.key && best.approvalRate - worst.approvalRate >= 20) {
      out.push(
        insight({
          key: `firm:approval:${best.key}:${worst.key}`,
          type: "insight",
          category: "firms",
          behavior: "status",
          priority: 48,
          title: t(
            lang,
            `Tu tasa de aprobación con ${best.label} es ${fmtPctPlain(best.approvalRate)}, frente a ${fmtPctPlain(worst.approvalRate)} con ${worst.label}.`,
            `Your approval rate with ${best.label} is ${fmtPctPlain(best.approvalRate)}, vs ${fmtPctPlain(worst.approvalRate)} with ${worst.label}.`
          ),
        })
      );
    }
  }

  return out;
}

/* =========================================================================
   4. TAMAÑO / TIPO DE CUENTA
   ========================================================================= */
function sizeInsights(list, lang) {
  const out = [];
  const sizes = bySize(list).filter((s) => s.cuentas >= 2 && s.invertido > 0);

  if (sizes.length >= 2) {
    const sorted = [...sizes].sort((a, b) => b.roi - a.roi);
    const best = sorted[0];
    const worst = sorted[sorted.length - 1];
    if (best.roi > 0 && worst.roi > 0 && best.key !== worst.key) {
      const ratio = best.roi / worst.roi;
      if (ratio >= 1.5) {
        out.push(
          insight({
            key: `size:best:${best.key}`,
            type: "opportunity",
            category: "size",
            behavior: "status",
            priority: 40,
            subject: `size:${best.key}`,
            title: t(
              lang,
              `Tus cuentas de ${best.label} están generando ${ratio.toFixed(1)}× más ROI que las de ${worst.label}.`,
              `Your ${best.label} accounts are generating ${ratio.toFixed(1)}× more ROI than your ${worst.label} ones.`
            ),
          })
        );
      }
    }
    const losing = sizes.find((s) => s.net < 0 && s.invertido >= 100);
    if (losing) {
      out.push(
        insight({
          key: `size:losing:${losing.key}`,
          type: "attention",
          category: "size",
          behavior: "status",
          priority: 41,
          title: t(
            lang,
            `Tus cuentas de ${losing.label} están generando pérdidas en conjunto (${fmtMoney(losing.net)} neto).`,
            `Your ${losing.label} accounts are generating losses overall (${fmtMoney(losing.net)} net).`
          ),
        })
      );
    }
  }

  return out;
}

/* =========================================================================
   5. CICLO DE VIDA
   ========================================================================= */
function lifecycleInsights(list, lang, lifecycle) {
  const out = [];
  const today = todayISO();

  // demasiado tiempo en evaluación vs promedio histórico
  const avgToPass = lifecycle.avgDaysToPass;
  const stalledThreshold = avgToPass ? Math.max(30, Math.round(avgToPass * 1.5)) : 45;
  const stalled = list
    .filter((acc) => acc.status === "activa" && acc.purchase_date)
    .map((acc) => {
      let ref = acc.purchase_date;
      (acc.resets || []).forEach((r) => {
        if (r.date && r.date > ref) ref = r.date;
      });
      return { acc, days: daysBetween(ref, today) };
    })
    .filter((x) => x.days > stalledThreshold)
    .sort((a, b) => b.days - a.days);
  if (stalled.length) {
    const { acc, days } = stalled[0];
    out.push(
      insight({
        key: `lifecycle:stalled:${acc.id}`,
        type: "attention",
        category: "lifecycle",
        behavior: "status",
        priority: 58,
        title: t(
          lang,
          `${acc.account_id || "Una cuenta"} (${acc.company || "—"}) lleva ${days} días en evaluación${avgToPass ? `, tu promedio histórico es de ${Math.round(avgToPass)} días` : ""}.`,
          `${acc.account_id || "An account"} (${acc.company || "—"}) has been in evaluation for ${days} days${avgToPass ? `, your historical average is ${Math.round(avgToPass)} days` : ""}.`
        ),
      })
    );
  }

  // días hasta primer payout por cuenta fondeada (para promedio + récord + "funded sin payout")
  const payoutRecords = [];
  list.forEach((acc) => {
    if (!acc.passed_date) return;
    const received = (acc.withdrawals || [])
      .filter((w) => w.status === "recibido" && w.receivedDate)
      .sort((a, b) => a.receivedDate.localeCompare(b.receivedDate));
    if (received.length) {
      const d = daysBetween(acc.passed_date, received[0].receivedDate);
      if (d >= 0) payoutRecords.push({ acc, days: d, date: received[0].receivedDate });
    }
  });
  const avgFirstPayout = payoutRecords.length ? payoutRecords.reduce((s, r) => s + r.days, 0) / payoutRecords.length : null;

  const waitingThreshold = avgFirstPayout ? Math.max(14, Math.round(avgFirstPayout * 1.5)) : 21;
  const waiting = list
    .filter((acc) => acc.passed_date && acc.status !== "quemada" && !(acc.withdrawals || []).some((w) => w.status === "recibido" && Number(w.amount) > 0))
    .map((acc) => ({ acc, days: daysBetween(acc.passed_date, today) }))
    .filter((x) => x.days > waitingThreshold)
    .sort((a, b) => b.days - a.days);
  if (waiting.length) {
    const { acc, days } = waiting[0];
    out.push(
      insight({
        key: `lifecycle:waiting_payout:${acc.id}`,
        type: "attention",
        category: "lifecycle",
        behavior: "status",
        priority: 62,
        title: t(
          lang,
          `${acc.account_id || "Esta cuenta"} (${acc.company || "—"}) lleva ${days} días funded sin payout. Tu promedio histórico es de ${avgFirstPayout ? Math.round(avgFirstPayout) : "—"} días.`,
          `${acc.account_id || "This account"} (${acc.company || "—"}) has gone ${days} days funded with no payout. Your historical average is ${avgFirstPayout ? Math.round(avgFirstPayout) : "—"} days.`
        ),
      })
    );
  }

  // récord: payout más rápido
  const chronological = [...payoutRecords].sort((a, b) => a.date.localeCompare(b.date));
  if (chronological.length >= 2) {
    const lastRec = chronological[chronological.length - 1];
    const priorMin = Math.min(...chronological.slice(0, -1).map((r) => r.days));
    if (lastRec.days < priorMin) {
      out.push(
        insight({
          key: `lifecycle:payout_record:${lastRec.acc.id}`,
          type: "success",
          category: "lifecycle",
          behavior: "event",
          priority: 75,
          title: t(
            lang,
            `Nuevo récord: esta cuenta llegó a su primer payout en solo ${lastRec.days} días.`,
            `New record: this account reached its first payout in just ${lastRec.days} days.`
          ),
        })
      );
    }
  }

  // cuenta activa sin actualización reciente (usando updated_at)
  const abandoned = list
    .filter((acc) => acc.status === "activa" && acc.updated_at)
    .map((acc) => ({ acc, days: daysBetween(acc.updated_at.slice(0, 10), today) }))
    .filter((x) => x.days >= 60)
    .sort((a, b) => b.days - a.days);
  if (abandoned.length) {
    const { acc, days } = abandoned[0];
    out.push(
      insight({
        key: `lifecycle:no_update:${acc.id}`,
        type: "attention",
        category: "lifecycle",
        behavior: "status",
        priority: 35,
        title: t(
          lang,
          `${acc.account_id || "Una cuenta"} (${acc.company || "—"}) no tiene actualizaciones desde hace ${days} días. Revisa si sigue activa.`,
          `${acc.account_id || "An account"} (${acc.company || "—"}) hasn't been updated in ${days} days. Check whether it's still active.`
        ),
      })
    );
  }

  return out;
}

/* ---------- cobro recurrente: recordatorio antes del cobro + aviso de reestablecimiento ---------- */
function recurringChargeInsights(list, lang) {
  const out = [];
  const today = todayISO();

  list.forEach((acc) => {
    if (!acc.recurring || acc.cancelled || acc.passed_date || !acc.purchase_date) return;
    const m = accountMetrics(acc);

    const nextBill = nextMonthlyAnniversary(acc.purchase_date, today);
    if (nextBill) {
      const nextBillISO = isoFromDate(nextBill);
      const daysUntil = daysBetween(today, nextBillISO);
      if (daysUntil >= 0 && daysUntil <= 5) {
        out.push(
          insight({
            key: `recurring:renewal:${acc.id}:${nextBillISO}`,
            type: "insight",
            category: "lifecycle",
            behavior: "status",
            priority: 57,
            title: t(
              lang,
              `${acc.account_id || "Una cuenta"} (${acc.company || "—"}) es de cobro recurrente y cumple otro mes el ${nextBillISO} (en ${daysUntil} día(s)) — sería el cobro #${m.recurringCharges + 1} (${fmtMoney(Number(acc.purchase_cost) || 0)}).`,
              `${acc.account_id || "An account"} (${acc.company || "—"}) is on recurring billing and renews on ${nextBillISO} (in ${daysUntil} day(s)) — this would be charge #${m.recurringCharges + 1} (${fmtMoney(Number(acc.purchase_cost) || 0)}).`
            ),
          })
        );
      }
    }

    if (acc.status === "activa") {
      const burnDate = latestBurnDate(acc);
      if (burnDate) {
        const chargeDates = getRecurringChargeDates(acc);
        const rechargedAfterBurn = chargeDates.filter((d) => d > burnDate).length;
        if (rechargedAfterBurn > 0) {
          out.push(
            insight({
              key: `recurring:reactivated:${acc.id}:${rechargedAfterBurn}`,
              type: "attention",
              category: "lifecycle",
              behavior: "status",
              priority: 53,
              title: t(
                lang,
                `${acc.account_id || "Una cuenta"} (${acc.company || "—"}) se quemó pero se reestableció sola por el cobro recurrente. Ya lleva ${m.recurringCharges} cobro(s) en total.`,
                `${acc.account_id || "An account"} (${acc.company || "—"}) burned but auto-reset via recurring billing. It's had ${m.recurringCharges} charge(s) total so far.`
              ),
            })
          );
        }
      }
    }
  });

  return out;
}

/* =========================================================================
   6. TASA DE APROBACIÓN
   ========================================================================= */
function approvalInsights(list, lang) {
  const out = [];
  const resolved = list
    .filter((a) => (a.status === "pasada" || a.status === "quemada") && a.purchase_date)
    .sort((a, b) => a.purchase_date.localeCompare(b.purchase_date));

  if (resolved.length >= 6) {
    const half = Math.floor(resolved.length / 2);
    const older = resolved.slice(0, half);
    const newer = resolved.slice(half);
    const rate = (arr) => (arr.filter((a) => a.status === "pasada").length / arr.length) * 100;
    const oldRate = rate(older);
    const newRate = rate(newer);
    if (Math.abs(newRate - oldRate) >= 15) {
      out.push(
        insight({
          key: `approval:trend:${Math.round(newRate)}`,
          type: newRate > oldRate ? "success" : "warning",
          category: "approval",
          behavior: "status",
          priority: 56,
          title: t(
            lang,
            `Tu tasa de aprobación ${newRate > oldRate ? "subió" : "bajó"} de ${fmtPctPlain(oldRate)} a ${fmtPctPlain(newRate)}.`,
            `Your approval rate ${newRate > oldRate ? "went up" : "went down"} from ${fmtPctPlain(oldRate)} to ${fmtPctPlain(newRate)}.`
          ),
        })
      );
    }
  }

  if (resolved.length >= 3) {
    const last3 = resolved.slice(-3);
    const currentRate = (resolved.filter((a) => a.status === "pasada").length / resolved.length) * 100;
    if (last3.every((a) => a.status === "quemada")) {
      out.push(
        insight({
          key: `approval:losing_streak:${resolved.length}`,
          type: "warning",
          category: "approval",
          behavior: "status",
          priority: 68,
          title: t(
            lang,
            `Fallaste tus últimos ${last3.length} intentos y tu tasa de aprobación cayó a ${fmtPctPlain(currentRate)}.`,
            `You failed your last ${last3.length} attempts and your approval rate dropped to ${fmtPctPlain(currentRate)}.`
          ),
        })
      );
    } else if (last3.every((a) => a.status === "pasada")) {
      out.push(
        insight({
          key: `approval:winning_streak:${resolved.length}`,
          type: "success",
          category: "approval",
          behavior: "status",
          priority: 64,
          title: t(
            lang,
            `Pasaste tus últimos ${last3.length} intentos seguidos. Vas en racha.`,
            `You passed your last ${last3.length} attempts in a row. You're on a streak.`
          ),
        })
      );
    }
  }

  return out;
}

/* =========================================================================
   7. PAYOUTS
   ========================================================================= */
function payoutInsights(list, lang, monthly) {
  const out = [];
  const today = todayISO();

  const received = [];
  list.forEach((acc) =>
    (acc.withdrawals || []).forEach((w) => {
      if (w.status === "recibido" && w.receivedDate && Number(w.amount) > 0) {
        received.push({ date: w.receivedDate, amount: Number(w.amount) });
      }
    })
  );
  received.sort((a, b) => a.date.localeCompare(b.date));

  if (received.length) {
    const last = received[received.length - 1];
    const daysSince = daysBetween(last.date, today);
    let avgGap = null;
    if (received.length >= 3) {
      const gaps = [];
      for (let i = 1; i < received.length; i++) gaps.push(daysBetween(received[i - 1].date, received[i].date));
      avgGap = gaps.reduce((s, x) => s + x, 0) / gaps.length;
    }
    const gapThreshold = avgGap ? Math.max(14, Math.round(avgGap * 1.5)) : 30;
    if (daysSince > gapThreshold) {
      out.push(
        insight({
          key: `payouts:silence:${Math.floor(daysSince / 7)}`,
          type: "attention",
          category: "payouts",
          behavior: "status",
          priority: 60,
          title: t(
            lang,
            `Han pasado ${daysSince} días desde tu último payout.${avgGap ? ` Tu promedio histórico es de ${Math.round(avgGap)} días.` : ""}`,
            `It's been ${daysSince} days since your last payout.${avgGap ? ` Your historical average is ${Math.round(avgGap)} days.` : ""}`
          ),
        })
      );
    }
  }

  if (monthly.length) {
    const currentMonthKey = today.slice(0, 7);
    const best = monthly.find((m) => m.month === currentMonthKey);
    if (best && best.retirado > 0) {
      const priorBest = Math.max(0, ...monthly.filter((m) => m.month !== best.month).map((m) => m.retirado));
      if (best.retirado > priorBest) {
        out.push(
          insight({
            key: `payouts:record_month:${best.month}`,
            type: "success",
            category: "payouts",
            behavior: "event",
            priority: 85,
            title: t(lang, `Nuevo récord: este mes retiraste ${fmtMoney(best.retirado)}.`, `New record: this month you withdrew ${fmtMoney(best.retirado)}.`),
          })
        );
      }
    }
  }

  if (received.length >= 6) {
    const lastN = received.slice(-3);
    const prevN = received.slice(-6, -3);
    const avgLast = lastN.reduce((s, x) => s + x.amount, 0) / lastN.length;
    const avgPrev = prevN.reduce((s, x) => s + x.amount, 0) / prevN.length;
    if (avgPrev > 0) {
      const change = ((avgLast - avgPrev) / avgPrev) * 100;
      if (Math.abs(change) >= 25) {
        out.push(
          insight({
            key: `payouts:avg_trend:${Math.round(avgLast)}`,
            type: change > 0 ? "success" : "insight",
            category: "payouts",
            behavior: "status",
            priority: 38,
            title: t(
              lang,
              `Tu payout promedio de los últimos 3 retiros es ${fmtMoney(avgLast)}, ${change > 0 ? "un aumento" : "una baja"} de ${fmtPctPlain(Math.abs(change))} frente a los 3 anteriores.`,
              `Your average payout over the last 3 withdrawals is ${fmtMoney(avgLast)}, ${change > 0 ? "up" : "down"} ${fmtPctPlain(Math.abs(change))} vs the previous 3.`
            ),
          })
        );
      }
    }
  }

  return out;
}

/* =========================================================================
   8. EFICIENCIA DEL NEGOCIO
   ========================================================================= */
function efficiencyInsights(list, lang) {
  const out = [];
  const today = todayISO();
  const d90ago = subDays(today, 90);

  const now = computeWindowStats(list, null, today);
  const past = computeWindowStats(list, null, d90ago);

  if (now.withdrawn > 0 && past.withdrawn > 0) {
    const ratioNow = now.invested / now.withdrawn;
    const ratioPast = past.invested / past.withdrawn;
    const change = ratioPast > 0 ? ((ratioNow - ratioPast) / ratioPast) * 100 : null;
    if (change != null && Math.abs(change) >= 15) {
      out.push(
        insight({
          key: `efficiency:cost_per_dollar:${ratioNow.toFixed(2)}`,
          type: change < 0 ? "success" : "warning",
          category: "efficiency",
          behavior: "status",
          priority: 62,
          title: t(
            lang,
            `Ahora inviertes $${ratioNow.toFixed(2)} por cada $1 que retiras. Hace 3 meses eran $${ratioPast.toFixed(2)}.`,
            `You now invest $${ratioNow.toFixed(2)} for every $1 you withdraw. 3 months ago it was $${ratioPast.toFixed(2)}.`
          ),
        })
      );
    }
  }

  const funded = list.filter((a) => a.passed_date).sort((a, b) => a.passed_date.localeCompare(b.passed_date));
  if (funded.length >= 6) {
    const half = Math.floor(funded.length / 2);
    const older = funded.slice(0, half);
    const newer = funded.slice(half);
    const avgCost = (arr) => arr.reduce((s, a) => s + accountMetrics(a).invested, 0) / arr.length;
    const oldAvg = avgCost(older);
    const newAvg = avgCost(newer);
    if (oldAvg > 0) {
      const change = ((newAvg - oldAvg) / oldAvg) * 100;
      if (Math.abs(change) >= 20) {
        out.push(
          insight({
            key: `efficiency:cost_per_funded:${Math.round(newAvg)}`,
            type: change < 0 ? "success" : "warning",
            category: "efficiency",
            behavior: "status",
            priority: 46,
            title: t(
              lang,
              `Tu costo promedio por cuenta funded ${change > 0 ? "aumentó" : "bajó"} ${fmtPctPlain(Math.abs(change))} (${fmtMoney(newAvg)} vs ${fmtMoney(oldAvg)} antes).`,
              `Your average cost per funded account ${change > 0 ? "increased" : "decreased"} ${fmtPctPlain(Math.abs(change))} (${fmtMoney(newAvg)} vs ${fmtMoney(oldAvg)} before).`
            ),
          })
        );
      }
    }
  }

  return out;
}

/* =========================================================================
   9. CONCENTRACIÓN / RIESGO OPERATIVO
   ========================================================================= */
function concentrationInsights(list, lang) {
  const out = [];
  const firms = byCompany(list);
  const totalInvertido = firms.reduce((s, f) => s + f.invertido, 0);

  if (firms.length >= 2 && totalInvertido > 0) {
    const top = [...firms].sort((a, b) => b.invertido - a.invertido)[0];
    const pct = (top.invertido / totalInvertido) * 100;
    if (pct >= 60) {
      out.push(
        insight({
          key: `concentration:firm:${top.key}`,
          type: "attention",
          category: "concentration",
          behavior: "status",
          priority: 52,
          title: t(
            lang,
            `El ${fmtPctPlain(pct)} de tu inversión activa está concentrada en una sola prop firm (${top.label}).`,
            `${fmtPctPlain(pct)} of your active investment is concentrated in a single prop firm (${top.label}).`
          ),
        })
      );
    }
  }

  const today = todayISO();
  const d14ago = subDays(today, 14);
  const recentNew = list.filter((a) => a.purchase_date && inRange(a.purchase_date, d14ago, today)).length;
  if (recentNew >= 4) {
    out.push(
      insight({
        key: `concentration:fast_growth:${Math.floor(Date.now() / (1000 * 60 * 60 * 24 * 14))}`,
        type: "attention",
        category: "concentration",
        behavior: "status",
        priority: 36,
        title: t(
          lang,
          `Compraste ${recentNew} cuentas nuevas en los últimos 14 días. Vigila tu ritmo de gasto.`,
          `You bought ${recentNew} new accounts in the last 14 days. Keep an eye on your spending pace.`
        ),
      })
    );
  }

  const w90 = windowPair(90);
  const cur90 = computeWindowStats(list, w90.from, w90.to);
  const prev90 = computeWindowStats(list, w90.prevFrom, w90.prevTo);
  if (cur90.invested > 0 && prev90.invested > 0) {
    const investedGrowth = ((cur90.invested - prev90.invested) / prev90.invested) * 100;
    const withdrawnGrowth = prev90.withdrawn > 0 ? ((cur90.withdrawn - prev90.withdrawn) / prev90.withdrawn) * 100 : cur90.withdrawn > 0 ? 100 : 0;
    if (investedGrowth - withdrawnGrowth >= 60 && investedGrowth > 20 && cur90.invested >= 100) {
      out.push(
        insight({
          key: `concentration:growth_gap:${Math.round(investedGrowth)}`,
          type: "warning",
          category: "concentration",
          behavior: "status",
          priority: 54,
          title: t(
            lang,
            `Tu inversión creció ${fmtPctSigned(investedGrowth)} en 90 días, mientras tus payouts crecieron solo ${fmtPctSigned(withdrawnGrowth)}.`,
            `Your investment grew ${fmtPctSigned(investedGrowth)} over 90 days, while your payouts only grew ${fmtPctSigned(withdrawnGrowth)}.`
          ),
        })
      );
    }
  }

  return out;
}

/* =========================================================================
   10. TENDENCIAS Y CAMBIOS DE COMPORTAMIENTO
   ========================================================================= */
function trendInsights(list, lang, monthly) {
  const out = [];

  if (monthly.length >= 3) {
    const last3 = monthly.slice(-3);
    const nets = last3.map((m) => m.retirado - m.invertido);
    if (nets.every((n) => n > 0) && nets[1] >= nets[0] && nets[2] >= nets[1]) {
      out.push(
        insight({
          key: `trends:profit_streak:${monthly[monthly.length - 1].month}`,
          type: "success",
          category: "trends",
          behavior: "status",
          priority: 44,
          title: t(
            lang,
            `Tu profit neto lleva ${last3.length} meses consecutivos siendo positivo y creciendo.`,
            `Your net profit has been positive and growing for ${last3.length} consecutive months.`
          ),
        })
      );
    }
  }

  const w90 = windowPair(90);
  const cur = computeWindowStats(list, w90.from, w90.to);
  const prev = computeWindowStats(list, w90.prevFrom, w90.prevTo);
  if (cur.invested > 0 && prev.invested > 0) {
    const investedGrowth = ((cur.invested - prev.invested) / prev.invested) * 100;
    const withdrawnGrowth = prev.withdrawn > 0 ? ((cur.withdrawn - prev.withdrawn) / prev.withdrawn) * 100 : cur.withdrawn > 0 ? 100 : 0;
    if (Math.abs(investedGrowth - withdrawnGrowth) >= 15 && Math.abs(investedGrowth) >= 5) {
      out.push(
        insight({
          key: `trends:growth_compare:${Math.round(investedGrowth)}:${Math.round(withdrawnGrowth)}`,
          type: "insight",
          category: "trends",
          behavior: "status",
          priority: 30,
          title: t(
            lang,
            `Tu inversión ${investedGrowth >= 0 ? "aumentó" : "bajó"} ${fmtPctPlain(Math.abs(investedGrowth))} en los últimos 3 meses, mientras tus payouts ${withdrawnGrowth >= 0 ? "aumentaron" : "bajaron"} ${fmtPctPlain(Math.abs(withdrawnGrowth))}.`,
            `Your investment ${investedGrowth >= 0 ? "went up" : "went down"} ${fmtPctPlain(Math.abs(investedGrowth))} over the last 3 months, while your payouts ${withdrawnGrowth >= 0 ? "went up" : "went down"} ${fmtPctPlain(Math.abs(withdrawnGrowth))}.`
          ),
        })
      );
    }
  }

  return out;
}

/* =========================================================================
   11. HITOS (badges persistentes)
   ========================================================================= */
export const MILESTONE_CATALOG = [
  { key: "first_account", icon: "🪐", check: (s) => s.totalCuentas >= 1, es: "Primera cuenta registrada", en: "First account registered" },
  { key: "first_funded", icon: "🚀", check: (s) => s.fundedCount >= 1, es: "Primera cuenta fondeada", en: "First funded account" },
  { key: "first_payout", icon: "💰", check: (s) => s.payoutsCount >= 1, es: "Primer payout recibido", en: "First payout received" },
  { key: "accounts_5", icon: "🛰️", check: (s) => s.totalCuentas >= 5, es: "5 cuentas registradas", en: "5 accounts registered" },
  { key: "accounts_10", icon: "🛰️", check: (s) => s.totalCuentas >= 10, es: "10 cuentas registradas", en: "10 accounts registered" },
  { key: "accounts_25", icon: "🛰️", check: (s) => s.totalCuentas >= 25, es: "25 cuentas registradas", en: "25 accounts registered" },
  { key: "accounts_50", icon: "🛰️", check: (s) => s.totalCuentas >= 50, es: "50 cuentas registradas", en: "50 accounts registered" },
  { key: "funded_5", icon: "🚀", check: (s) => s.fundedCount >= 5, es: "5 cuentas fondeadas", en: "5 funded accounts" },
  { key: "funded_10", icon: "🚀", check: (s) => s.fundedCount >= 10, es: "10 cuentas fondeadas", en: "10 funded accounts" },
  { key: "funded_25", icon: "🚀", check: (s) => s.fundedCount >= 25, es: "25 cuentas fondeadas", en: "25 funded accounts" },
  { key: "payouts_5", icon: "💰", check: (s) => s.payoutsCount >= 5, es: "5 payouts recibidos", en: "5 payouts received" },
  { key: "payouts_10", icon: "💰", check: (s) => s.payoutsCount >= 10, es: "10 payouts recibidos", en: "10 payouts received" },
  { key: "payouts_25", icon: "💰", check: (s) => s.payoutsCount >= 25, es: "25 payouts recibidos", en: "25 payouts received" },
  { key: "payouts_50", icon: "💰", check: (s) => s.payoutsCount >= 50, es: "50 payouts recibidos", en: "50 payouts received" },
  { key: "withdrawn_1k", icon: "💵", check: (s) => s.totalRetirado >= 1000, es: "$1,000 retirados", en: "$1,000 withdrawn" },
  { key: "withdrawn_5k", icon: "💵", check: (s) => s.totalRetirado >= 5000, es: "$5,000 retirados", en: "$5,000 withdrawn" },
  { key: "withdrawn_10k", icon: "💵", check: (s) => s.totalRetirado >= 10000, es: "$10,000 retirados", en: "$10,000 withdrawn" },
  { key: "withdrawn_25k", icon: "💵", check: (s) => s.totalRetirado >= 25000, es: "$25,000 retirados", en: "$25,000 withdrawn" },
  { key: "withdrawn_50k", icon: "💵", check: (s) => s.totalRetirado >= 50000, es: "$50,000 retirados", en: "$50,000 withdrawn" },
  { key: "withdrawn_100k", icon: "💵", check: (s) => s.totalRetirado >= 100000, es: "$100,000 retirados", en: "$100,000 withdrawn" },
  { key: "break_even", icon: "⚖️", check: (s) => s.totalInvertido > 0 && s.totalRetirado - s.totalInvertido >= 0, es: "Break-even alcanzado", en: "Break-even reached" },
  { key: "first_profitable_month", icon: "📈", check: (s) => s.hasProfitableMonth, es: "Primer mes rentable", en: "First profitable month" },
];

function computeMilestoneStats(list, monthly) {
  const fundedCount = list.filter((a) => a.passed_date).length;
  let payoutsCount = 0;
  let totalRetirado = 0;
  list.forEach((acc) =>
    (acc.withdrawals || []).forEach((w) => {
      if (w.status === "recibido" && Number(w.amount) > 0) {
        payoutsCount++;
        totalRetirado += Number(w.amount);
      }
    })
  );
  const totalInvertido = list.reduce((s, a) => s + accountMetrics(a).invested, 0);
  const hasProfitableMonth = monthly.some((m) => m.retirado > m.invertido && m.retirado > 0);
  return { totalCuentas: list.length, fundedCount, payoutsCount, totalRetirado, totalInvertido, hasProfitableMonth };
}

export function evaluateMilestones(list, monthly) {
  const stats = computeMilestoneStats(list, monthly);
  return MILESTONE_CATALOG.map((m) => ({ ...m, unlocked: m.check(stats) }));
}

function milestoneEventInsights(newlyUnlockedKeys, lang) {
  return newlyUnlockedKeys
    .map((key) => {
      const def = MILESTONE_CATALOG.find((m) => m.key === key);
      if (!def) return null;
      return insight({
        key: `milestone:${key}`,
        type: "success",
        category: "milestone",
        behavior: "event",
        priority: 100,
        title: t(lang, `${def.icon} Hito desbloqueado: ${def.es}.`, `${def.icon} Milestone unlocked: ${def.en}.`),
      });
    })
    .filter(Boolean);
}

/* =========================================================================
   12. OPORTUNIDADES / RECOMENDACIONES
   ========================================================================= */
function opportunityInsights(list, lang) {
  const out = [];
  const firms = byCompany(list).filter((f) => f.invertido > 0 && f.cuentas >= 2);
  if (firms.length >= 2) {
    const best = [...firms].sort((a, b) => b.roi - a.roi)[0];
    if (best.roi > 0) {
      out.push(
        insight({
          key: `opportunity:firm:${best.key}`,
          type: "opportunity",
          category: "opportunities",
          behavior: "status",
          priority: 28,
          subject: `firm:${best.key}`,
          title: t(
            lang,
            `Históricamente tienes mejores resultados con ${best.label} que con tus otras prop firms.`,
            `Historically you get better results with ${best.label} than with your other prop firms.`
          ),
        })
      );
    }
  }

  const w60 = windowPair(60);
  const cur = computeWindowStats(list, w60.from, w60.to);
  const prev = computeWindowStats(list, w60.prevFrom, w60.prevTo);
  if (cur.resetsCost >= 30) {
    const resetsGrowth = prev.resetsCost > 0 ? ((cur.resetsCost - prev.resetsCost) / prev.resetsCost) * 100 : 100;
    const payoutGrowth = prev.withdrawn > 0 ? ((cur.withdrawn - prev.withdrawn) / prev.withdrawn) * 100 : cur.withdrawn > 0 ? 100 : 0;
    if (resetsGrowth - payoutGrowth >= 40) {
      out.push(
        insight({
          key: `opportunity:resets_vs_payouts:${Math.round(resetsGrowth)}`,
          type: "attention",
          category: "opportunities",
          behavior: "status",
          priority: 43,
          subject: "resets_trend",
          title: t(
            lang,
            `Tu gasto en reinicios está aumentando más rápido que tus payouts (${fmtPctSigned(resetsGrowth)} vs ${fmtPctSigned(payoutGrowth)} en 60 días).`,
            `Your spending on resets is growing faster than your payouts (${fmtPctSigned(resetsGrowth)} vs ${fmtPctSigned(payoutGrowth)} over 60 days).`
          ),
        })
      );
    }
  }

  return out;
}

/* =========================================================================
   dedupe: evita mostrar el mismo "tema" (misma firm / mismo tamaño) dos veces
   con distinta redacción entre categorías factuales y de oportunidad.
   ========================================================================= */
function dedupeBySubject(insights) {
  const seen = new Set();
  insights.forEach((i) => {
    if (i.category !== "opportunities" && i.subject) seen.add(i.subject);
  });
  return insights.filter((i) => {
    if (i.category !== "opportunities" || !i.subject) return true;
    return !seen.has(i.subject);
  });
}

/* =========================================================================
   ORQUESTADOR PRINCIPAL
   ========================================================================= */
export function generateInsights(list, opts) {
  const lang = (opts && opts.lang) || "es";
  if (!list || list.length === 0) return [];

  const stats = computeTopStats(list);
  const lifecycle = computeLifecycle(list);
  const monthly = computeMonthly(list);

  let all = [
    ...roiInsights(list, lang, stats),
    ...expenseInsights(list, lang),
    ...firmInsights(list, lang),
    ...sizeInsights(list, lang),
    ...lifecycleInsights(list, lang, lifecycle),
    ...recurringChargeInsights(list, lang),
    ...approvalInsights(list, lang),
    ...payoutInsights(list, lang, monthly),
    ...efficiencyInsights(list, lang),
    ...concentrationInsights(list, lang),
    ...trendInsights(list, lang, monthly),
    ...opportunityInsights(list, lang),
  ].filter(Boolean);

  all = dedupeBySubject(all);
  all.sort((a, b) => b.priority - a.priority);
  return all;
}

export function buildMilestoneEvents(newlyUnlockedKeys, lang) {
  return milestoneEventInsights(newlyUnlockedKeys, lang);
}
