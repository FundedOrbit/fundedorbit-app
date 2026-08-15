"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";
import { useLanguage } from "../../components/LanguageProvider";
import SiteNav from "../../components/SiteNav";
import SiteFooter from "../../components/SiteFooter";
import AccountFormModal from "../../components/AccountFormModal";
import { fetchAccounts, deleteAccount, accountMetrics } from "../../lib/accountsClient";

function fmtMoney(n) {
  return "$" + (Number(n) || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function AccountsPage() {
  const router = useRouter();
  const { dict } = useLanguage();
  const a = dict.accounts;
  const [userId, setUserId] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);

  useEffect(() => {
    async function load() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login");
        return;
      }
      setUserId(session.user.id);
      const rows = await fetchAccounts(session.user.id);
      setAccounts(rows);
      setLoading(false);
    }
    load();
  }, [router]);

  function handleSaved(saved) {
    setAccounts((prev) => {
      const exists = prev.some((x) => x.id === saved.id);
      if (exists) return prev.map((x) => (x.id === saved.id ? saved : x));
      return [saved, ...prev];
    });
    setShowForm(false);
    setEditing(null);
  }

  async function handleDelete(id) {
    if (!confirm(a.confirmDelete)) return;
    await deleteAccount(id);
    setAccounts((prev) => prev.filter((x) => x.id !== id));
  }

  function handleExportCsv() {
    const maxWithdrawals = Math.max(1, ...accounts.map((x) => (x.withdrawals || []).length));
    const maxResets = Math.max(0, ...accounts.map((x) => (x.resets || []).length));
    const maxExtraIds = Math.max(0, ...accounts.map((x) => (x.extra_ids || []).length));

    const wdHeaders = [];
    for (let i = 0; i < maxWithdrawals; i++) {
      wdHeaders.push(
        `Retiro${i + 1} Estado`,
        `Retiro${i + 1} FechaSolicitado`,
        `Retiro${i + 1} FechaRecibido`,
        `Retiro${i + 1} Monto`,
        `Retiro${i + 1} Link`,
        `Retiro${i + 1} RazonNegativa`
      );
    }
    const resetHeaders = [];
    for (let i = 0; i < maxResets; i++) {
      resetHeaders.push(`Reinicio${i + 1} Fecha`, `Reinicio${i + 1} Costo`);
    }
    const extraIdHeaders = [];
    for (let i = 0; i < maxExtraIds; i++) {
      extraIdHeaders.push(`IDAdicional${i + 1} Etiqueta`, `IDAdicional${i + 1} Valor`);
    }

    const headers = [
      "ID Cuenta", ...extraIdHeaders, "Empresa", "Tipo de cuenta", "Tamaño", "Método", "Estado",
      "Fecha Compra", "Costo Compra", "Fecha Pasada", "Costo Activación", "Fecha Quemada",
      "Cancelada", "Fecha Cancelada", "Baneada", "Fecha Baneo", "Razón Baneo",
      "Cobro Recurrente", "Num Cobros Recurrentes", "Costo Cobros Recurrentes",
      ...resetHeaders, ...wdHeaders,
      "Total Invertido", "Total Retirado (recibido)", "Pendiente", "Denegado", "Neto", "ROI %", "Notas",
    ];

    const rows = accounts.map((acc) => {
      const m = accountMetrics(acc);
      const wd = acc.withdrawals || [];
      const wdCells = [];
      for (let i = 0; i < maxWithdrawals; i++) {
        const w = wd[i];
        wdCells.push(
          w ? w.status || "" : "",
          w ? w.requestDate || "" : "",
          w ? w.receivedDate || "" : "",
          w ? w.amount || "" : "",
          w ? w.link || "" : "",
          w ? w.denialReason || "" : ""
        );
      }
      const resets = acc.resets || [];
      const resetCells = [];
      for (let i = 0; i < maxResets; i++) {
        const r = resets[i];
        resetCells.push(r ? r.date || "" : "", r ? r.cost || "" : "");
      }
      const extraIds = acc.extra_ids || [];
      const extraIdCells = [];
      for (let i = 0; i < maxExtraIds; i++) {
        const x = extraIds[i];
        extraIdCells.push(x ? x.label || "" : "", x ? x.id || "" : "");
      }
      return [
        acc.account_id, ...extraIdCells, acc.company, acc.account_type, acc.size, acc.method, acc.status,
        acc.purchase_date, acc.purchase_cost, acc.passed_date, m.activationFee, acc.burned_date,
        acc.cancelled ? "Sí" : "No", acc.cancelled_date, acc.banned ? "Sí" : "No", acc.ban_date, acc.ban_reason,
        acc.recurring ? "Sí" : "No", m.recurringCharges, m.recurringChargesCost,
        ...resetCells, ...wdCells,
        m.invested, m.withdrawn, m.pending, m.denied, m.net, m.roi.toFixed(2), acc.notes,
      ];
    });

    const csv = [headers, ...rows]
      .map((r) => r.map((c) => `"${String(c == null ? "" : c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const today = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.download = `fundedorbit-cuentas-${today}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  if (loading) {
    return <div className="auth-wrap">{a.loading}</div>;
  }

  return (
    <div className="wrap">
      <SiteNav rightSlot={
        <Link href="/dashboard" className="btn btn-ghost">{dict.nav.dashboard}</Link>
      } />

      <section style={{ padding: "20px 0 40px" }}>
        <div className="accounts-toolbar">
          <h1 style={{ fontSize: 26, margin: 0 }}>{a.title}</h1>
          <div style={{ display: "flex", gap: 10 }}>
            {accounts.length > 0 && (
              <button className="btn btn-ghost" onClick={handleExportCsv}>
                {a.exportCsv}
              </button>
            )}
            <button
              className="btn btn-primary"
              onClick={() => {
                setEditing(null);
                setShowForm(true);
              }}
            >
              {a.newAccount}
            </button>
          </div>
        </div>

        {accounts.length === 0 ? (
          <div className="card" style={{ textAlign: "center", padding: 40 }}>
            <p>{a.empty}</p>
          </div>
        ) : (
          <div className="accounts-table-wrap">
            <table className="accounts-table">
              <thead>
                <tr>
                  <th>{a.colId}</th>
                  <th>{a.colCompany}</th>
                  <th>{a.colType}</th>
                  <th>{a.colSize}</th>
                  <th>{a.colStatus}</th>
                  <th>{a.colPurchase}</th>
                  <th>{a.colInvested}</th>
                  <th>{a.colWithdrawn}</th>
                  <th>{a.colRoi}</th>
                  <th>{a.colActions}</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((acc) => {
                  const m = accountMetrics(acc);
                  return (
                    <tr key={acc.id}>
                      <td>{acc.account_id || "—"}</td>
                      <td>{acc.company || "—"}</td>
                      <td>{acc.account_type || "—"}</td>
                      <td>{acc.size || "—"}</td>
                      <td>
                        <span className="badge">{a[`status${acc.status.charAt(0).toUpperCase() + acc.status.slice(1)}`]}</span>
                      </td>
                      <td>{acc.purchase_date || "—"}</td>
                      <td>{fmtMoney(m.invested)}</td>
                      <td>{fmtMoney(m.withdrawn)}</td>
                      <td className={m.roi >= 0 ? "positive" : "negative"}>{m.roi.toFixed(1)}%</td>
                      <td>
                        <div className="row-actions">
                          <button
                            onClick={() => {
                              setEditing(acc);
                              setShowForm(true);
                            }}
                          >
                            {a.edit}
                          </button>
                          <button onClick={() => handleDelete(acc.id)}>{a.delete}</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {showForm && (
        <AccountFormModal
          account={editing}
          userId={userId}
          onClose={() => {
            setShowForm(false);
            setEditing(null);
          }}
          onSaved={handleSaved}
        />
      )}

      <SiteFooter />
    </div>
  );
}
