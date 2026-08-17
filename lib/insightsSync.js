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
 * Snapshot de "qué ya se había mostrado/desbloqueado ANTES de esta sesión",
 * cacheado en memoria por usuario. Se congela la primera vez que se lee y no
 * se vuelve a tocar durante la sesión — así, si el usuario cambia de idioma
 * (o el efecto se re-ejecuta por cualquier otra razón) los insights tipo
 * "evento" que ya se mostraron en esta misma visita NO desaparecen. Solo se
 * excluyen en la SIGUIENTE sesión/recarga, cuando el snapshot se vuelve a
 * pedir desde cero.
 */
const sessionCache = new Map(); // userId -> { priorMilestoneKeys: Set, priorEventKeys: Set }

function getSessionCache(userId) {
  if (!sessionCache.has(userId)) {
    sessionCache.set(userId, { priorMilestoneKeys: null, priorEventKeys: null });
  }
  return sessionCache.get(userId);
}

/**
 * Orquesta el motor de insights completo para un usuario:
 * - evalúa hitos contra el catálogo y persiste los nuevos en `milestones`
 * - genera los insights (comparaciones, tendencias, riesgos, oportunidades)
 * - filtra los insights tipo "evento" que ya se habían mostrado en una
 *   sesión ANTERIOR (usa `insight_log`, con snapshot congelado por sesión)
 * - registra como mostrados los eventos nuevos que se van a desplegar ahora
 *
 * Si algo falla en la persistencia (p.ej. las tablas aún no existen en Supabase),
 * no rompe el dashboard: regresa los insights calculados en memoria sin persistir.
 */
export async function syncInsights(userId, allAccounts, lang) {
  const monthly = computeMonthly(allAccounts);
  const evaluated = evaluateMilestones(allAccounts, monthly);
  const rawInsights = generateInsights(allAccounts, { lang });
  const cache = getSessionCache(userId);

  let persistenceOk = true;

  if (cache.priorMilestoneKeys === null) {
    try {
      cache.priorMilestoneKeys = await fetchMilestoneKeys(userId);
    } catch (e) {
      persistenceOk = false;
      cache.priorMilestoneKeys = new Set();
    }
  }
  const priorMilestoneKeys = cache.priorMilestoneKeys;
  const newlyUnlocked = evaluated.filter((m) => m.unlocked && !priorMilestoneKeys.has(m.key)).map((m) => m.key);

  if (newlyUnlocked.length && persistenceOk) {
    try {
      await unlockMilestones(userId, newlyUnlocked);
    } catch (e) {
      persistenceOk = false;
    }
  }

  const allUnlockedKeys = new Set([...priorMilestoneKeys, ...newlyUnlocked]);
  const badges = persistenceOk
    ? MILESTONE_CATALOG.filter((m) => allUnlockedKeys.has(m.key))
    : evaluated.filter((m) => m.unlocked);

  const milestoneEvents = buildMilestoneEvents(newlyUnlocked, lang);
  let combined = [...milestoneEvents, ...rawInsights].sort((a, b) => b.priority - a.priority);

  if (persistenceOk) {
    if (cache.priorEventKeys === null) {
      try {
        cache.priorEventKeys = await fetchShownEventKeys(userId);
      } catch (e) {
        cache.priorEventKeys = new Set();
      }
    }
    const priorEventKeys = cache.priorEventKeys;
    const visible = combined.filter((i) => i.behavior !== "event" || !priorEventKeys.has(i.key));
    const toLog = visible.filter((i) => i.behavior === "event").map((i) => i.key);
    if (toLog.length) {
      try {
        await logShownEvents(userId, toLog);
      } catch (e) {
        // si falla el log seguimos mostrando el resultado calculado igual
      }
    }
    combined = visible;
  }

  return { insights: combined.slice(0, 10), badges };
}
