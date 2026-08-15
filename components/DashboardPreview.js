"use client";

import { useLanguage } from "./LanguageProvider";
import LineChartSVG from "./LineChartSVG";

const SAMPLE_SERIES = [
  { date: "1", value: 4200 },
  { date: "2", value: 9800 },
  { date: "3", value: 15600 },
  { date: "4", value: 21400 },
  { date: "5", value: 28900 },
  { date: "6", value: 34200 },
  { date: "7", value: 41800 },
  { date: "8", value: 48640 },
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
            <div className="value">$286,420.00</div>
            <div className="sub">12 {a.title.toLowerCase()}</div>
          </div>
          <div className="kpi-card positive">
            <div className="label">{a.kpiNet}</div>
            <div className="value">$48,640.75</div>
            <div className="sub">↑ 66.3%</div>
          </div>
          <div className="kpi-card positive">
            <div className="label">{a.kpiRoi}</div>
            <div className="value">+25.47%</div>
            <div className="sub">{a.kpiRoiSub}</div>
          </div>
          <div className="kpi-card positive">
            <div className="label">{a.kpiApprovalRate}</div>
            <div className="value">94.1%</div>
            <div className="sub">16 / 17</div>
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
