import { supabase } from "./supabaseClient";

// Categorías base (se guardan como "default:<key>" para que se traduzcan según el idioma).
export const DEFAULT_CATEGORIES = ["mentoring", "platform", "copier", "other"];
export const DEFAULT_PREFIX = "default:";

export function categoryLabel(value, dict) {
  if (!value) return "—";
  if (value.startsWith(DEFAULT_PREFIX)) {
    const key = value.slice(DEFAULT_PREFIX.length);
    return (dict.expenses.defaultCategories && dict.expenses.defaultCategories[key]) || key;
  }
  return value;
}

/* ---------- Supabase ---------- */
export async function fetchExpenses(userId) {
  const { data, error } = await supabase
    .from("operating_expenses")
    .select("*")
    .eq("user_id", userId)
    .order("expense_date", { ascending: false });
  if (error) throw error;
  return data || [];
}
export async function createExpense(userId, payload) {
  const { data, error } = await supabase
    .from("operating_expenses")
    .insert({ user_id: userId, ...payload })
    .select()
    .single();
  if (error) throw error;
  return data;
}
export async function updateExpense(id, payload) {
  const { data, error } = await supabase.from("operating_expenses").update(payload).eq("id", id).select().single();
  if (error) throw error;
  return data;
}
export async function deleteExpense(id) {
  const { error } = await supabase.from("operating_expenses").delete().eq("id", id);
  if (error) throw error;
}
export async function fetchCategories(userId) {
  const { data, error } = await supabase
    .from("expense_categories")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data || [];
}
export async function insertCategories(userId, names) {
  if (!names.length) return;
  const base = Date.now();
  const rows = names.map((name, i) => ({ user_id: userId, name, created_at: new Date(base + i * 5).toISOString() }));
  const { error } = await supabase.from("expense_categories").insert(rows);
  if (error) throw error;
}
export async function deleteCategory(id) {
  const { error } = await supabase.from("expense_categories").delete().eq("id", id);
  if (error) throw error;
}

/* ---------- cálculo de cobros ---------- */
function isoFromDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function todayISO() {
  return isoFromDate(new Date());
}

// Fechas de cada cobro de un gasto. Un gasto único tiene 1 cobro; uno mensual cobra
// en la fecha inicial y luego cada mes hasta su cancelación (o hasta hoy si sigue activo).
export function expenseChargeDates(exp) {
  if (!exp.expense_date) return [];
  const first = exp.expense_date;
  if (!exp.recurring) return [first];
  const endStr = exp.cancelled_date || todayISO();
  const start = new Date(first + "T00:00:00");
  const end = new Date(endStr + "T00:00:00");
  const dates = [first];
  if (isNaN(start) || isNaN(end)) return dates;
  let cursor = new Date(start.getFullYear(), start.getMonth() + 1, start.getDate());
  while (cursor <= end) {
    dates.push(isoFromDate(cursor));
    cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, cursor.getDate());
  }
  return dates;
}

// Eventos {date, amount} de todos los cobros; opcionalmente filtrados por rango.
export function expenseEvents(expenses, range) {
  const out = [];
  (expenses || []).forEach((e) => {
    const amount = Number(e.amount) || 0;
    expenseChargeDates(e).forEach((dt) => {
      if (range && range.from && dt < range.from) return;
      if (range && range.to && dt > range.to) return;
      out.push({ date: dt, amount, category: e.category, expense: e });
    });
  });
  return out;
}

export function expenseTotal(expenses, range) {
  return expenseEvents(expenses, range).reduce((s, ev) => s + ev.amount, 0);
}

export function expenseByCategory(expenses, range) {
  const map = {};
  expenseEvents(expenses, range).forEach((ev) => {
    map[ev.category] = (map[ev.category] || 0) + ev.amount;
  });
  return Object.entries(map)
    .map(([category, total]) => ({ category, total }))
    .sort((a, b) => b.total - a.total);
}

export function expenseSummary(exp) {
  const dates = expenseChargeDates(exp);
  const amount = Number(exp.amount) || 0;
  return { charges: dates.length, total: dates.length * amount };
}
