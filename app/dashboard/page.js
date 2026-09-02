"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "../../lib/supabaseClient";
import { useLanguage } from "../../components/LanguageProvider";
import SiteNav from "../../components/SiteNav";
import SiteFooter from "../../components/SiteFooter";
import LineChartSVG from "../../components/LineChartSVG";
import AccountFormModal from "../../components/AccountFormModal";
import BulkAccountModal from "../../components/BulkAccountModal";
import InsightsPanel from "../../components/InsightsPanel";
import MilestonesBadges from "../../components/MilestonesBadges";
import { syncInsights } from "../../lib/insightsSync";
import {
  fetchAccounts,
  deleteAccount,
  updateAccount,
  shouldAutoReactivate,
  accountMetrics,
  computeTopStats,
  computeLifecycle,
  computePayouts,
  computeMonthly,
  buildTimelineSeries,
  computeTopWorst,
  computeBreakdown,
  computeActiveWithdrawals,
  computeBurnedNoWithdrawalList,
  computeBannedList,
  getDateRangePreset,
  filterByDateRange,
} from "../../lib/accountsClient";

function fmtMoney(n) {
  return "$" + (Number(n) || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtDays(n) {
  return n == null ? "—" : Math.round(n) + "d";
}

const STATUS_COLORS = {
  activa: "var(--accent-purple)",
  pasada: "var(--accent-cyan)",
  live: "var(--accent-pink)",
  quemada: "var(--danger)",
};

function buildDonutGradient(counts, order) {
  const total = order.reduce((s, k) => s + (counts[k] || 0), 0);
  if (total === 0) return "conic-gradient(var(--card-bg-2) 0% 100%)";
  let acc = 0;
  const stops = [];
  order.forEach((k) => {
    const val = counts[k] || 0;
    if (val === 0) return;
    const start = (acc / total) * 100;
    acc += val;
    const end = (acc / total) * 100;
    stops.push(`${STATUS_COLORS[k]} ${start}% ${end}%`);
  });
  return `conic-gradient(${stops.join(", ")})`;
}

export default function DashboardPage() {
  const router = useRouter();
  const { dict, lang } = useLanguage();
  const d = dict.dashboard;
  const a = dict.accounts;
  const al = dict.alerts;
  const lc = dict.lifecycle;
  const py = dict.payouts;

  const [tab, setTab] = useState("dashboard");
  const [profile, setProfile] = useState(null);
  const [userId, setUserId] = useState(null);
  const [allAccounts, setAllAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const [datePreset, setDatePreset] = useState("all");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [showBulkForm, setShowBulkForm] = useState(false);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterCompany, setFilterCompany] = useState("all");
  const [filterCancelled, setFilterCancelled] = useState("all");

  const [insightsList, setInsightsList] = useState([]);
  const [badgesList, setBadgesList] = useState([]);

  useEffect(() => {
    async function load() {
      setLoadError(null);
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session) {
          router.push("/login");
          return;
        }
        const { data } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", session.user.id)
          .single();

        if (data && !data.nickname) {
          router.push("/onboarding");
          return;
        }
        setProfile(data);
        setUserId(session.user.id);
        const rows = await fetchAccounts(session.user.id);

        // cuentas con cobro recurrente que ya deberían haberse reestablecido solas
        // (la prop firm las reabre en la fecha de cobro aunque se hayan quemado)
        const toReactivate = rows.filter(shouldAutoReactivate);
        if (toReactivate.length) {
          try {
            await Promise.all(toReactivate.map((acc) => updateAccount(acc.id, { status: "activa" })));
            toReactivate.forEach((acc) => {
              acc.status = "activa";
            });
          } catch (e) {
            // si falla la actualización, seguimos mostrando los datos tal cual vinieron
          }
        }

        setAllAccounts(rows);
      } catch (err) {
        setLoadError(err?.message || String(err));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [router]);

  useEffect(() => {
    if (!userId || allAccounts.length === 0) {
      setInsightsList([]);
      setBadgesList([]);
      return;
    }
    let active = true;
    syncInsights(userId, allAccounts, lang)
      .then(({ insights, badges }) => {
        if (!active) return;
        setInsightsList(insights);
        setBadgesList(badges);
      })
      .catch(() => {
        if (!active) return;
        setInsightsList([]);
        setBadgesList([]);
      });
    return () => {
      active = false;
    };
  }, [userId, allAccounts, lang]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  function handleSaved(saved) {
    setAllAccounts((prev) => {
      const exists = prev.some((x) => x.id === saved.id);
      if (exists) return prev.map((x) => (x.id === saved.id ? saved : x));
      return [saved, ...prev];
    });
    setShowForm(false);
    setEditing(null);
  }

  function handleBulkSaved(savedRows) {
    setAllAccounts((prev) => [...savedRows, ...prev]);
    setShowBulkForm(false);
  }

  async function handleDelete(id) {
    if (!confirm(a.confirmDelete)) return;
    await deleteAccount(id);
    setAllAccounts((prev) => prev.filter((x) => x.id !== id));
  }

  function handleExportCsv() {
    const maxWithdrawals = Math.max(1, ...allAccounts.map((x) => (x.withdrawals || []).length));
    const maxResets = Math.max(0, ...allAccounts.map((x) => (x.resets || []).length));
    const maxExtraIds = Math.max(0, ...allAccounts.map((x) => (x.extra_ids || []).length));

    const wdHeaders = [];
    for (let i = 0; i < maxWithdrawals; i++) {
      wdHeaders.push(
        `Retiro${i + 1} Estado`,
        `Retiro${i + 1} FechaSolicitado`,
        `Retiro${i + 1} FechaRecibido`,
        `Retiro${i + 1} Monto`,
        `Retiro${i + 1} Link`,
        `Retiro${i + 1} RazonNegativa`
      );
    }
    const resetHeaders = [];
    for (let i = 0; i < maxResets; i++) {
      resetHeaders.push(`Reinicio${i + 1} Fecha`, `Reinicio${i + 1} Costo`);
    }
    const extraIdHeaders = [];
    for (let i = 0; i < maxExtraIds; i++) {
      extraIdHeaders.push(`IDAdicional${i + 1} Etiqueta`, `IDAdicional${i + 1} Valor`);
    }

    const headers = [
      "ID Cuenta", ...extraIdHeaders, "Empresa", "Tipo de cuenta", "Tamaño", "Método", "Estado",
      "Fecha Compra", "Costo Compra", "Fecha Pasada", "Costo Activación", "Fecha Quemada",
      "Cancelada", "Fecha Cancelada", "Baneada", "Fecha Baneo", "Razón Baneo",
      "Cobro Recurrente", "Num Cobros Recurrentes", "Costo Cobros Recurrentes",
      ...resetHeaders, ...wdHeaders,
      "Total Invertido", "Total Retirado (recibido)", "Pendiente", "Denegado", "Neto", "ROI %", "Notas",
    ];

    const rows = allAccounts.map((acc) => {
      const m = accountMetrics(acc);
      const wd = acc.withdrawals || [];
      const wdCells = [];
      for (let i = 0; i < maxWithdrawals; i++) {
        const w = wd[i];
        wdCells.push(
          w ? w.status || "" : "",
          w ? w.requestDate || "" : "",
          w ? w.receivedDate || "" : "",
          w ? w.amount || "" : "",
          w ? w.link || "" : "",
          w ? w.denialReason || "" : ""
        );
      }
      const resets = acc.resets || [];
      const resetCells = [];
      for (let i = 0; i < maxResets; i++) {
        const r = resets[i];
        resetCells.push(r ? r.date || "" : "", r ? r.cost || "" : "");
      }
      const extraIds = acc.extra_ids || [];
      const extraIdCells = [];
      for (let i = 0; i < maxExtraIds; i++) {
        const x = extraIds[i];
        extraIdCells.push(x ? x.label || "" : "", x ? x.id || "" : "");
      }
      return [
        acc.account_id, ...extraIdCells, acc.company, acc.account_type, acc.size, acc.method, acc.status,
        acc.purchase_date, acc.purchase_cost, acc.passed_date, m.activationFee, acc.burned_date,
        acc.cancelled ? "Sí" : "No", acc.cancelled_date, acc.banned ? "Sí" : "No", acc.ban_date, acc.ban_reason,
        acc.recurring ? "Sí" : "No", m.recurringCharges, m.recurringChargesCost,
        ...resetCells, ...wdCells,
        m.invested, m.withdrawn, m.pending, m.denied, m.net, m.roi.toFixed(2), acc.notes,
      ];
    });

    const csv = [headers, ...rows]
      .map((r) => r.map((c) => `"${String(c == null ? "" : c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const today = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.download = `fundedorbit-cuentas-${today}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  const range = useMemo(
    () => getDateRangePreset(datePreset, customFrom, customTo),
    [datePreset, customFrom, customTo]
  );
  const accounts = useMemo(() => filterByDateRange(allAccounts, range), [allAccounts, range]);

  if (loading) {
    return <div className="auth-wrap">{d.loading}</div>;
  }

  if (loadError) {
    return (
      <div className="auth-wrap">
        <div className="card" style={{ maxWidth: 480, textAlign: "center" }}>
          <p style={{ fontWeight: 700, marginBottom: 8 }}>
            {lang === "en" ? "We couldn't load your dashboard" : "No pudimos cargar tu panel"}
          </p>
          <p className="sub" style={{ marginBottom: 16 }}>{loadError}</p>
          <button className="btn btn-primary" onClick={() => window.location.reload()}>
            {lang === "en" ? "Try again" : "Reintentar"}
          </button>
        </div>
      </div>
    );
  }

  const stats = computeTopStats(accounts);

  const lifecycle = computeLifecycle(accounts);
  const payoutsStats = computePayouts(accounts);
  const monthly = computeMonthly(accounts);
  const maxMonthly = Math.max(1, ...monthly.flatMap((mo) => [mo.invertido, mo.retirado]));
  const timeline = buildTimelineSeries(accounts);
  const lastNet = timeline.netSeries.length ? timeline.netSeries[timeline.netSeries.length - 1].value : 0;
  const lastExp = timeline.expenseSeries.length ? timeline.expenseSeries[timeline.expenseSeries.length - 1].value : 0;
  const lastInc = timeline.incomeSeries.length ? timeline.incomeSeries[timeline.incomeSeries.length - 1].value : 0;
  const topWorst = computeTopWorst(accounts);
  const breakdown = computeBreakdown(accounts);
  const activeWd = computeActiveWithdrawals(accounts);
  const burnedNoWd = computeBurnedNoWithdrawalList(accounts);
  const banned = computeBannedList(accounts);

  const statusOrder = ["activa", "pasada", "live", "quemada"];
  const statusCounts = statusOrder.reduce((acc, s) => {
    acc[s] = accounts.filter((row) => row.status === s).length;
    return acc;
  }, {});
  const donutGradient = buildDonutGradient(statusCounts, statusOrder);

  const chips = [
    ["7d", d.range7d],
    ["30d", d.range30d],
    ["90d", d.range90d],
    ["ytd", d.rangeYtd],
    ["all", d.rangeAll],
    ["custom", d.rangeCustom],
  ];

  const companyOptions = [...new Set(allAccounts.map((x) => (x.company || "").trim()).filter(Boolean))].sort();

  const filteredAccounts = allAccounts.filter((acc) => {
    if (filterStatus !== "all" && acc.status !== filterStatus) return false;
    if (filterCompany !== "all" && (acc.company || "").trim() !== filterCompany) return false;
    if (filterCancelled === "yes" && !acc.cancelled) return false;
    if (filterCancelled === "no" && acc.cancelled) return false;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      const idMatch = (acc.account_id || "").toLowerCase().includes(q);
      const companyMatch = (acc.company || "").toLowerCase().includes(q);
      const extraMatch = (acc.extra_ids || []).some((x) => (x.id || "").toLowerCase().includes(q) || (x.label || "").toLowerCase().includes(q));
      if (!idMatch && !companyMatch && !extraMatch) return false;
    }
    return true;
  });

  return (
    <div className="wrap">
      <SiteNav
        rightSlot={<button className="btn btn-ghost" onClick={handleLogout}>{dict.nav.logout}</button>}
      />

      <section className="hero" style={{ padding: "40px 10px 10px" }}>
        <h1>
          {profile?.avatar} {d.welcome} <span>{profile?.nickname}</span>
        </h1>
      </section>

      <div className="app-toolbar">
        <div className="app-tabs">
          <button
            type="button"
            className={`tab-btn ${tab === "dashboard" ? "active" : ""}`}
            onClick={() => setTab("dashboard")}
          >
            {dict.nav.dashboard}
          </button>
          <button
            type="button"
            className={`tab-btn ${tab === "cuentas" ? "active" : ""}`}
            onClick={() => setTab("cuentas")}
          >
            {a.title}
          </button>
        </div>
        <div className="app-toolbar-actions">
          {tab === "cuentas" && allAccounts.length > 0 && (
            <button className="btn btn-ghost" onClick={handleExportCsv}>
              {a.exportCsv}
            </button>
          )}
          <button
            className="btn btn-primary"
            onClick={() => {
              setEditing(null);
              setShowForm(true);
            }}
          >
            {a.newAccount}
          </button>
          <button
            className="btn btn-ghost"
            onClick={() => setShowBulkForm(true)}
            type="button"
          >
            {a.newAccountGroup}
          </button>
        </div>
      </div>

      {tab === "dashboard" ? (
        <>
          <div className="filter-bar">
            {chips.map(([key, label]) => (
              <button
                key={key}
                className={`chip ${datePreset === key ? "active" : ""}`}
                onClick={() => setDatePreset(key)}
                type="button"
              >
                {label}
              </button>
            ))}
            {datePreset === "custom" && (
              <span className="range-inputs" style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{d.rangeFrom}</span>
                <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} />
                <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{d.rangeTo}</span>
                <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} />
              </span>
            )}
            <span className="filter-count">
              {d.filterCount.replace("{n}", accounts.length).replace("{total}", allAccounts.length)}
            </span>
          </div>

          {allAccounts.length === 0 ? (
            <div className="card" style={{ textAlign: "center", padding: 40 }}>
              <p style={{ fontWeight: 700, marginBottom: 8 }}>{a.empty}</p>
              <p className="sub" style={{ margin: 0 }}>
                {a.emptyInstructions1}
                <Link href="/como-usar" style={{ color: "var(--accent-cyan)", fontWeight: 600 }}>
                  {a.emptyInstructionsLink}
                </Link>
                {a.emptyInstructions2}
              </p>
            </div>
          ) : accounts.length === 0 ? (
            <div className="card" style={{ textAlign: "center", padding: 40 }}>
              <p>{d.noAccountsInRange}</p>
            </div>
          ) : (
            <>
              <section style={{ paddingBottom: 10 }}>
                <div className="kpi-mini-grid">
                  <div className="kpi-card">
                    <div className="label">{a.kpiActiveAccounts}</div>
                    <div className="value">
                      <span className="accent-value">{stats.counts.activa || 0}</span>
                      <span className="value-sep"> / </span>
                      <span className="value-funded">{stats.counts.pasada || 0}</span>
                    </div>
                    <div className="sub">{a.kpiActiveAccountsSub}</div>
                  </div>
                  <div className="kpi-card">
                    <div className="label">{a.kpiInvested}</div>
                    <div className="value">{fmtMoney(stats.totalInvertido)}</div>
                    <div className="sub">{a.kpiInvestedSub.replace("{n}", stats.totalCuentas)}</div>
                  </div>
                  <div className="kpi-card">
                    <div className="label">{a.kpiWithdrawn}</div>
                    <div className="value">{fmtMoney(stats.totalRetirado)}</div>
                    <div className="sub">{a.kpiWithdrawnSub}</div>
                  </div>
                  <div className={`kpi-card ${stats.netProfit >= 0 ? "positive" : "negative"}`}>
                    <div className="label">{a.kpiNet}</div>
                    <div className="value">{fmtMoney(stats.netProfit)}</div>
                    <div className="sub">{a.kpiNetSub}</div>
                  </div>
                  <div className={`kpi-card ${stats.roiGlobal >= 0 ? "positive" : "negative"}`}>
                    <div className="label">{a.kpiRoi}</div>
                    <div className="value">{stats.roiGlobal.toFixed(1)}%</div>
                    <div className="sub">{a.kpiRoiSub}</div>
                  </div>
                  <div className="kpi-card">
                    <div className="label">{a.kpiApprovalRate}</div>
                    <div className="value">{stats.tasaAprobacion.toFixed(0)}%</div>
                    <div className="sub">
                      {a.kpiApprovalRateSub.replace("{passed}", stats.numAprobadasHist || 0).replace("{burned}", stats.numQuemadasSinAprobar || 0)}
                    </div>
                  </div>
                  <div className="kpi-card">
                    <div className="label">{a.kpiAvgCostPerAccount}</div>
                    <div className="value">{fmtMoney(stats.costoPromedio)}</div>
                    <div className="sub">{a.kpiAvgCostPerAccountSub}</div>
                  </div>
                  <div className="kpi-card">
                    <div className="label">{a.kpiAvgWithdrawal}</div>
                    <div className="value">{fmtMoney(stats.retiroPromedio)}</div>
                    <div className="sub">{a.kpiAvgWithdrawalSub}</div>
                  </div>
                  <div className="kpi-card">
                    <div className="label">{a.kpiResetsSpent}</div>
                    <div className="value">{fmtMoney(stats.costoReinicios)}</div>
                    <div className="sub">{a.kpiResetsSpentSub.replace("{n}", stats.numReinicios)}</div>
                  </div>
                  <div className="kpi-card">
                    <div className="label">{a.kpiActivationSpent}</div>
                    <div className="value">{fmtMoney(stats.costoActivacion)}</div>
                    <div className="sub">{a.kpiActivationSpentSub}</div>
                  </div>
                  <div className="kpi-card">
                    <div className="label">{a.kpiRecurringSpent}</div>
                    <div className="value">{fmtMoney(stats.costoRecurrentes)}</div>
                    <div className="sub">{a.kpiRecurringSpentSub.replace("{n}", stats.numRecurrentes)}</div>
                  </div>
                  <div className="kpi-card">
                    <div className="label">{a.kpiTotalAccountsPeriod}</div>
                    <div className="value accent-value">{stats.totalCuentas}</div>
                    <div className="sub">{a.kpiTotalAccountsPeriodSub}</div>
                  </div>
                </div>
              </section>

              <h2 className="section-title">{al.title}</h2>
              <div className="card" style={{ marginBottom: 10 }}>
                <InsightsPanel insights={insightsList} dict={dict} />
              </div>

              <h2 className="section-title">{lc.title}</h2>
              <div className="kpi-mini-grid">
                <div className="kpi-card positive">
                  <div className="label">{lc.passed}</div>
                  <div className="value">{lifecycle.pasadas}</div>
                  <div className="sub">{lc.passedSub.replace("{pct}", lifecycle.pctPasadas.toFixed(0))}</div>
                </div>
                <div className="kpi-card positive">
                  <div className="label">{lc.fundedTotal}</div>
                  <div className="value">{lifecycle.fundedTotal}</div>
                  <div className="sub">{lc.fundedTotalSub}</div>
                </div>
                <div className="kpi-card">
                  <div className="label">{lc.liveCount}</div>
                  <div className="value">{lifecycle.liveCount}</div>
                  <div className="sub">{lc.liveCountSub}</div>
                </div>
                <div className="kpi-card negative">
                  <div className="label">{lc.burnedCount}</div>
                  <div className="value">{lifecycle.quemadas}</div>
                  <div className="sub">{lc.burnedCountSub.replace("{pct}", lifecycle.pctQuemadas.toFixed(0))}</div>
                </div>
                <div className="kpi-card">
                  <div className="label">{lc.cancelledCount}</div>
                  <div className="value">{lifecycle.canceladasCount}</div>
                  <div className="sub">{lc.cancelledCountSub}</div>
                </div>
                <div className="kpi-card">
                  <div className="label">{lc.avgDaysToPass}</div>
                  <div className="value">{fmtDays(lifecycle.avgDaysToPass)}</div>
                  <div className="sub">{lc.avgDaysToPassSub}</div>
                </div>
                <div className="kpi-card">
                  <div className="label">{lc.avgDaysToBurn}</div>
                  <div className="value">{fmtDays(lifecycle.avgDaysToBurn)}</div>
                  <div className="sub">{lc.avgDaysToBurnSub}</div>
                </div>
                <div className="kpi-card">
                  <div className="label">{lc.ltv}</div>
                  <div className="value">{fmtMoney(lifecycle.ltvPromedio)}</div>
                  <div className="sub">{lc.ltvSub}</div>
                </div>
                <div className="kpi-card">
                  <div className="label">{lc.avgCostBurned}</div>
                  <div className="value">{fmtMoney(lifecycle.costoPromedioQuemada)}</div>
                  <div className="sub">{lc.avgCostBurnedSub}</div>
                </div>
                <div className={`kpi-card ${lifecycle.burnedNoWithdrawal > 0 ? "negative" : ""}`}>
                  <div className="label">{lc.burnedNoWithdrawal}</div>
                  <div className="value">{lifecycle.burnedNoWithdrawal}</div>
                  <div className="sub">
                    {lc.burnedNoWithdrawalSub
                      .replace("{pct}", lifecycle.pctBurnedNoWithdrawal.toFixed(0))
                      .replace("{n}", lifecycle.fundedTotal)}
                  </div>
                </div>
                <div className="kpi-card">
                  <div className="label">{lc.avgWithdrawalsFinalized}</div>
                  <div className="value">
                    {lifecycle.avgWithdrawalsPerAccountFinalized == null
                      ? "—"
                      : lifecycle.avgWithdrawalsPerAccountFinalized.toFixed(1)}
                  </div>
                  <div className="sub">
                    {lifecycle.cntFinalizedWithWd
                      ? lc.avgWithdrawalsFinalizedSubHas.replace("{n}", lifecycle.cntFinalizedWithWd)
                      : lc.avgWithdrawalsFinalizedSubNone}
                  </div>
                </div>
                <div className="kpi-card">
                  <div className="label">{lc.avgWithdrawalsAll}</div>
                  <div className="value">
                    {lifecycle.avgWithdrawalsPerAccountAll == null ? "—" : lifecycle.avgWithdrawalsPerAccountAll.toFixed(1)}
                  </div>
                  <div className="sub">
                    {lifecycle.cntAllWithWd
                      ? lc.avgWithdrawalsAllSubHas.replace("{n}", lifecycle.cntAllWithWd)
                      : lc.avgWithdrawalsAllSubNone}
                  </div>
                </div>
                <div className={`kpi-card ${banned.length > 0 ? "negative" : ""}`}>
                  <div className="label">{lc.bannedCount}</div>
                  <div className="value">{banned.length}</div>
                  <div className="sub">{lc.bannedCountSub.replace("{n}", accounts.length)}</div>
                </div>
              </div>

              <h2 className="section-title">{py.title}</h2>
              <div className="kpi-mini-grid">
                <div className="kpi-card">
                  <div className="label">{py.requested}</div>
                  <div className="value">{payoutsStats.solicitados}</div>
                  <div className="sub">{py.requestedSub}</div>
                </div>
                <div className="kpi-card">
                  <div className="label">{py.approved}</div>
                  <div className="value">{payoutsStats.aprobados}</div>
                  <div className="sub">{py.approvedSub}</div>
                </div>
                <div className="kpi-card positive">
                  <div className="label">{py.received}</div>
                  <div className="value">{payoutsStats.recibidos}</div>
                  <div className="sub">{py.receivedSub}</div>
                </div>
                <div className={`kpi-card ${payoutsStats.denegados > 0 ? "negative" : ""}`}>
                  <div className="label">{py.denied}</div>
                  <div className="value">{payoutsStats.denegados}</div>
                  <div className="sub">{py.deniedSub}</div>
                </div>
                <div className="kpi-card">
                  <div className="label">{py.avgDaysToReceive}</div>
                  <div className="value">{fmtDays(payoutsStats.avgDaysToReceive)}</div>
                  <div className="sub">{py.avgDaysToReceiveSub}</div>
                </div>
                <div className="kpi-card">
                  <div className="label">{py.bestCompany}</div>
                  <div className="value" style={{ fontSize: 16 }}>
                    {payoutsStats.bestCompany ? payoutsStats.bestCompany.empresa : "—"}
                  </div>
                  <div className="sub">
                    {payoutsStats.bestCompany
                      ? py.bestCompanySubHas.replace("{days}", payoutsStats.bestCompany.avgDays.toFixed(1))
                      : py.bestCompanySubNone}
                  </div>
                </div>
              </div>

              <div className="grid-2" style={{ marginTop: 30 }}>
                <div className="card">
                  <h3>
                    {py.companyTableTitle}
                    <span className="h3-sub">{py.companyTableSub}</span>
                  </h3>
                  {payoutsStats.companyAvg.length === 0 ? (
                    <div className="empty-state">{py.companyTableEmpty}</div>
                  ) : (
                    <div className="accounts-table-wrap">
                      <table className="accounts-table">
                        <thead>
                          <tr>
                            <th>{py.colCompany}</th>
                            <th>{py.colAvgDays}</th>
                            <th>{py.colReceivedCount}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {payoutsStats.companyAvg.map((c) => (
                            <tr key={c.empresa}>
                              <td>{c.empresa}</td>
                              <td>{c.avgDays.toFixed(1)} {lang === "en" ? "days" : "días"}</td>
                              <td>{c.cnt}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
                <div className="card">
                  <h3>
                    {py.deniedListTitle}
                    <span className="h3-sub">{py.deniedListSub}</span>
                  </h3>
                  {payoutsStats.deniedList.length === 0 ? (
                    <div className="empty-state">{py.deniedListEmpty}</div>
                  ) : (
                    <div className="alerts-list">
                      {payoutsStats.deniedList.map(({ acc, w }, i) => (
                        <div className="alert-item" key={i}>
                          <span className="alert-dot warn" />
                          <span>
                            {acc.account_id || "—"} ({acc.company || "—"}) — {fmtMoney(w.amount)}
                            {w.denialReason ? `: "${w.denialReason}"` : ` ${py.deniedNoReason}`}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <h2 className="section-title">{d.cumulativeSectionTitle}</h2>
              <div className="charts-grid-3">
                <div className="chart-card stat-chart-card">
                  <h3>{d.chartPnl}</h3>
                  <div className={`big-stat ${lastNet >= 0 ? "pos" : "neg"}`}>{fmtMoney(lastNet)}</div>
                  <div className="stat-sub">{d.chartPnlSub}</div>
                  <LineChartSVG series={timeline.netSeries} color="#a78bfa" />
                </div>
                <div className="chart-card stat-chart-card">
                  <h3>{d.chartExpenses}</h3>
                  <div className="big-stat">{fmtMoney(lastExp)}</div>
                  <div className="stat-sub">{d.chartExpensesSub}</div>
                  <LineChartSVG series={timeline.expenseSeries} color="#f472b6" />
                </div>
                <div className="chart-card stat-chart-card">
                  <h3>{d.chartWithdrawals}</h3>
                  <div className="big-stat">{fmtMoney(lastInc)}</div>
                  <div className="stat-sub">{d.chartWithdrawalsSub}</div>
                  <LineChartSVG series={timeline.incomeSeries} color="#22d3ee" />
                </div>
              </div>

              <div className="charts-grid" style={{ marginTop: 30 }}>
                <div className="chart-card">
                  <h3>{a.monthlyChartTitle}</h3>
                  {monthly.length === 0 ? (
                    <div className="empty-state">—</div>
                  ) : (
                    <>
                      <div className="bars-row">
                        {monthly.map((mo) => (
                          <div className="bar-group" key={mo.month}>
                            <div className="bar-pair">
                              <div
                                className="bar invest"
                                style={{ height: `${(mo.invertido / maxMonthly) * 130}px` }}
                                title={`${a.kpiInvested}: ${fmtMoney(mo.invertido)}`}
                              >
                                <span className="bar-tooltip">{fmtMoney(mo.invertido)}</span>
                              </div>
                              <div
                                className="bar withdraw"
                                style={{ height: `${(mo.retirado / maxMonthly) * 130}px` }}
                                title={`${a.kpiWithdrawn}: ${fmtMoney(mo.retirado)}`}
                              >
                                <span className="bar-tooltip">{fmtMoney(mo.retirado)}</span>
                              </div>
                            </div>
                            <div className="bar-label">{mo.month.slice(5)}</div>
                          </div>
                        ))}
                      </div>
                      <div className="chart-legend">
                        <span><i style={{ background: "var(--accent-pink)" }} /> {a.kpiInvested}</span>
                        <span><i style={{ background: "var(--accent-cyan)" }} /> {a.kpiWithdrawn}</span>
                      </div>
                    </>
                  )}
                </div>

                <div className="chart-card">
                  <h3>{a.statusChartTitle}</h3>
                  <div className="donut-wrap">
                    <div className="donut" style={{ background: donutGradient }}>
                      <div className="donut-center">
                        <div className="n">{accounts.length}</div>
                        <div className="l">{a.title}</div>
                      </div>
                    </div>
                    <div className="donut-legend">
                      {statusOrder.map((s) => (
                        <div className="legend-item" key={s}>
                          <span className="legend-dot" style={{ background: STATUS_COLORS[s] }} />
                          {a[`status${s.charAt(0).toUpperCase() + s.slice(1)}`]}: {statusCounts[s]}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid-2" style={{ marginTop: 30 }}>
                <div>
                  <h2 className="section-title" style={{ marginTop: 0 }}>{d.byCompanyTitle}</h2>
                  <div className="accounts-table-wrap">
                    <table className="accounts-table">
                      <thead>
                        <tr>
                          <th>{a.colCompany}</th>
                          <th>{a.colId}s</th>
                          <th>{a.kpiInvested}</th>
                          <th>{a.kpiWithdrawn}</th>
                          <th>{a.colRoi}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {breakdown.byCompany.length === 0 ? (
                          <tr><td colSpan={5}>{d.noDataInRange}</td></tr>
                        ) : breakdown.byCompany.map((row) => (
                          <tr key={row.name}>
                            <td>{row.name}</td>
                            <td>{row.cuentas}</td>
                            <td>{fmtMoney(row.invertido)}</td>
                            <td>{fmtMoney(row.retirado)}</td>
                            <td className={row.roi >= 0 ? "positive" : "negative"}>{row.roi.toFixed(1)}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                <div>
                  <h2 className="section-title" style={{ marginTop: 0 }}>
                    {d.byMethodTitle}
                    <span className="h3-sub">{d.byMethodSub}</span>
                  </h2>
                  <div className="accounts-table-wrap">
                    <table className="accounts-table">
                      <thead>
                        <tr>
                          <th>{a.fieldMethod}</th>
                          <th>{a.colId}s</th>
                          <th>{a.kpiInvested}</th>
                          <th>{a.kpiWithdrawn}</th>
                          <th>{a.colRoi}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {breakdown.byMethod.length === 0 ? (
                          <tr><td colSpan={5}>{d.noDataInRange}</td></tr>
                        ) : breakdown.byMethod.map((row) => (
                          <tr key={row.name}>
                            <td>{row.name}</td>
                            <td>{row.cuentas}</td>
                            <td>{fmtMoney(row.invertido)}</td>
                            <td>{fmtMoney(row.retirado)}</td>
                            <td className={row.roi >= 0 ? "positive" : "negative"}>{row.roi.toFixed(1)}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div className="grid-2" style={{ marginTop: 30 }}>
                <div>
                  <h2 className="section-title" style={{ marginTop: 0 }}>{d.topRoiTitle}</h2>
                  <div className="accounts-table-wrap">
                    <table className="accounts-table">
                      <thead>
                        <tr>
                          <th>{a.colId}</th>
                          <th>{a.colCompany}</th>
                          <th>{a.colRoi}</th>
                          <th>{d.colNeto}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {topWorst.top.length === 0 ? (
                          <tr><td colSpan={4}>{d.noDataInRange}</td></tr>
                        ) : topWorst.top.map(({ acc, m }) => (
                          <tr key={acc.id}>
                            <td>{acc.account_id || "—"}</td>
                            <td>{acc.company || "—"}</td>
                            <td className={m.roi >= 0 ? "positive" : "negative"}>{m.roi.toFixed(1)}%</td>
                            <td>{fmtMoney(m.net)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                <div>
                  <h2 className="section-title" style={{ marginTop: 0 }}>{d.worstRoiTitle}</h2>
                  <div className="accounts-table-wrap">
                    <table className="accounts-table">
                      <thead>
                        <tr>
                          <th>{a.colId}</th>
                          <th>{a.colCompany}</th>
                          <th>{d.colNeto}</th>
                          <th>{a.colRoi}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {topWorst.worst.length === 0 ? (
                          <tr><td colSpan={4}>{d.noDataInRange}</td></tr>
                        ) : topWorst.worst.map(({ acc, m }) => (
                          <tr key={acc.id}>
                            <td>{acc.account_id || "—"}</td>
                            <td>{acc.company || "—"}</td>
                            <td className={m.net >= 0 ? "positive" : "negative"}>{fmtMoney(m.net)}</td>
                            <td className={m.roi >= 0 ? "positive" : "negative"}>{m.roi.toFixed(1)}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <h2 className="section-title">
                {d.activeWithdrawalsTitle}
                <span className="h3-sub">{d.activeWithdrawalsSub}</span>
              </h2>
              {activeWd.length === 0 ? (
                <div className="card" style={{ marginBottom: 16 }}>
                  <div className="empty-state">{d.activeWithdrawalsEmpty}</div>
                </div>
              ) : (
                <div className="accounts-table-wrap" style={{ marginBottom: 16 }}>
                  <table className="accounts-table">
                    <thead>
                      <tr>
                        <th>{a.colId}</th>
                        <th>{a.colCompany}</th>
                        <th>{a.colSize}</th>
                        <th>{d.colWithdrawalsCount}</th>
                        <th>{a.kpiWithdrawn}</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeWd.map(({ acc, wdCount, wdTotal }) => (
                        <tr key={acc.id}>
                          <td>{acc.account_id || "—"}</td>
                          <td>{acc.company || "—"}</td>
                          <td>{acc.size || "—"}</td>
                          <td>{wdCount}</td>
                          <td>{fmtMoney(wdTotal)}</td>
                          <td>
                            {wdCount >= 3 ? (
                              <span className="badge quemada">{d.watchBadge}</span>
                            ) : wdCount >= 1 ? (
                              <span className="badge activa">{d.inProgressBadge}</span>
                            ) : null}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <h2 className="section-title">
                {d.burnedNoWithdrawalTitle}
                <span className="h3-sub">{d.burnedNoWithdrawalTableSub}</span>
              </h2>
              {burnedNoWd.length === 0 ? (
                <div className="card" style={{ marginBottom: 16 }}>
                  <div className="empty-state">{d.burnedNoWithdrawalEmpty}</div>
                </div>
              ) : (
                <div className="accounts-table-wrap" style={{ marginBottom: 16 }}>
                  <table className="accounts-table">
                    <thead>
                      <tr>
                        <th>{a.colId}</th>
                        <th>{a.colCompany}</th>
                        <th>{a.fieldMethod}</th>
                        <th>{a.fieldPassedDate}</th>
                        <th>{a.fieldBurnedDate}</th>
                        <th>{a.kpiInvested}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {burnedNoWd.map((acc) => {
                        const m = accountMetrics(acc);
                        return (
                          <tr key={acc.id}>
                            <td>{acc.account_id || "—"}</td>
                            <td>{acc.company || "—"}</td>
                            <td>{acc.method || "—"}</td>
                            <td>{acc.passed_date || "—"}</td>
                            <td>{acc.burned_date || "—"}</td>
                            <td className="negative">{fmtMoney(m.invested)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              <h2 className="section-title">
                {d.bannedTitle}
                <span className="h3-sub">{d.bannedSub}</span>
              </h2>
              {banned.length === 0 ? (
                <div className="card" style={{ marginBottom: 16 }}>
                  <div className="empty-state">{d.bannedEmpty}</div>
                </div>
              ) : (
                <div className="accounts-table-wrap" style={{ marginBottom: 16 }}>
                  <table className="accounts-table">
                    <thead>
                      <tr>
                        <th>{a.colId}</th>
                        <th>{a.colCompany}</th>
                        <th>{a.colType}</th>
                        <th>{d.colBanDate}</th>
                        <th>{d.colBanReason}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {banned.map((acc) => (
                        <tr key={acc.id}>
                          <td>{acc.account_id || "—"}</td>
                          <td>{acc.company || "—"}</td>
                          <td>{acc.account_type || "—"}</td>
                          <td>{acc.ban_date || "—"}</td>
                          <td>{acc.ban_reason || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <h2 className="section-title">{d.milestonesTitle}</h2>
              <div className="card" style={{ marginBottom: 16 }}>
                <MilestonesBadges badges={badgesList} lang={lang} dict={dict} />
              </div>
            </>
          )}
        </>
      ) : (
        <section style={{ padding: "0 0 40px" }}>
          {allAccounts.length === 0 ? (
            <div className="card" style={{ textAlign: "center", padding: 40 }}>
              <p style={{ fontWeight: 700, marginBottom: 8 }}>{a.empty}</p>
              <p className="sub" style={{ margin: 0 }}>
                {a.emptyInstructions1}
                <Link href="/como-usar" style={{ color: "var(--accent-cyan)", fontWeight: 600 }}>
                  {a.emptyInstructionsLink}
                </Link>
                {a.emptyInstructions2}
              </p>
            </div>
          ) : (
            <>
              <div className="filter-bar">
                <input
                  type="text"
                  placeholder={a.searchPlaceholder}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                  <option value="all">{a.filterAllStatus}</option>
                  <option value="activa">{a.statusActiva}</option>
                  <option value="pasada">{a.statusPasada}</option>
                  <option value="live">{a.statusLive}</option>
                  <option value="quemada">{a.statusQuemada}</option>
                </select>
                <select value={filterCompany} onChange={(e) => setFilterCompany(e.target.value)}>
                  <option value="all">{a.filterAllCompanies}</option>
                  {companyOptions.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <select value={filterCancelled} onChange={(e) => setFilterCancelled(e.target.value)}>
                  <option value="all">{a.filterCancelledAll}</option>
                  <option value="yes">{a.filterCancelledYes}</option>
                  <option value="no">{a.filterCancelledNo}</option>
                </select>
                <span className="filter-count">{filteredAccounts.length} / {allAccounts.length}</span>
              </div>

              {filteredAccounts.length === 0 ? (
                <div className="card" style={{ textAlign: "center", padding: 40 }}>
                  <p>{a.noResults}</p>
                </div>
              ) : (
                <div className="accounts-table-wrap">
                  <table className="accounts-table">
                    <thead>
                      <tr>
                        <th>{a.colId}</th>
                        <th>{a.colCompany}</th>
                        <th>{a.colType}</th>
                        <th>{a.colSize}</th>
                        <th>{a.colStatus}</th>
                        <th>{a.colPurchase}</th>
                        <th>{a.colInvested}</th>
                        <th>{a.colWithdrawn}</th>
                        <th>{a.colRoi}</th>
                        <th>{a.colActions}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAccounts.map((acc) => {
                        const m = accountMetrics(acc);
                        return (
                          <tr key={acc.id}>
                            <td>
                              {acc.account_id || "—"}
                              {acc.recurring && m.recurringCharges > 0 && (
                                <span
                                  className="badge-pill"
                                  style={{ marginLeft: 6 }}
                                  title={a.chargeCountTitle ? a.chargeCountTitle.replace("{n}", m.recurringCharges) : `${m.recurringCharges}`}
                                >
                                  🔁 {m.recurringCharges}
                                </span>
                              )}
                              {acc.cancelled && (
                                <span className="badge cancelada" style={{ marginLeft: 6 }}>
                                  {a.cancelledBadge}
                                </span>
                              )}
                            </td>
                            <td>{acc.company || "—"}</td>
                            <td>{acc.account_type || "—"}</td>
                            <td>{acc.size || "—"}</td>
                            <td>
                              <span className={`badge ${acc.status}`}>
                                {a[`status${acc.status.charAt(0).toUpperCase() + acc.status.slice(1)}`]}
                              </span>
                            </td>
                            <td>{acc.purchase_date || "—"}</td>
                            <td>{fmtMoney(m.invested)}</td>
                            <td>{fmtMoney(m.withdrawn)}</td>
                            <td className={m.roi >= 0 ? "positive" : "negative"}>{m.roi.toFixed(1)}%</td>
                            <td>
                              <div className="row-actions">
                                <button
                                  onClick={() => {
                                    setEditing(acc);
                                    setShowForm(true);
                                  }}
                                >
                                  {a.edit}
                                </button>
                                <button onClick={() => handleDelete(acc.id)}>{a.delete}</button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </section>
      )}

      {showForm && (
        <AccountFormModal
          account={editing}
          userId={userId}
          allAccounts={allAccounts}
          onClose={() => {
            setShowForm(false);
            setEditing(null);
          }}
          onSaved={handleSaved}
        />
      )}

      {showBulkForm && (
        <BulkAccountModal
          userId={userId}
          allAccounts={allAccounts}
          onClose={() => setShowBulkForm(false)}
          onSaved={handleBulkSaved}
        />
      )}

      <SiteFooter />
    </div>
  );
}
