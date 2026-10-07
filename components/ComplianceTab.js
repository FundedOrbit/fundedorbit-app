"use client";

import { useEffect, useMemo, useState } from "react";
import { useLanguage } from "./LanguageProvider";
import {
  MOODS,
  isoFromParts,
  todayLocalISO,
  fetchRules,
  insertRules,
  deleteRule,
  updateDayBrokenRules,
  fetchDays,
  saveDay,
  deleteDay,
  getPeriodRange,
  computeLearnings,
} from "../lib/complianceClient";

function fillText(tpl, vars) {
  return Object.entries(vars).reduce((t, [k, v]) => t.replace(`{${k}}`, v), tpl);
}

function majorityText(c, maj, pos, neg, be, total) {
  if (!maj) return c.majNone;
  if (maj === "positive") return fillText(c.majPositive, { a: pos, t: total });
  if (maj === "negative") return fillText(c.majNegative, { a: neg, t: total });
  if (maj === "breakeven") return fillText(c.majBreakeven, { a: be, t: total });
  return c.majTie;
}

export default function ComplianceTab({ userId }) {
  const { dict } = useLanguage();
  const c = dict.compliance;

  const [rules, setRules] = useState([]);
  const [days, setDays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const [preset, setPreset] = useState("week");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [selectedDay, setSelectedDay] = useState(null);
  const [showRules, setShowRules] = useState(false);

  useEffect(() => {
    if (!userId) return;
    let alive = true;
    (async () => {
      try {
        const [r, d] = await Promise.all([fetchRules(userId), fetchDays(userId)]);
        if (!alive) return;
        setRules(r);
        setDays(d);
      } catch (e) {
        console.error("compliance load error", e);
        if (alive) setLoadError(true);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [userId]);

  const range = useMemo(() => getPeriodRange(preset, customFrom, customTo), [preset, customFrom, customTo]);
  const learnings = useMemo(() => computeLearnings(days, range), [days, range]);
  const dayMap = useMemo(() => {
    const m = {};
    days.forEach((d) => {
      m[d.day] = d;
    });
    return m;
  }, [days]);

  function goMonth(delta) {
    const d = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
  }

  function handleSaved(row) {
    setDays((prev) => [...prev.filter((x) => x.day !== row.day), row].sort((a, b) => a.day.localeCompare(b.day)));
    setSelectedDay(null);
  }
  function handleRulesSaved(newRules, updatedDays) {
    setRules(newRules);
    if (updatedDays.length) {
      setDays((prev) => prev.map((d) => updatedDays.find((u) => u.id === d.id) || d));
    }
  }
  function handleDeleted(id) {
    setDays((prev) => prev.filter((x) => x.id !== id));
    setSelectedDay(null);
  }

  // cuadrícula del mes (semana empieza en lunes)
  const firstDow = (new Date(viewYear, viewMonth, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  const today = todayLocalISO();
  const yearOptions = [];
  for (let y = now.getFullYear() - 3; y <= now.getFullYear() + 1; y++) yearOptions.push(y);

  const periodChips = [
    ["week", c.periodWeek],
    ["month", c.periodMonth],
    ["custom", c.periodCustom],
  ];

  if (loading) return <div className="empty-state">…</div>;

  return (
    <div className="compliance-wrap">
      {loadError && (
        <div className="msg err" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <span>{c.errLoad}</span>
          <button type="button" className="btn btn-ghost" onClick={() => window.location.reload()}>{c.reload}</button>
        </div>
      )}

      <div className="card compliance-intro">
        <h3>{c.introTitle}</h3>
        <p className="sub" style={{ margin: 0 }}>{c.introBody}</p>
      </div>

      <h2 className="section-title">{c.learningsTitle}</h2>
      <div className="filter-bar">
        {periodChips.map(([key, label]) => (
          <button key={key} type="button" className={`chip ${preset === key ? "active" : ""}`} onClick={() => setPreset(key)}>
            {label}
          </button>
        ))}
        {preset === "custom" && (
          <span style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{c.from}</span>
            <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} />
            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{c.to}</span>
            <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} />
          </span>
        )}
      </div>

      {learnings.total === 0 ? (
        <div className="card"><div className="empty-state">{c.noData}</div></div>
      ) : (
        <>
          <div className="kpi-mini-grid">
            <div className="kpi-card">
              <div className="label">{c.compliance}</div>
              <div className="value" style={{ color: learnings.compliancePct >= 70 ? "var(--success)" : learnings.compliancePct >= 40 ? "var(--warning)" : "var(--danger)" }}>
                {learnings.compliancePct.toFixed(0)}%
              </div>
              <div className="sub">{fillText(c.complianceSub, { f: learnings.followedCount, t: learnings.total })}</div>
            </div>
            <div className="kpi-card">
              <div className="label">{c.results}</div>
              <div className="value">{learnings.total} <span className="value-sep" style={{ fontSize: 14 }}>{c.daysLogged.toLowerCase()}</span></div>
              <div className="sub">{fillText(c.resultsSub, { p: learnings.pos, b: learnings.be, n: learnings.neg })}</div>
            </div>
            <div className="kpi-card">
              <div className="label">{c.whenFollow}</div>
              <div className={`value cmp-maj ${learnings.followedMajority || ""}`}>
                {majorityText(c, learnings.followedMajority, learnings.followedPos, learnings.followedNeg, learnings.followedBe, learnings.followedTotal)}
              </div>
            </div>
            <div className="kpi-card">
              <div className="label">{c.whenBreak}</div>
              <div className={`value cmp-maj ${learnings.brokeMajority || ""}`}>
                {majorityText(c, learnings.brokeMajority, learnings.brokePos, learnings.brokeNeg, learnings.brokeBe, learnings.brokeTotal)}
              </div>
            </div>
          </div>

          <div className="charts-grid" style={{ marginTop: 18 }}>
            <div className="card">
              <h3>{c.moodsTitle}</h3>
              {learnings.moods.length === 0 ? (
                <div className="empty-state">—</div>
              ) : (
                <div className="cmp-bars">
                  {learnings.moods.map((m) => {
                    const def = MOODS.find((x) => x.key === m.mood);
                    return (
                      <div className="cmp-bar-row" key={m.mood}>
                        <span className="cmp-bar-label">{def ? def.emoji : ""} {c.moods[m.mood] || m.mood}</span>
                        <div className="cmp-bar-track"><div className="cmp-bar-fill" style={{ width: `${m.pct}%` }} /></div>
                        <span className="cmp-bar-val">{m.count}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="card">
              <h3>{c.topRulesTitle}</h3>
              {learnings.topRules.length === 0 ? (
                <div className="empty-state">{c.topRulesEmpty}</div>
              ) : (
                <div className="cmp-bars">
                  {learnings.topRules.map((r) => (
                    <div className="cmp-bar-row" key={r.rule}>
                      <span className="cmp-bar-label">{r.rule}</span>
                      <div className="cmp-bar-track"><div className="cmp-bar-fill bad" style={{ width: `${(r.count / learnings.topRules[0].count) * 100}%` }} /></div>
                      <span className="cmp-bar-val">{fillText(c.timesN, { n: r.count })}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap", marginTop: 30 }}>
        <h2 className="section-title" style={{ margin: 0 }}>{c.calendarTitle}</h2>
        <button type="button" className="btn btn-ghost" onClick={() => setShowRules(true)}>⚙ {c.editRules}</button>
      </div>
      <div style={{ height: 12 }} />
      <div className="card">
        <div className="cal-nav">
          <button type="button" className="btn btn-ghost" onClick={() => goMonth(-1)} aria-label={c.prev}>‹</button>
          <div className="cal-selects">
            <select value={viewMonth} onChange={(e) => setViewMonth(Number(e.target.value))}>
              {c.months.map((m, i) => (<option key={i} value={i}>{m}</option>))}
            </select>
            <select value={viewYear} onChange={(e) => setViewYear(Number(e.target.value))}>
              {yearOptions.map((y) => (<option key={y} value={y}>{y}</option>))}
            </select>
          </div>
          <button type="button" className="btn btn-ghost" onClick={() => goMonth(1)} aria-label={c.next}>›</button>
        </div>

        <div className="cal-grid">
          {c.weekdays.map((w) => (<div className="cal-head" key={w}>{w}</div>))}
          {cells.map((d, i) => {
            if (d === null) return <div className="cal-cell empty" key={`e${i}`} />;
            const iso = isoFromParts(viewYear, viewMonth, d);
            const rec = dayMap[iso];
            const future = iso > today;
            const cls = ["cal-cell"];
            if (rec) cls.push(rec.followed_plan ? "ok" : "bad");
            if (iso === today) cls.push("today");
            if (future) cls.push("future");
            return (
              <button
                type="button"
                key={iso}
                className={cls.join(" ")}
                disabled={future}
                onClick={() => setSelectedDay(iso)}
              >
                <span className="cal-num">{d}</span>
                {rec ? (
                  <span className={`cal-sticker cal-dot-result ${rec.result === "positive" ? "pos" : rec.result === "breakeven" ? "be" : "neg"}`} />
                ) : (
                  !future && (
                    <span className="cal-add">
                      <span className="cal-add-full">+ {c.addRecord}</span>
                      <span className="cal-add-short">+</span>
                    </span>
                  )
                )}
              </button>
            );
          })}
        </div>

        <div className="cal-legend">
          <span><i className="cal-dot ok" /> {c.legendFollowed}</span>
          <span><i className="cal-dot bad" /> {c.legendBroke}</span>
          <span><i className="cal-circle pos" /> {c.legendPositive}</span>
          <span><i className="cal-circle be" /> {c.legendBreakeven}</span>
          <span><i className="cal-circle neg" /> {c.legendNegative}</span>
        </div>
      </div>

      {showRules && (
        <RulesModal
          userId={userId}
          rules={rules}
          days={days}
          onClose={() => setShowRules(false)}
          onSaved={handleRulesSaved}
        />
      )}

      {selectedDay && (
        <DayModal
          userId={userId}
          day={selectedDay}
          record={dayMap[selectedDay]}
          rules={rules}
          days={days}
          onRulesSaved={handleRulesSaved}
          onClose={() => setSelectedDay(null)}
          onSaved={handleSaved}
          onDeleted={handleDeleted}
        />
      )}
    </div>
  );
}

function DayModal({ userId, day, record, rules, days, onRulesSaved, onClose, onSaved, onDeleted }) {
  const { dict } = useLanguage();
  const c = dict.compliance;
  const [broken, setBroken] = useState(Array.isArray(record?.broken_rules) ? record.broken_rules : []);
  const [result, setResult] = useState(record?.result || "");
  const [mood, setMood] = useState(record?.mood || "");
  const [note, setNote] = useState(record?.note || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function toggleRule(name) {
    setBroken((b) => (b.includes(name) ? b.filter((x) => x !== name) : [...b, name]));
  }

  const [showRules, setShowRules] = useState(false);
  function handleRulesSaved(newRules, updatedDays, renames) {
    onRulesSaved(newRules, updatedDays);
    if (renames && Object.keys(renames).length) {
      setBroken((b) => b.map((n) => renames[n] || n));
    }
  }

  async function handleSave() {
    setError("");
    if (!result) {
      setError(c.errResult);
      return;
    }
    setSaving(true);
    try {
      const row = await saveDay(userId, {
        day,
        followed_plan: broken.length === 0,
        result,
        mood: mood || null,
        note: note.trim() || null,
        broken_rules: broken,
      });
      onSaved(row);
    } catch (e) {
      setSaving(false);
      setError(e.message || String(e));
    }
  }
  async function handleDelete() {
    setSaving(true);
    try {
      await deleteDay(record.id);
      onDeleted(record.id);
    } catch (e) {
      setSaving(false);
      setError(e.message || String(e));
    }
  }

  // reglas rotas ese día que ya no están en la lista (se conservan en el historial)
  const orphanBroken = broken.filter((name) => !rules.some((r) => r.name === name));

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-card form-modal-card">
        <button className="modal-close" onClick={onClose} type="button">✕</button>
        <h2 style={{ marginTop: 0 }}>{c.modalTitle} · {day}</h2>
        {error && <div className="msg err">{error}</div>}

        <div className="section-label" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
          <span>{c.followedQ}</span>
          <button type="button" className="text-link" onClick={() => setShowRules(true)}>
            {rules.length === 0 ? c.addRulesBtn : `⚙ ${c.editRules}`}
          </button>
        </div>
        {rules.length === 0 && orphanBroken.length === 0 ? (
          <p className="sub">{c.noRules}</p>
        ) : (
          <p className="sub" style={{ marginTop: 0 }}>{c.rulesHelp}</p>
        )}
        <div className="cmp-rule-list">
          {rules.map((r) => (
            <div className={`cmp-rule ${broken.includes(r.name) ? "broken" : ""}`} key={r.id}>
              <label>
                <input type="checkbox" checked={broken.includes(r.name)} onChange={() => toggleRule(r.name)} />
                <span>{r.name}</span>
              </label>
            </div>
          ))}
          {orphanBroken.map((name) => (
            <div className="cmp-rule broken" key={`o-${name}`}>
              <label>
                <input type="checkbox" checked onChange={() => toggleRule(name)} />
                <span>{name}</span>
              </label>
            </div>
          ))}
        </div>

        <div className="section-label">{c.resultQ}</div>
        <div className="cmp-choice">
          <button type="button" className={`cmp-choice-btn pos ${result === "positive" ? "active" : ""}`} onClick={() => setResult("positive")}><i className="cal-circle pos" /> {c.positive}</button>
          <button type="button" className={`cmp-choice-btn be ${result === "breakeven" ? "active" : ""}`} onClick={() => setResult("breakeven")}><i className="cal-circle be" /> {c.breakeven}</button>
          <button type="button" className={`cmp-choice-btn neg ${result === "negative" ? "active" : ""}`} onClick={() => setResult("negative")}><i className="cal-circle neg" /> {c.negative}</button>
        </div>

        <div className="section-label">{c.moodQ}</div>
        <div className="cmp-moods">
          {MOODS.map((m) => (
            <button type="button" key={m.key} className={`cmp-mood ${mood === m.key ? "active" : ""}`} onClick={() => setMood(mood === m.key ? "" : m.key)}>
              <span className="cmp-mood-emoji">{m.emoji}</span>
              <span>{c.moods[m.key]}</span>
            </button>
          ))}
        </div>

        <div className="field" style={{ marginTop: 14 }}>
          <label>{c.noteLabel}</label>
          <textarea rows={3} value={note} placeholder={c.notePlaceholder} onChange={(e) => setNote(e.target.value)} />
        </div>

        <div style={{ display: "flex", gap: 10, justifyContent: "space-between", marginTop: 10, flexWrap: "wrap" }}>
          {record ? (
            <button type="button" className="btn btn-ghost" onClick={handleDelete} disabled={saving}>{c.delete}</button>
          ) : <span />}
          <button type="button" className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? c.saving : c.save}
          </button>
        </div>
      </div>
      {showRules && (
        <RulesModal
          userId={userId}
          rules={rules}
          days={days}
          onClose={() => setShowRules(false)}
          onSaved={handleRulesSaved}
        />
      )}
    </div>
  );
}

function RulesModal({ userId, rules, days, onClose, onSaved }) {
  const { dict } = useLanguage();
  const c = dict.compliance;
  const [items, setItems] = useState(
    rules.length ? rules.map((r) => ({ id: r.id, name: r.name, original: r.name })) : [{ id: null, name: "", original: "" }]
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function updateItem(i, name) {
    setItems((list) => list.map((it, idx) => (idx === i ? { ...it, name } : it)));
  }
  function addItem() {
    setItems((list) => [...list, { id: null, name: "", original: "" }]);
  }
  function removeItem(i) {
    setItems((list) => list.filter((_, idx) => idx !== i));
  }

  async function handleSave() {
    setError("");
    const cleaned = items.map((it) => ({ ...it, name: it.name.trim() })).filter((it) => it.name);
    const lower = cleaned.map((it) => it.name.toLowerCase());
    if (new Set(lower).size !== lower.length) {
      setError(c.errDuplicateRule);
      return;
    }
    setSaving(true);
    try {
      const keptIds = new Set(cleaned.filter((it) => it.id).map((it) => it.id));
      const removed = rules.filter((r) => !keptIds.has(r.id));
      const renamed = cleaned.filter((it) => it.id && it.name !== it.original);
      const added = cleaned.filter((it) => !it.id);

      // quitadas y renombradas se borran; renombradas y nuevas se vuelven a insertar
      const toDelete = [...removed.map((r) => r.id), ...renamed.map((it) => it.id)];
      for (const id of toDelete) await deleteRule(id);
      await insertRules(userId, [...renamed.map((it) => it.name), ...added.map((it) => it.name)]);

      // si renombró una regla, actualizamos el historial para que siga contando igual
      const renames = {};
      renamed.forEach((it) => { renames[it.original] = it.name; });
      const updatedDays = [];
      for (const d of days) {
        const br = Array.isArray(d.broken_rules) ? d.broken_rules : [];
        if (br.some((n) => renames[n])) {
          const next = br.map((n) => renames[n] || n);
          updatedDays.push(await updateDayBrokenRules(d.id, next));
        }
      }

      const fresh = await fetchRules(userId);
      onSaved(fresh, updatedDays, renames);
      onClose();
    } catch (e) {
      setSaving(false);
      setError(e.message || String(e));
    }
  }

  return (
    <div className="modal-overlay rules-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-card form-modal-card">
        <button className="modal-close" onClick={onClose} type="button">✕</button>
        <h2 style={{ marginTop: 0 }}>{c.rulesModalTitle}</h2>
        <p className="sub" style={{ marginTop: 0 }}>{c.rulesModalHelp}</p>
        {error && <div className="msg err">{error}</div>}

        {items.map((it, i) => (
          <div className="dyn-block" key={i}>
            <button type="button" className="dyn-remove" onClick={() => removeItem(i)}>✕</button>
            <div className="field" style={{ marginBottom: 0, paddingRight: 28 }}>
              <input
                value={it.name}
                placeholder={c.ruleInputPlaceholder}
                onChange={(e) => updateItem(i, e.target.value)}
              />
            </div>
          </div>
        ))}
        <button type="button" className="add-row-btn" onClick={addItem}>{c.addRuleRow}</button>

        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 14 }}>
          <button type="button" className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? c.saving : c.saveRules}
          </button>
        </div>
      </div>
    </div>
  );
}
