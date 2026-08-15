"use client";

import { useState } from "react";
import { useLanguage } from "./LanguageProvider";
import { createAccount, updateAccount } from "../lib/accountsClient";

const STATUS_OPTIONS = ["activa", "pasada", "live", "quemada"];
const WD_STATUS_OPTIONS = ["solicitado", "aprobado", "recibido", "denegado"];

function emptyForm(account) {
  if (account) {
    return {
      account_id: account.account_id || "",
      company: account.company || "",
      account_type: account.account_type || "",
      size: account.size || "",
      method: account.method || "",
      status: account.status || "activa",
      purchase_date: account.purchase_date || "",
      purchase_cost: account.purchase_cost ?? "",
      activation_fee: account.activation_fee ?? "",
      passed_date: account.passed_date || "",
      burned_date: account.burned_date || "",
      banned: !!account.banned,
      ban_date: account.ban_date || "",
      ban_reason: account.ban_reason || "",
      cancelled: !!account.cancelled,
      cancelled_date: account.cancelled_date || "",
      recurring: !!account.recurring,
      notes: account.notes || "",
      resets: account.resets || [],
      extraIds: account.extra_ids || [],
      withdrawals: account.withdrawals || [],
    };
  }
  return {
    account_id: "",
    company: "",
    account_type: "",
    size: "",
    method: "",
    status: "activa",
    purchase_date: "",
    purchase_cost: "",
    activation_fee: "",
    passed_date: "",
    burned_date: "",
    banned: false,
    ban_date: "",
    ban_reason: "",
    cancelled: false,
    cancelled_date: "",
    recurring: false,
    notes: "",
    resets: [],
    extraIds: [],
    withdrawals: [{ status: "solicitado", requestDate: "", receivedDate: "", amount: "", denialReason: "", link: "" }],
  };
}

