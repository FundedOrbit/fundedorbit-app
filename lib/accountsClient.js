import { supabase } from "./supabaseClient";

/* ---------- fechas ---------- */
export function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}
export function isoFromDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}
export function nextMonthlyAnniversary(purchaseDateStr, todayStr) {
  const purchase = new Date(purchaseDateStr + "T00:00:00");
  const today = new Date(todayStr + "T00:00:00");
  if (isNaN(purchase) || isNaN(today)) return null;
  const day = purchase.getDate();
  let candidate = new Date(today.getFullYear(), today.getMonth(), day);
  if (candidate < today) candidate = new Date(today.getFullYear(), today.getMonth() + 1, day);
  return candidate;
}
export function recurringChargeEndDate(acc) {
  if (acc.passed_date) return acc.passed_date;
  if (acc.status === "quemada" && acc.burned_date) return acc.burned_date;
  if (acc.cancelled && acc.cancelled_date) return acc.cancelled_date;
  return null;
}
export function getRecurringChargeDates(acc) {
  if (!acc.recurring || !acc.purchase_date) return [];
  const endStr = recurringChargeEndDate(acc) || todayISO();
  const purchase = new Date(acc.purchase_date + "T00:00:00");
  const end = new Date(endStr + "T00:00:00");
  if (isNaN(purchase) || isNaN(end) || end < purchase) return [];
  const dates = [];
  let cursor = new Date(purchase.getFullYear(), purchase.getMonth() + 1, purchase.getDate());
  while (cursor <= end) {
    dates.push(isoFromDate(cursor));
    cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, cursor.getDate());
  }
  return dates;
}

/* ---------- métricas por cuenta (misma lógica que la app local) ---------- */
export function accountMetrics(acc) {
  const resetsCost = (acc.resets || []).reduce((s, r) => s + (Number(r.cost) || 0), 0);
  const activationFee = Number(acc.activation_fee) || 0;
  const recurringChargeDates = getRecurringChargeDates(acc);
  const recurringCharges = recurringChargeDates.length;
  const recurringChargesCost = recurringCharges * (Number(acc.purchase_cost) || 0);
  const invested =
    (Number(acc.purchase_cost) || 0) + resetsCost + activationFee + recurringChargesCost;

  const wds = acc.withdrawals || [];
  const withdrawn = wds.reduce(
    (s, w) => s + (w.status === "recibido" ? Number(w.amount) || 0 : 0),
    0
  );
  const pending = wds.reduce(
    (s, w) =>
      s + (w.status === "solicitado" || w.status === "aprobado" ? Number(w.amount) || 0 : 0),
    0
  );
  const denied = wds.reduce(
    (s, w) => s + (w.status === "denegado" ? Number(w.amount) || 0 : 0),
    0
  );
  const net = withdrawn - invested;
  const roi = invested > 0 ? (net / invested) * 100 : 0;

  return {
    invested,
    withdrawn,
    pending,
    denied,
    net,
    roi,
    resetsCost,
    activationFee,
    recurringCharges,
    recurringChargesCost,
  };
}

/* ---------- CRUD ---------- */
export async function fetchAccounts(userId) {
  const { data, error } = await supabase
    .from("accounts")
    .select("*")
    .eq("user_id", userId)
    .order("purchase_date", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function createAccount(userId, payload) {
  const { data, error } = await supabase
    .from("accounts")
    .insert([{ ...payload, user_id: userId }])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateAccount(id, payload) {
  const { data, error } = await supabase
    .from("accounts")
    .update(payload)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteAccount(id) {
  const { error } = await supabase.from("accounts").delete().eq("id", id);
  if (error) throw error;
}
