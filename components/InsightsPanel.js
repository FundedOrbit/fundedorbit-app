"use client";

const TYPE_ORDER = ["warning", "attention", "success", "opportunity", "insight"];

export default function InsightsPanel({ insights, dict }) {
  const al = dict.alerts;

  if (!insights || insights.length === 0) {
    return <div className="empty-state">{al.none}</div>;
  }

  return (
    <div className="alerts-list insights-list">
      {insights.map((ins) => (
        <div className="alert-item" key={ins.key}>
          <span className={`alert-dot ${ins.type}`} />
          <span>{ins.title}</span>
        </div>
      ))}
    </div>
  );
}

export { TYPE_ORDER };
