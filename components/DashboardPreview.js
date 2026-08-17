"use client";

import { useLanguage } from "./LanguageProvider";
import LineChartSVG from "./LineChartSVG";

const SAMPLE_SERIES = [
  { date: "1", value: 1080 },
  { date: "2", value: 2520 },
  { date: "3", value: 4050 },
  { date: "4", value: 5600 },
  { date: "5", value: 7500 },
  { date: "6", value: 8900 },
  { date: "7", value: 10850 },
  { date: "8", value: 12680 },
];

export default function DashboardPreview() {
  const { dict } = useLanguage();
  const a = dict.accounts;
  const d = dict.hero;

  return (
    <div className="preview-frame">
      <div className="preview-titlebar">
        <span className="preview-dot" style={{ background: "#fb7185" }} />
        <span className="preview-dot" style={{ background: "#fbbf24" }} />
        <span className="preview-dot" style={{ background: "#34d399" }} />
        <span className="preview-badge">{d.previewBadge}</span>
      </div>
      <div className="preview-body">
        <div className="kpi-mini-grid preview-kpis">
          <div className="kpi-card">
            <div className="label">{a.kpiInvested}</div>
            <div className="value">$1,500.00</div>
            <div className="sub">12 {a.title.toLowerCase()}</div>
          </div>
          <div className="kpi-card positive">
            <div className="label">{a.kpiWithdrawn}</div>
            <div className="value">$14,180.00</div>
            <div className="sub">{a.kpiWithdrawnSub}</div>
          </div>
          <div className="kpi-card positive">
            <div className="label">{a.kpiNet}</div>
            <div className="value">$12,680.00</div>
            <div className="sub">↑ 845.3%</div>
          </div>
          <div className="kpi-card positive">
            <div className="label">{a.kpiRoi}</div>
            <div className="value">+845.3%</div>
            <div className="sub">{a.kpiRoiSub}</div>
          </div>
          <div className="kpi-card positive">
            <div className="label">{a.kpiApprovalRate}</div>
            <div className="value">91.7%</div>
            <div className="sub">11 / 12</div>
          </div>
          <div className="kpi-card">
            <div className="label">{a.kpiAvgCostPerAccount}</div>
            <div className="value">$125.00</div>
            <div className="sub">{a.kpiAvgCostPerAccountSub}</div>
          </div>
          <div className="kpi-card">
            <div className="label">{a.kpiAvgWithdrawal}</div>
            <div className="value">$2,836.00</div>
            <div className="sub">{a.kpiAvgWithdrawalSub}</div>
          </div>
          <div className="kpi-card">
            <div className="label">{a.kpiResetsSpent}</div>
            <div className="value">$150.00</div>
            <div className="sub">2 {a.resetsTitle.toLowerCase()}</div>
          </div>
        </div>

        <div className="section-title" style={{ fontSize: 12.5, marginBottom: 10 }}>
          {dict.alerts.title}
        </div>
        <div className="alerts-list preview-alerts">
          <div className="alert-item">
            <span className="alert-dot warn" />
            <span>{d.previewAlert1}</span>
          </div>
          <div className="alert-item">
            <span className="alert-dot info" />
            <span>{d.previewAlert2}</span>
          </div>
        </div>

        <div className="chart-card preview-chart">
          <h3>{dict.dashboard.chartPnl}</h3>
          <LineChartSVG series={SAMPLE_SERIES} color="#34d399" />
        </div>
      </div>
    </div>
  );
}
