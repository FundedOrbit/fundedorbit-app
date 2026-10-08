"use client";

import { useLanguage } from "./LanguageProvider";

// Ejemplo estático: 30 días, 18 en verde (60% de cumplimiento) y 12 en rojo.
const RED_DAYS = [2, 5, 8, 10, 13, 16, 19, 21, 24, 26, 28, 30];
const START_OFFSET = 2; // el mes de ejemplo empieza en miércoles

export default function CalendarPreview() {
  const { dict } = useLanguage();
  const c = dict.compliance;
  const h = dict.hero;
  const cells = [];
  for (let i = 0; i < START_OFFSET; i++) cells.push(null);
  for (let d = 1; d <= 30; d++) cells.push(d);

  return (
    <div className="preview-frame preview-cal">
      <div className="preview-titlebar">
        <span className="preview-dot" style={{ background: "#fb7185" }} />
        <span className="preview-dot" style={{ background: "#fbbf24" }} />
        <span className="preview-dot" style={{ background: "#34d399" }} />
        <span className="preview-badge">{h.previewBadge}</span>
      </div>
      <div className="preview-body">
        <div className="preview-cal-head">
          <span>{c.tab}</span>
          <span className="preview-cal-pct">60%</span>
        </div>
        <div className="preview-cal-grid">
          {c.weekdays.map((w) => (<div className="preview-cal-wd" key={w}>{w}</div>))}
          {cells.map((d, i) =>
            d === null ? (
              <div key={`e${i}`} />
            ) : (
              <div className={`preview-cal-cell ${RED_DAYS.includes(d) ? "bad" : "ok"}`} key={d}>
                <span>{d}</span>
                <i className={`preview-cal-dot ${RED_DAYS.includes(d) ? "neg" : "pos"}`} />
              </div>
            )
          )}
        </div>
        <div className="preview-cal-legend">
          <span><i className="cal-dot ok" /> {c.legendFollowed}</span>
          <span><i className="cal-dot bad" /> {c.legendBroke}</span>
        </div>
      </div>
    </div>
  );
}
