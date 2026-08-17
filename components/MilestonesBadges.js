"use client";

export default function MilestonesBadges({ badges, lang, dict }) {
  const d = dict.dashboard;

  if (!badges || badges.length === 0) {
    return <div className="empty-state">{d.milestonesEmpty}</div>;
  }

  return (
    <div className="badges-strip">
      {badges.map((b) => (
        <div className="badge-pill" key={b.key} title={lang === "en" ? b.en : b.es}>
          <span className="badge-pill-icon">{b.icon}</span>
          <span className="badge-pill-label">{lang === "en" ? b.en : b.es}</span>
        </div>
      ))}
    </div>
  );
}
