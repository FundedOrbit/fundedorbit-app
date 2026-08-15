"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";
import { useLanguage } from "../../components/LanguageProvider";
import SiteNav from "../../components/SiteNav";
import SiteFooter from "../../components/SiteFooter";
import LineChartSVG from "../../components/LineChartSVG";
import {
  fetchAccounts,
  accountMetrics,
  computeAlerts,
  renderAlert,
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
  const { dict } = useLanguage();
  const d = dict.dashboard;
  const a = dict.accounts;
  const al = dict.alerts;
  const lc = dict.lifecycle;
  const py = dict.payouts;

  const [profile, setProfile] = useState(null);
  const [allAccounts, setAllAccounts] = useState([]);
  const [loading, setLoading] = useState(true);

  const [datePreset, setDatePreset] = useState("all");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  useEffect(() => {
    async function load() {
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
      const rows = await fetchAccounts(session.user.id);
      setAllAccounts(rows);
      setLoading(false);
    }
    load();
  }, [router]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  const range = useMemo(
    () => getDateRangePreset(datePreset, customFrom, customTo),
    [datePreset, customFrom, customTo]
  );
  const accounts = useMemo(() => filterByDateRange(allAccounts, range), [allAccounts, range]);

  if (loading) {
    return <div className="auth-wrap">{d.loading}</div>;
  }

  const totals = accounts.reduce(
    (acc, row) => {
      const m = accountMetrics(row);
      acc.invested += m.invested;
      acc.withdrawn += m.withdrawn;
      return acc;
    },
    { invested: 0, withdrawn: 0 }
  );
  const net = totals.withdrawn - totals.invested;
  const roi = totals.invested > 0 ? (net / totals.invested) * 100 : 0;

  const alerts = computeAlerts(accounts);
  const lifecycle = computeLifecycle(accounts);
  const payoutsStats = computePayouts(accounts);
  const monthly = computeMonthly(accounts);
  const maxMonthly = Math.max(1, ...monthly.flatMap((mo) => [mo.invertido, mo.retirado]));
  const timeline = buildTimelineSeries(accounts);
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

  return (
    <div className="wrap">
      <SiteNav
        showDiscord
        rightSlot={<button className="btn btn-ghost" onClick={handleLogout}>{dict.nav.logout}</button>}
      />

      <section className="hero" style={{ padding: "40px 10px 20px" }}>
        <h1>
          {profile?.avatar} {d.welcome} <span>{profile?.nickname}</span>
        </h1>
        <div className="hero-actions">
          <Link href="/accounts" className="btn btn-primary">
            {a.manageCta}
          </Link>
        </div>
      </section>

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
          <p>{a.empty}</p>
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
                <div className="label">{a.kpiInvested}</div>
                <div className="value">{fmtMoney(totals.invested)}</div>
              </div>
              <div className="kpi-card">
                <div className="label">{a.kpiWithdrawn}</div>
                <div className="value">{fmtMoney(totals.withdrawn)}</div>
              </div>
              <div className={`kpi-card ${net >= 0 ? "positive" : "negative"}`}>
                <div className="label">{a.kpiNet}</div>
                <div className="value">{fmtMoney(net)}</div>
              </div>
              <div className={`kpi-card ${roi >= 0 ? "positive" : "negative"}`}>
                <div className="label">{a.kpiRoi}</div>
                <div className="value">{roi.toFixed(1)}%</div>
              </div>
            </div>
          </section>

          <div className="charts-grid-3">
            <div className="chart-card">
              <h3>{d.chartPnl}</h3>
              <LineChartSVG series={timeline.netSeries} color="#a78bfa" />
            </div>
            <div className="chart-card">
              <h3>{d.chartExpenses}</h3>
              <LineChartSVG series={timeline.expenseSeries} color="#f472b6" />
            </div>
            <div className="chart-card">
              <h3>{d.chartWithdrawals}</h3>
              <LineChartSVG series={timeline.incomeSeries} color="#22d3ee" />
            </div>
          </div>

          <h2 className="section-title">{lc.title}</h2>
          <div className="kpi-mini-grid">
            <div className="kpi-card">
              <div className="label">{lc.passed}</div>
              <div className="value">{lifecycle.pasadas}</div>
            </div>
            <div className="kpi-card">
              <div className="label">{lc.fundedTotal}</div>
              <div className="value">{lifecycle.fundedTotal}</div>
            </div>
            <div className="kpi-card">
              <div className="label">{lc.liveCount}</div>
              <div className="value">{lifecycle.liveCount}</div>
            </div>
            <div className="kpi-card">
              <div className="label">{lc.burnedNoWithdrawal}</div>
              <div className="value">{lifecycle.burnedNoWithdrawal}</div>
            </div>
            <div className="kpi-card">
              <div className="label">{lc.avgDaysToPass}</div>
              <div className="value">{fmtDays(lifecycle.avgDaysToPass)}</div>
            </div>
            <div className="kpi-card">
              <div className="label">{lc.avgDaysToBurn}</div>
              <div className="value">{fmtDays(lifecycle.avgDaysToBurn)}</div>
            </div>
            <div className="kpi-card">
              <div className="label">{lc.avgWithdrawals}</div>
              <div className="value">
                {lifecycle.avgWithdrawalsPerAccount == null ? "—" : lifecycle.avgWithdrawalsPerAccount.toFixed(1)}
              </div>
            </div>
          </div>

          <h2 className="section-title">{py.title}</h2>
          <div className="kpi-mini-grid">
            <div className="kpi-card">
              <div className="label">{py.requested}</div>
              <div className="value">{fmtMoney(payoutsStats.solicitados)}</div>
            </div>
            <div className="kpi-card">
              <div className="label">{py.approved}</div>
              <div className="value">{fmtMoney(payoutsStats.aprobados)}</div>
            </div>
            <div className="kpi-card">
              <div className="label">{py.received}</div>
              <div className="value">{fmtMoney(payoutsStats.recibidos)}</div>
            </div>
            <div className="kpi-card">
              <div className="label">{py.denied}</div>
              <div className="value">{fmtMoney(payoutsStats.denegados)}</div>
            </div>
            <div className="kpi-card">
              <div className="label">{py.avgDaysToReceive}</div>
              <div className="value">{fmtDays(payoutsStats.avgDaysToReceive)}</div>
            </div>
            <div className="kpi-card">
              <div className="label">{py.bestCompany}</div>
              <div className="value" style={{ fontSize: 16 }}>
                {payoutsStats.bestCompany ? payoutsStats.bestCompany.empresa : "—"}
              </div>
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
                          <div className="bar invest" style={{ height: `${(mo.invertido / maxMonthly) * 130}px` }} />
                          <div className="bar withdraw" style={{ height: `${(mo.retirado / maxMonthly) * 130}px` }} />
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
              <h2 className="section-title" style={{ marginTop: 0 }}>{a.topRoiTitle}</h2>
              <div className="accounts-table-wrap">
                <table className="accounts-table">
                  <thead>
                    <tr>
                      <th>{a.colId}</th>
                      <th>{a.colCompany}</th>
                      <th>{a.colRoi}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topWorst.top.length === 0 ? (
                      <tr><td colSpan={3}>—</td></tr>
                    ) : topWorst.top.map(({ acc, m }) => (
                      <tr key={acc.id}>
                        <td>{acc.account_id || "—"}</td>
                        <td>{acc.company || "—"}</td>
                        <td className={m.roi >= 0 ? "positive" : "negative"}>{m.roi.toFixed(1)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div>
              <h2 className="section-title" style={{ marginTop: 0 }}>{a.worstRoiTitle}</h2>
              <div className="accounts-table-wrap">
                <table className="accounts-table">
                  <thead>
                    <tr>
                      <th>{a.colId}</th>
                      <th>{a.colCompany}</th>
                      <th>{a.colRoi}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topWorst.worst.length === 0 ? (
                      <tr><td colSpan={3}>—</td></tr>
                    ) : topWorst.worst.map(({ acc, m }) => (
                      <tr key={acc.id}>
                        <td>{acc.account_id || "—"}</td>
                        <td>{acc.company || "—"}</td>
                        <td className={m.roi >= 0 ? "positive" : "negative"}>{m.roi.toFixed(1)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="grid-2" style={{ marginTop: 30 }}>
            <div>
              <h2 className="section-title" style={{ marginTop: 0 }}>{a.byCompanyTitle}</h2>
              <div className="accounts-table-wrap">
                <table className="accounts-table">
                  <thead>
                    <tr>
                      <th>{a.colCompany}</th>
                      <th>{a.colId}s</th>
                      <th>{a.kpiInvested}</th>
                      <th>{a.kpiWithdrawn}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {breakdown.byCompany.map((row) => (
                      <tr key={row.name}>
                        <td>{row.name}</td>
                        <td>{row.cuentas}</td>
                        <td>{fmtMoney(row.invertido)}</td>
                        <td>{fmtMoney(row.retirado)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div>
              <h2 className="section-title" style={{ marginTop: 0 }}>{a.byMethodTitle}</h2>
              <div className="accounts-table-wrap">
                <table className="accounts-table">
                  <thead>
                    <tr>
                      <th>{a.fieldMethod}</th>
                      <th>{a.colId}s</th>
                      <th>{a.kpiInvested}</th>
                      <th>{a.kpiWithdrawn}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {breakdown.byMethod.map((row) => (
                      <tr key={row.name}>
                        <td>{row.name}</td>
                        <td>{row.cuentas}</td>
                        <td>{fmtMoney(row.invertido)}</td>
                        <td>{fmtMoney(row.retirado)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {activeWd.length > 0 && (
            <>
              <h2 className="section-title">{a.activeWithdrawalsTitle}</h2>
              <p className="sub" style={{ textAlign: "left", marginBottom: 14 }}>{a.activeWithdrawalsSub}</p>
              <div className="accounts-table-wrap">
                <table className="accounts-table">
                  <thead>
                    <tr>
                      <th>{a.colId}</th>
                      <th>{a.colCompany}</th>
                      <th>{a.colWithdrawalsCount}</th>
                      <th>{a.kpiWithdrawn}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeWd.map(({ acc, wdCount, wdTotal }) => (
                      <tr key={acc.id}>
                        <td>{acc.account_id || "—"}</td>
                        <td>{acc.company || "—"}</td>
                        <td>{wdCount}</td>
                        <td>{fmtMoney(wdTotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {burnedNoWd.length > 0 && (
            <>
              <h2 className="section-title">{a.burnedNoWithdrawalTitle}</h2>
              <div className="accounts-table-wrap">
                <table className="accounts-table">
                  <thead>
                    <tr>
                      <th>{a.colId}</th>
                      <th>{a.colCompany}</th>
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
                          <td>{acc.passed_date || "—"}</td>
                          <td>{acc.burned_date || "—"}</td>
                          <td className="negative">{fmtMoney(m.invested)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {banned.length > 0 && (
            <>
              <h2 className="section-title">{a.bannedTitle}</h2>
              <div className="accounts-table-wrap">
                <table className="accounts-table">
                  <thead>
                    <tr>
                      <th>{a.colId}</th>
                      <th>{a.colCompany}</th>
                      <th>{a.colBanDate}</th>
                      <th>{a.colBanReason}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {banned.map((acc) => (
                      <tr key={acc.id}>
                        <td>{acc.account_id || "—"}</td>
                        <td>{acc.company || "—"}</td>
                        <td>{acc.ban_date || "—"}</td>
                        <td>{acc.ban_reason || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          <h2 className="section-title">{al.title}</h2>
          <div className="card">
            {alerts.length === 0 ? (
              <div className="empty-state">{al.none}</div>
            ) : (
              <div className="alerts-list">
                {alerts.map((alert, i) => (
                  <div className="alert-item" key={i}>
                    <span className={`alert-dot ${alert.type}`} />
                    <span>{renderAlert(dict, alert)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      <SiteFooter />
    </div>
  );
}
