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
