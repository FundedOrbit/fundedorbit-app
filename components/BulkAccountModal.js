"use client";

import { useMemo, useState } from "react";
import { useLanguage } from "./LanguageProvider";
import { createAccountsBulk } from "../lib/accountsClient";

const SIZE_OPTIONS = ["25K", "50K", "100K", "150K", "200K"];

function emptyRow() {
  return {
    account_id: "",
    account_type: "",
    company: "",
    size: "",
    purchase_cost: "",
    recurring: false,
  };
}

export default function BulkAccountModal({ userId, allAccounts, onClose, onSaved }) {
  const { dict } = useLanguage();
  const a = dict.accounts;

  const [purchaseDate, setPurchaseDate] = useState("");
  const [rows, setRows] = useState([emptyRow()]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const companyOptions = useMemo(
    () => [...new Set((allAccounts || []).map((x) => (x.company || "").trim()).filter(Boolean))].sort(),
    [allAccounts]
  );
  const accountTypeOptions = useMemo(
    () => [...new Set((allAccounts || []).map((x) => (x.account_type || "").trim()).filter(Boolean))].sort(),
    [allAccounts]
  );

  function addRow() {
    setRows((r) => (r.length >= 10 ? r : [...r, emptyRow()]));
  }
  function updateRow(i, key, value) {
    setRows((r) => {
      const next = [...r];
      next[i] = { ...next[i], [key]: value };
      return next;
    });
  }
  function removeRow(i) {
    setRows((r) => (r.length <= 1 ? r : r.filter((_, idx) => idx !== i)));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (rows.length < 1 || rows.length > 10) {
      setError(a.bulkErrorQuantity);
      return;
    }

    setSaving(true);
    try {
      const payloadRows = rows.map((row) => ({
        account_id: row.account_id || null,
        company: row.company || null,
        account_type: row.account_type || null,
        size: row.size || null,
        method: null,
        status: "activa",
        purchase_date: purchaseDate || null,
        purchase_cost: Number(row.purchase_cost) || 0,
        activation_fee: 0,
        passed_date: null,
        burned_date: null,
        burned_dates: [],
        banned: false,
        ban_date: null,
        ban_reason: null,
        cancelled: false,
        cancelled_date: null,
        recurring: !!row.recurring,
        notes: null,
        resets: [],
        extra_ids: [],
        withdrawals: [],
      }));

      const saved = await createAccountsBulk(userId, payloadRows);
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
        <h2 style={{ marginTop: 0 }}>{a.formTitleBulk}</h2>
        <p className="sub" style={{ marginTop: -6, marginBottom: 18 }}>{a.bulkHelp}</p>

        {error && <div className="msg err">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="field">
              <label>{a.fieldPurchaseDate}</label>
              <input type="date" value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} />
              <p className="field-help" style={{ margin: "4px 0 0" }}>{a.bulkDateHelp}</p>
            </div>
          </div>

          <div className="section-label">
            {a.bulkRowsTitle}
            {rows.length < 10 && (
              <button type="button" className="add-row-btn" onClick={addRow}>{a.bulkAddRow}</button>
            )}
          </div>

          {rows.map((row, i) => (
            <div className="dyn-block" key={i}>
              {rows.length > 1 && (
                <button type="button" className="dyn-remove" onClick={() => removeRow(i)}>✕</button>
              )}
              <div className="dyn-grid">
                <div className="field">
                  <label>{a.fieldAccountId}</label>
                  <input value={row.account_id} onChange={(e) => updateRow(i, "account_id", e.target.value)} />
                </div>
                <div className="field">
                  <label>{a.fieldCompany}</label>
                  <input
                    value={row.company}
                    onChange={(e) => updateRow(i, "company", e.target.value)}
                    list={`bulkCompanyList-${i}`}
                    placeholder={a.fieldCompanyPlaceholder}
                  />
                  <datalist id={`bulkCompanyList-${i}`}>
                    {companyOptions.map((c) => (<option key={c} value={c} />))}
                  </datalist>
                </div>
                <div className="field">
                  <label>{a.fieldType}</label>
                  <input
                    value={row.account_type}
                    onChange={(e) => updateRow(i, "account_type", e.target.value)}
                    list={`bulkAccountTypeList-${i}`}
                    placeholder={a.fieldTypePlaceholder}
                  />
                  <datalist id={`bulkAccountTypeList-${i}`}>
                    {accountTypeOptions.map((t) => (<option key={t} value={t} />))}
                  </datalist>
                </div>
                <div className="field">
                  <label>{a.fieldSize}</label>
                  <select value={row.size} onChange={(e) => updateRow(i, "size", e.target.value)}>
                    <option value="">{a.fieldSizePlaceholder}</option>
                    {SIZE_OPTIONS.map((s) => (<option key={s} value={s}>{s}</option>))}
                  </select>
                </div>
                <div className="field">
                  <label>{a.fieldPurchaseCost}</label>
                  <input
                    type="number"
                    step="0.01"
                    value={row.purchase_cost}
                    onChange={(e) => updateRow(i, "purchase_cost", e.target.value)}
                  />
                </div>
              </div>
              <label className="checkbox-field">
                <input
                  type="checkbox"
                  checked={row.recurring}
                  onChange={(e) => updateRow(i, "recurring", e.target.checked)}
                />
                {a.fieldRecurring}
              </label>
            </div>
          ))}

          <button className="btn btn-primary btn-block" type="submit" disabled={saving} style={{ marginTop: 18 }}>
            {saving ? a.bulkSubmitLoading : a.bulkSubmit}
          </button>
        </form>
      </div>
    </div>
  );
}
