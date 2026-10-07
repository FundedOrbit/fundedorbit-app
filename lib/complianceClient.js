import { supabase } from "./supabaseClient";

export const MOODS = [
  { key: "calm", emoji: "😌" },
  { key: "confident", emoji: "😎" },
  { key: "euphoric", emoji: "🤩" },
  { key: "anxious", emoji: "😰" },
  { key: "frustrated", emoji: "😤" },
  { key: "tired", emoji: "😴" },
];

export function isoFromParts(y, m, d) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}
export function todayLocalISO() {
  const n = new Date();
  return isoFromParts(n.getFullYear(), n.getMonth(), n.getDate());
}

/* ---------- Supabase ---------- */
export async function fetchRules(userId) {
  const { data, error } = await supabase
    .from("compliance_rules")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data || [];
}
export async function addRule(userId, name) {
  const { data, error } = await supabase
    .from("compliance_rules")
    .insert({ user_id: userId, name })
    .select()
    .single();
  if (error) throw error;
  return data;
}
export async function deleteRule(id) {
  const { error } = await supabase.from("compliance_rules").delete().eq("id", id);
  if (error) throw error;
}
export async function fetchDays(userId) {
  const { data, error } = await supabase
    .from("compliance_days")
    .select("*")
    .eq("user_id", userId)
    .order("day", { ascending: true });
  if (error) throw error;
  return data || [];
}
export async function saveDay(userId, payload) {
  const { data, error } = await supabase
    .from("compliance_days")
    .upsert(
      { user_id: userId, ...payload, updated_at: new Date().toISOString() },
      { onConflict: "user_id,day" }
    )
    .select()
    .single();
  if (error) throw error;
  return data;
}
export async function updateDayBrokenRules(id, brokenRules) {
  const { data, error } = await supabase
    .from("compliance_days")
    .update({ broken_rules: brokenRules, followed_plan: brokenRules.length === 0 })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}
export async function insertRules(userId, names) {
  if (!names.length) return;
  const base = Date.now();
  const rows = names.map((name, i) => ({
    user_id: userId,
    name,
    created_at: new Date(base + i * 5).toISOString(),
  }));
  const { error } = await supabase.from("compliance_rules").insert(rows);
  if (error) throw error;
}
export async function deleteDay(id) {
  const { error } = await supabase.from("compliance_days").delete().eq("id", id);
  if (error) throw error;
}

/* ---------- periodos ---------- */
export function getPeriodRange(preset, customFrom, customTo) {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  if (preset === "month") {
    const last = new Date(y, m + 1, 0).getDate();
    return { from: isoFromParts(y, m, 1), to: isoFromParts(y, m, last) };
  }
  if (preset === "custom") return { from: customFrom || null, to: customTo || null };
  // semana actual (lunes a domingo)
  const dow = (now.getDay() + 6) % 7;
  const start = new Date(y, m, now.getDate() - dow);
  const end = new Date(y, m, now.getDate() - dow + 6);
  return {
    from: isoFromParts(start.getFullYear(), start.getMonth(), start.getDate()),
    to: isoFromParts(end.getFullYear(), end.getMonth(), end.getDate()),
  };
}

/* ---------- aprendizajes ---------- */
function majority(pos, neg, be) {
  if (pos + neg + be === 0) return null;
  const max = Math.max(pos, neg, be);
  const winners = [pos === max, neg === max, be === max].filter(Boolean).length;
  if (winners > 1) return "tie";
  if (pos === max) return "positive";
  if (neg === max) return "negative";
  return "breakeven";
}

export function computeLearnings(days, range) {
  const list = days.filter((d) => {
    if (range.from && d.day < range.from) return false;
    if (range.to && d.day > range.to) return false;
    return true;
  });
  const total = list.length;
  const followed = list.filter((d) => d.followed_plan);
  const broke = list.filter((d) => !d.followed_plan);
  const cnt = (arr, r) => arr.filter((d) => d.result === r).length;
  const pos = cnt(list, "positive");
  const neg = cnt(list, "negative");
  const be = cnt(list, "breakeven");
  const fPos = cnt(followed, "positive");
  const fNeg = cnt(followed, "negative");
  const fBe = cnt(followed, "breakeven");
  const bPos = cnt(broke, "positive");
  const bNeg = cnt(broke, "negative");
  const bBe = cnt(broke, "breakeven");

  const moodCount = {};
  list.forEach((d) => {
    if (d.mood) moodCount[d.mood] = (moodCount[d.mood] || 0) + 1;
  });
  const moods = Object.entries(moodCount)
    .map(([mood, count]) => ({ mood, count, pct: (count / total) * 100 }))
    .sort((a, b) => b.count - a.count);

  const ruleCount = {};
  list.forEach((d) => {
    (Array.isArray(d.broken_rules) ? d.broken_rules : []).forEach((r) => {
      ruleCount[r] = (ruleCount[r] || 0) + 1;
    });
  });
  const topRules = Object.entries(ruleCount)
    .map(([rule, count]) => ({ rule, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return {
    total,
    followedCount: followed.length,
    brokeCount: broke.length,
    compliancePct: total ? (followed.length / total) * 100 : 0,
    pos,
    neg,
    be,
    followedPos: fPos,
    followedNeg: fNeg,
    followedBe: fBe,
    followedTotal: followed.length,
    brokePos: bPos,
    brokeNeg: bNeg,
    brokeBe: bBe,
    brokeTotal: broke.length,
    followedMajority: majority(fPos, fNeg, fBe),
    brokeMajority: majority(bPos, bNeg, bBe),
    moods,
    topRules,
  };
}
