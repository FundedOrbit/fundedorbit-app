import { supabase } from "./supabaseClient";
import { computeMonthly } from "./accountsClient";
import { generateInsights, evaluateMilestones, buildMilestoneEvents, MILESTONE_CATALOG } from "./insightsEngine";

async function fetchMilestoneKeys(userId) {
  const { data, error } = await supabase.from("milestones").select("key").eq("user_id", userId);
  if (error) throw error;
  return new Set((data || []).map((r) => r.key));
}

async function unlockMilestones(userId, keys) {
  if (!keys.length) return;
  const rows = keys.map((key) => ({ user_id: userId, key }));
  const { error } = await supabase.from("milestones").upsert(rows, { onConflict: "user_id,key", ignoreDuplicates: true });
  if (error) throw error;
}

async function fetchShownEventKeys(userId) {
  const { data, error } = await supabase.from("insight_log").select("insight_key").eq("user_id", userId);
  if (error) throw error;
  return new Set((data || []).map((r) => r.insight_key));
}

async function logShownEvents(userId, keys) {
  if (!keys.length) return;
  const rows = keys.map((key) => ({ user_id: userId, insight_key: key, last_shown_at: new Date().toISOString() }));
  const { error } = await supabase.from("insight_log").upsert(rows, { onConflict: "user_id,insight_key" });
  if (error) throw error;
}

/**
 * Orquesta el motor de insights completo para un usuario:
 * - evalúa hitos contra el catálogo y persiste los nuevos en `milestones`
 * - genera los insights (comparaciones, tendencias, riesgos, oportunidades)
 * - filtra los insights tipo "evento" que ya se mostraron antes (usa `insight_log`)
 * - registra como mostrados los eventos nuevos que se van a desplegar ahora
 *
 * Si algo falla en la persistencia (p.ej. las tablas aún no existen en Supabase),
 * no rompe el dashboard: regresa los insights calculados en memoria sin persistir.
 */
export async function syncInsights(userId, allAccounts, lang) {
  const monthly = computeMonthly(allAccounts);
  const evaluated = evaluateMilestones(allAccounts, monthly);
  const rawInsights = generateInsights(allAccounts, { lang });

  let persistedKeys = new Set();
  let newlyUnlocked = [];
  let persistenceOk = true;

  try {
    persistedKeys = await fetchMilestoneKeys(userId);
    newlyUnlocked = evaluated.filter((m) => m.unlocked && !persistedKeys.has(m.key)).map((m) => m.key);
    if (newlyUnlocked.length) await unlockMilestones(userId, newlyUnlocked);
  } catch (e) {
    persistenceOk = false;
  }

  const allUnlockedKeys = new Set([...persistedKeys, ...newlyUnlocked]);
  const badges = persistenceOk
    ? MILESTONE_CATALOG.filter((m) => allUnlockedKeys.has(m.key))
    : evaluated.filter((m) => m.unlocked);

  const milestoneEvents = buildMilestoneEvents(newlyUnlocked, lang);
  let combined = [...milestoneEvents, ...rawInsights].sort((a, b) => b.priority - a.priority);

  if (persistenceOk) {
    try {
      const eventKeys = combined.filter((i) => i.behavior === "event").map((i) => i.key);
      const shownKeys = eventKeys.length ? await fetchShownEventKeys(userId) : new Set();
      const visible = combined.filter((i) => i.behavior !== "event" || !shownKeys.has(i.key));
      const toLog = visible.filter((i) => i.behavior === "event").map((i) => i.key);
      if (toLog.length) await logShownEvents(userId, toLog);
      combined = visible;
    } catch (e) {
      // si el log de eventos falla, seguimos mostrando todo sin cooldown persistido
    }
  }

  return { insights: combined.slice(0, 10), badges };
}