export default function AccountFormModal({ account, userId, onClose, onSaved }) {
  const { dict } = useLanguage();
  const a = dict.accounts;
  const [form, setForm] = useState(() => emptyForm(account));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function addReset() {
    setForm((f) => ({ ...f, resets: [...f.resets, { date: "", cost: "" }] }));
  }
  function updateReset(i, key, value) {
    setForm((f) => {
      const resets = [...f.resets];
      resets[i] = { ...resets[i], [key]: value };
      return { ...f, resets };
    });
  }
  function removeReset(i) {
    setForm((f) => ({ ...f, resets: f.resets.filter((_, idx) => idx !== i) }));
  }

  function addExtraId() {
    setForm((f) => ({ ...f, extraIds: [...f.extraIds, { label: "", id: "" }] }));
  }
  function updateExtraId(i, key, value) {
    setForm((f) => {
      const extraIds = [...f.extraIds];
      extraIds[i] = { ...extraIds[i], [key]: value };
      return { ...f, extraIds };
    });
  }
  function removeExtraId(i) {
    setForm((f) => ({ ...f, extraIds: f.extraIds.filter((_, idx) => idx !== i) }));
  }

  function addWithdrawal() {
    setForm((f) => ({
      ...f,
      withdrawals: [
        ...f.withdrawals,
        { status: "solicitado", requestDate: "", receivedDate: "", amount: "", denialReason: "", link: "" },
      ],
    }));
  }
  function updateWithdrawal(i, key, value) {
    setForm((f) => {
      const withdrawals = [...f.withdrawals];
      withdrawals[i] = { ...withdrawals[i], [key]: value };
      return { ...f, withdrawals };
    });
  }
  function removeWithdrawal(i) {
    setForm((f) => ({ ...f, withdrawals: f.withdrawals.filter((_, idx) => idx !== i) }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSaving(true);

    const payload = {
      account_id: form.account_id || null,
      company: form.company || null,
      account_type: form.account_type || null,
      size: form.size || null,
      method: form.method || null,
      status: form.status,
      purchase_date: form.purchase_date || null,
      purchase_cost: Number(form.purchase_cost) || 0,
      activation_fee: Number(form.activation_fee) || 0,
      passed_date: form.passed_date || null,
      burned_date: form.burned_date || null,
      banned: form.banned,
      ban_date: form.banned ? form.ban_date || null : null,
      ban_reason: form.banned ? form.ban_reason || null : null,
      cancelled: form.cancelled,
      cancelled_date: form.cancelled ? form.cancelled_date || null : null,
      recurring: form.recurring,
      notes: form.notes || null,
      resets: form.resets.filter((r) => r.date || r.cost),
      extra_ids: form.extraIds.filter((x) => x.label || x.id),
      withdrawals: form.withdrawals.filter((w) => w.amount || w.requestDate || w.receivedDate),
    };

    try {
      let saved;
      if (account) {
        saved = await updateAccount(account.id, payload);
      } else {
        saved = await createAccount(userId, payload);
      }
      setSaving(false);
      onSaved(saved);
    } catch (err) {
      setSaving(false);
      setError(err.message || String(err));
    }
  }

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-card form-modal-card">
        <button className="modal-close" onClick={onClose} type="button">✕</button>
        <h2 style={{ marginTop: 0 }}>{account ? a.formTitleEdit : a.formTitleNew}</h2>

        {error && <div className="msg err">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="field">
              <label>{a.fieldAccountId}</label>
              <input value={form.account_id} onChange={(e) => set("account_id", e.target.value)} />
            </div>
            <div className="field">
              <label>{a.fieldCompany}</label>
              <input value={form.company} onChange={(e) => set("company", e.target.value)} />
            </div>
            <div className="field">
              <label>{a.fieldType}</label>
              <input value={form.account_type} onChange={(e) => set("account_type", e.target.value)} />
            </div>
            <div className="field">
              <label>{a.fieldSize}</label>
              <input value={form.size} onChange={(e) => set("size", e.target.value)} />
            </div>
            <div className="field">
              <label>{a.fieldMethod}</label>
              <input value={form.method} onChange={(e) => set("method", e.target.value)} />
            </div>
            <div className="field">
              <label>{a.fieldStatus}</label>
              <select value={form.status} onChange={(e) => set("status", e.target.value)}>
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {a[`status${s.charAt(0).toUpperCase() + s.slice(1)}`]}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>{a.fieldPurchaseDate}</label>
              <input type="date" value={form.purchase_date} onChange={(e) => set("purchase_date", e.target.value)} />
            </div>
            <div className="field">
              <label>{a.fieldPurchaseCost}</label>
              <input type="number" step="0.01" value={form.purchase_cost} onChange={(e) => set("purchase_cost", e.target.value)} />
            </div>
            <div className="field">
              <label>{a.fieldActivationFee}</label>
              <input type="number" step="0.01" value={form.activation_fee} onChange={(e) => set("activation_fee", e.target.value)} />
            </div>
            <div className="field">
              <label>{a.fieldPassedDate}</label>
              <input type="date" value={form.passed_date} onChange={(e) => set("passed_date", e.target.value)} />
            </div>
            <div className="field">
              <label>{a.fieldBurnedDate}</label>
              <input type="date" value={form.burned_date} onChange={(e) => set("burned_date", e.target.value)} />
            </div>
          </div>

          <label className="checkbox-field">
            <input type="checkbox" checked={form.recurring} onChange={(e) => set("recurring", e.target.checked)} />
            {a.fieldRecurring}
          </label>

          <label className="checkbox-field">
            <input type="checkbox" checked={form.banned} onChange={(e) => set("banned", e.target.checked)} />
            {a.fieldBanned}
          </label>
          {form.banned && (
            <div className="form-grid" style={{ marginBottom: 10 }}>
              <div className="field">
                <label>{a.fieldBanDate}</label>
                <input type="date" value={form.ban_date} onChange={(e) => set("ban_date", e.target.value)} />
              </div>
              <div className="field">
                <label>{a.fieldBanReason}</label>
                <input value={form.ban_reason} onChange={(e) => set("ban_reason", e.target.value)} />
              </div>
            </div>
          )}

          <label className="checkbox-field">
            <input type="checkbox" checked={form.cancelled} onChange={(e) => set("cancelled", e.target.checked)} />
            {a.fieldCancelled}
          </label>
          {form.cancelled && (
            <div className="field" style={{ marginBottom: 10 }}>
              <label>{a.fieldCancelledDate}</label>
              <input type="date" value={form.cancelled_date} onChange={(e) => set("cancelled_date", e.target.value)} />
            </div>
          )}

          <div className="field">
            <label>{a.fieldNotes}</label>
            <input value={form.notes} onChange={(e) => set("notes", e.target.value)} />
          </div>

          <div className="section-label">{a.resetsTitle}</div>
          {form.resets.map((r, i) => (
            <div className="dyn-block" key={i}>
              <button type="button" className="dyn-remove" onClick={() => removeReset(i)}>✕</button>
              <div className="dyn-grid">
                <div className="field">
                  <label>{a.resetDate}</label>
                  <input type="date" value={r.date || ""} onChange={(e) => updateReset(i, "date", e.target.value)} />
                </div>
                <div className="field">
                  <label>{a.resetCost}</label>
                  <input type="number" step="0.01" value={r.cost || ""} onChange={(e) => updateReset(i, "cost", e.target.value)} />
                </div>
              </div>
            </div>
          ))}
          <button type="button" className="add-row-btn" onClick={addReset}>{a.addReset}</button>

          <div className="section-label">{a.extraIdsTitle}</div>
          {form.extraIds.map((x, i) => (
            <div className="dyn-block" key={i}>
              <button type="button" className="dyn-remove" onClick={() => removeExtraId(i)}>✕</button>
              <div className="dyn-grid">
                <div className="field">
                  <label>{a.extraIdLabel}</label>
                  <input value={x.label || ""} onChange={(e) => updateExtraId(i, "label", e.target.value)} />
                </div>
                <div className="field">
                  <label>{a.extraIdValue}</label>
                  <input value={x.id || ""} onChange={(e) => updateExtraId(i, "id", e.target.value)} />
                </div>
              </div>
            </div>
          ))}
          <button type="button" className="add-row-btn" onClick={addExtraId}>{a.addExtraId}</button>

          <div className="section-label">{a.withdrawalsTitle}</div>
          {form.withdrawals.map((w, i) => (
            <div className="dyn-block" key={i}>
              <button type="button" className="dyn-remove" onClick={() => removeWithdrawal(i)}>✕</button>
              <div className="dyn-grid">
                <div className="field">
                  <label>{a.wdStatus}</label>
                  <select value={w.status} onChange={(e) => updateWithdrawal(i, "status", e.target.value)}>
                    {WD_STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {a[`wd${s.charAt(0).toUpperCase() + s.slice(1)}`]}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label>{a.wdAmount}</label>
                  <input type="number" step="0.01" value={w.amount || ""} onChange={(e) => updateWithdrawal(i, "amount", e.target.value)} />
                </div>
                <div className="field">
                  <label>{a.wdRequestDate}</label>
                  <input type="date" value={w.requestDate || ""} onChange={(e) => updateWithdrawal(i, "requestDate", e.target.value)} />
                </div>
                <div className="field">
                  <label>{a.wdReceivedDate}</label>
                  <input type="date" value={w.receivedDate || ""} onChange={(e) => updateWithdrawal(i, "receivedDate", e.target.value)} />
                </div>
                <div className="field" style={{ gridColumn: "1 / -1" }}>
                  <label>{a.wdLink}</label>
                  <input type="url" placeholder="https://..." value={w.link || ""} onChange={(e) => updateWithdrawal(i, "link", e.target.value)} />
                </div>
                {w.status === "denegado" && (
                  <div className="field" style={{ gridColumn: "1 / -1" }}>
                    <label>{a.wdDenialReason}</label>
                    <input value={w.denialReason || ""} onChange={(e) => updateWithdrawal(i, "denialReason", e.target.value)} />
                  </div>
                )}
              </div>
            </div>
          ))}
          <button type="button" className="add-row-btn" onClick={addWithdrawal}>{a.addWithdrawal}</button>

          <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
            <button type="submit" className="btn btn-primary" disabled={saving} style={{ flex: 1 }}>
              {saving ? a.saving : a.save}
            </button>
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              {a.cancel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
