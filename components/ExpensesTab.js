"use client";

import { useMemo, useState } from "react";
import { useLanguage } from "./LanguageProvider";
import {
  DEFAULT_CATEGORIES,
  DEFAULT_PREFIX,
  categoryLabel,
  createExpense,
  updateExpense,
  deleteExpense,
  fetchCategories,
  insertCategories,
  deleteCategory,
  expenseTotal,
  expenseByCategory,
  expenseSummary,
} from "../lib/expensesClient";

function fmtMoney(n) {
  return "$" + (Number(n) || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function ExpensesTab({ userId, expenses, setExpenses, categories, setCategories }) {
  const { dict } = useLanguage();
  const x = dict.expenses;
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [showCats, setShowCats] = useState(false);

  const total = useMemo(() => expenseTotal(expenses), [expenses]);
  const monthKey = todayISO().slice(0, 7);
  const thisMonth = useMemo(
    () => expenseTotal(expenses, { from: monthKey + "-01", to: monthKey + "-31" }),
    [expenses, monthKey]
  );
  const activeRecurring = expenses.filter((e) => e.recurring && !e.cancelled_date);
  const activeMonthly = activeRecurring.reduce((s, e) => s + (Number(e.amount) || 0), 0);
  const byCat = useMemo(() => expenseByCategory(expenses), [expenses]);
  const maxCat = byCat.length ? byCat[0].total : 1;

  function handleSaved(row) {
    setExpenses((prev) => [row, ...prev.filter((e) => e.id !== row.id)].sort((a, b) => b.expense_date.localeCompare(a.expense_date)));
    setShowForm(false);
    setEditing(null);
  }
  function handleDeleted(id) {
    setExpenses((prev) => prev.filter((e) => e.id !== id));
    setShowForm(false);
    setEditing(null);
  }

  return (
    <section style={{ paddingTop: 20 }}>
      <div className="card compliance-intro">
        <h3>{x.introTitle}</h3>
        <p className="sub" style={{ margin: 0 }}>{x.introBody}</p>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "14px 0" }}>
        <button type="button" className="btn btn-primary" onClick={() => { setEditing(null); setShowForm(true); }}>
          {x.newExpense}
        </button>
        <button type="button" className="btn btn-ghost" onClick={() => setShowCats(true)}>⚙ {x.editCategories}</button>
      </div>

      <div className="cmp-kpi-row" style={{ gridTemplateColumns: "repeat(3,1fr)" }}>
        <div className="kpi-card">
          <div className="label">{x.kpiTotal}</div>
          <div className="value">{fmtMoney(total)}</div>
          <div className="sub">{x.kpiTotalSub}</div>
        </div>
        <div className="kpi-card">
          <div className="label">{x.kpiMonth}</div>
          <div className="value">{fmtMoney(thisMonth)}</div>
          <div className="sub">{x.kpiMonthSub}</div>
        </div>
        <div className="kpi-card">
          <div className="label">{x.kpiRecurring}</div>
          <div className="value">{fmtMoney(activeMonthly)}</div>
          <div className="sub">{x.kpiRecurringSub.replace("{n}", activeRecurring.length)}</div>
        </div>
      </div>

      {byCat.length > 0 && (
        <div className="card" style={{ marginTop: 18 }}>
          <h3>{x.byCategoryTitle}</h3>
          <div className="cmp-bars">
            {byCat.map((c) => (
              <div className="cmp-bar-row" key={c.category}>
                <span className="cmp-bar-label">{categoryLabel(c.category, dict)}</span>
                <div className="cmp-bar-track"><div className="cmp-bar-fill" style={{ width: `${(c.total / maxCat) * 100}%` }} /></div>
                <span className="cmp-bar-val">{fmtMoney(c.total)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ marginTop: 18 }}>
        {expenses.length === 0 ? (
          <div className="card" style={{ textAlign: "center", padding: 40 }}>
            <p style={{ fontWeight: 700, marginBottom: 6 }}>{x.emptyTitle}</p>
            <p className="sub" style={{ margin: 0 }}>{x.emptySub}</p>
          </div>
        ) : (
          <div className="accounts-table-wrap">
            <table className="accounts-table">
              <thead>
                <tr>
                  <th>{x.colDate}</th>
                  <th>{x.colName}</th>
                  <th>{x.colCategory}</th>
                  <th>{x.colAmount}</th>
                  <th>{x.colType}</th>
                  <th>{x.colTotal}</th>
                  <th>{x.colActions}</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((e) => {
                  const sum = expenseSummary(e);
                  return (
                    <tr key={e.id}>
                      <td>{e.expense_date}</td>
                      <td>{e.name}</td>
                      <td>{categoryLabel(e.category, dict)}</td>
                      <td>{fmtMoney(e.amount)}</td>
                      <td>
                        {e.recurring ? (
                          <span className="badge-pill">
                            🔁 {e.cancelled_date ? x.typeCancelled : x.typeMonthly} · {sum.charges}
                          </span>
                        ) : (
                          x.typeOnce
                        )}
                      </td>
                      <td>{fmtMoney(sum.total)}</td>
                      <td>
                        <div className="row-actions">
                          <button onClick={() => { setEditing(e); setShowForm(true); }}>{x.edit}</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showForm && (
        <ExpenseModal
          userId={userId}
          expense={editing}
          categories={categories}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSaved={handleSaved}
          onDeleted={handleDeleted}
        />
      )}
      {showCats && (
        <CategoriesModal
          userId={userId}
          categories={categories}
          expenses={expenses}
          onClose={() => setShowCats(false)}
          onSaved={(cats, updatedExpenses) => {
            setCategories(cats);
            if (updatedExpenses.length) {
              setExpenses((prev) => prev.map((e) => updatedExpenses.find((u) => u.id === e.id) || e));
            }
          }}
        />
      )}
    </section>
  );
}

function ExpenseModal({ userId, expense, categories, onClose, onSaved, onDeleted }) {
  const { dict } = useLanguage();
  const x = dict.expenses;
  const [form, setForm] = useState({
    name: expense?.name || "",
    category: expense?.category || DEFAULT_PREFIX + DEFAULT_CATEGORIES[0],
    amount: expense?.amount ?? "",
    expense_date: expense?.expense_date || todayISO(),
    recurring: !!expense?.recurring,
    cancelled_date: expense?.cancelled_date || "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  async function handleSave(e) {
    e.preventDefault();
    setError("");
    if (!form.name.trim()) { setError(x.errName); return; }
    if (!(Number(form.amount) > 0)) { setError(x.errAmount); return; }
    if (!form.expense_date) { setError(x.errDate); return; }
    if (form.recurring && form.cancelled_date && form.cancelled_date < form.expense_date) { setError(x.errCancelDate); return; }
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      category: form.category,
      amount: Number(form.amount),
      expense_date: form.expense_date,
      recurring: form.recurring,
      cancelled_date: form.recurring ? form.cancelled_date || null : null,
    };
    try {
      const row = expense ? await updateExpense(expense.id, payload) : await createExpense(userId, payload);
      onSaved(row);
    } catch (err) {
      setSaving(false);
      setError(err.message || String(err));
    }
  }
  async function handleDelete() {
    if (!window.confirm(x.confirmDelete)) return;
    setSaving(true);
    try {
      await deleteExpense(expense.id);
      onDeleted(expense.id);
    } catch (err) {
      setSaving(false);
      setError(err.message || String(err));
    }
  }

  const options = [
    ...DEFAULT_CATEGORIES.map((k) => ({ value: DEFAULT_PREFIX + k, label: x.defaultCategories[k] })),
    ...categories.map((c) => ({ value: c.name, label: c.name })),
  ];
  // si el gasto usa una categoría que ya no existe, la conservamos como opción
  if (form.category && !options.some((o) => o.value === form.category)) {
    options.push({ value: form.category, label: categoryLabel(form.category, dict) });
  }

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-card form-modal-card">
        <button className="modal-close" onClick={onClose} type="button">✕</button>
        <h2 style={{ marginTop: 0 }}>{expense ? x.formTitleEdit : x.formTitleNew}</h2>
        {error && <div className="msg err">{error}</div>}
        <form onSubmit={handleSave}>
          <div className="dyn-grid">
            <div className="field" style={{ gridColumn: "1 / -1" }}>
              <label>{x.fieldName}</label>
              <input value={form.name} placeholder={x.fieldNamePlaceholder} onChange={(e) => set("name", e.target.value)} />
            </div>
            <div className="field">
              <label>{x.fieldCategory}</label>
              <select value={form.category} onChange={(e) => set("category", e.target.value)}>
                {options.map((o) => (<option key={o.value} value={o.value}>{o.label}</option>))}
              </select>
            </div>
            <div className="field">
              <label>{x.fieldAmount}</label>
              <input type="number" step="0.01" min="0" value={form.amount} onChange={(e) => set("amount", e.target.value)} />
            </div>
            <div className="field">
              <label>{x.fieldDate}</label>
              <input type="date" value={form.expense_date} onChange={(e) => set("expense_date", e.target.value)} />
            </div>
            <div className="field" style={{ display: "flex", alignItems: "flex-end" }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", marginBottom: 12 }}>
                <input type="checkbox" style={{ width: "auto" }} checked={form.recurring} onChange={(e) => set("recurring", e.target.checked)} />
                {x.fieldRecurring}
              </label>
            </div>
            {form.recurring && (
              <div className="field" style={{ gridColumn: "1 / -1" }}>
                <label>{x.fieldCancelDate}</label>
                <input type="date" value={form.cancelled_date} onChange={(e) => set("cancelled_date", e.target.value)} />
                <div className="field-hint">{x.fieldCancelHint}</div>
              </div>
            )}
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "space-between", marginTop: 10, flexWrap: "wrap" }}>
            {expense ? (
              <button type="button" className="btn btn-ghost" onClick={handleDelete} disabled={saving}>{x.delete}</button>
            ) : <span />}
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? x.saving : x.save}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CategoriesModal({ userId, categories, expenses, onClose, onSaved }) {
  const { dict } = useLanguage();
  const x = dict.expenses;
  const [items, setItems] = useState(
    categories.length ? categories.map((c) => ({ id: c.id, name: c.name, original: c.name })) : [{ id: null, name: "", original: "" }]
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const updateItem = (i, name) => setItems((l) => l.map((it, idx) => (idx === i ? { ...it, name } : it)));
  const addItem = () => setItems((l) => [...l, { id: null, name: "", original: "" }]);
  const removeItem = (i) => setItems((l) => l.filter((_, idx) => idx !== i));

  async function handleSave() {
    setError("");
    const cleaned = items.map((it) => ({ ...it, name: it.name.trim() })).filter((it) => it.name);
    const lower = cleaned.map((it) => it.name.toLowerCase());
    const baseNames = DEFAULT_CATEGORIES.map((k) => x.defaultCategories[k].toLowerCase());
    if (new Set(lower).size !== lower.length || lower.some((n) => baseNames.includes(n))) {
      setError(x.errDuplicateCategory);
      return;
    }
    setSaving(true);
    try {
      const keptIds = new Set(cleaned.filter((it) => it.id).map((it) => it.id));
      const removed = categories.filter((c) => !keptIds.has(c.id));
      const renamed = cleaned.filter((it) => it.id && it.name !== it.original);
      const added = cleaned.filter((it) => !it.id);

      for (const id of [...removed.map((c) => c.id), ...renamed.map((it) => it.id)]) await deleteCategory(id);
      await insertCategories(userId, [...renamed.map((it) => it.name), ...added.map((it) => it.name)]);

      // si renombró una categoría, los gastos que la usaban se actualizan al nombre nuevo
      const renames = {};
      renamed.forEach((it) => { renames[it.original] = it.name; });
      const updatedExpenses = [];
      for (const e of expenses) {
        if (renames[e.category]) updatedExpenses.push(await updateExpense(e.id, { category: renames[e.category] }));
      }

      const fresh = await fetchCategories(userId);
      onSaved(fresh, updatedExpenses);
      onClose();
    } catch (e) {
      setSaving(false);
      setError(e.message || String(e));
    }
  }

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-card form-modal-card">
        <button className="modal-close" onClick={onClose} type="button">✕</button>
        <h2 style={{ marginTop: 0 }}>{x.catsModalTitle}</h2>
        <p className="sub" style={{ marginTop: 0 }}>{x.catsModalHelp}</p>
        {error && <div className="msg err">{error}</div>}

        <div className="cmp-cat-defaults">
          {DEFAULT_CATEGORIES.map((k) => (<span className="badge-pill" key={k}>{x.defaultCategories[k]}</span>))}
        </div>

        {items.map((it, i) => (
          <div className="dyn-block" key={i}>
            <button type="button" className="dyn-remove" onClick={() => removeItem(i)}>✕</button>
            <div className="field" style={{ marginBottom: 0, paddingRight: 28 }}>
              <input value={it.name} placeholder={x.catPlaceholder} onChange={(e) => updateItem(i, e.target.value)} />
            </div>
          </div>
        ))}
        <button type="button" className="add-row-btn" onClick={addItem}>{x.addCategoryRow}</button>

        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 14 }}>
          <button type="button" className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? x.saving : x.saveCategories}
          </button>
        </div>
      </div>
    </div>
  );
}
