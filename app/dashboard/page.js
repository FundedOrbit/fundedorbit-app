"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";
import { useLanguage } from "../../components/LanguageProvider";
import SiteNav from "../../components/SiteNav";
import SiteFooter from "../../components/SiteFooter";
import { fetchAccounts, accountMetrics } from "../../lib/accountsClient";

function fmtMoney(n) {
  return "$" + (Number(n) || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function DashboardPage() {
  const router = useRouter();
  const { dict } = useLanguage();
  const d = dict.dashboard;
  const a = dict.accounts;
  const [profile, setProfile] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login");
        return;
      }
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();

      if (data && !data.nickname) {
        router.push("/onboarding");
        return;
      }
      setProfile(data);
      const rows = await fetchAccounts(session.user.id);
      setAccounts(rows);
      setLoading(false);
    }
    load();
  }, [router]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  if (loading) {
    return <div className="auth-wrap">{d.loading}</div>;
  }

  const totals = accounts.reduce(
    (acc, row) => {
      const m = accountMetrics(row);
      acc.invested += m.invested;
      acc.withdrawn += m.withdrawn;
      return acc;
    },
    { invested: 0, withdrawn: 0 }
  );
  const net = totals.withdrawn - totals.invested;
  const roi = totals.invested > 0 ? (net / totals.invested) * 100 : 0;

  return (
    <div className="wrap">
      <SiteNav rightSlot={
        <button className="btn btn-ghost" onClick={handleLogout}>{dict.nav.logout}</button>
      } />

      <section className="hero" style={{ padding: "40px 10px 20px" }}>
        <h1>
          {profile?.avatar} {d.welcome} <span>{profile?.nickname}</span>
        </h1>
        <div className="hero-actions">
          <Link href="/accounts" className="btn btn-primary">
            {a.manageCta}
          </Link>
        </div>
      </section>

      <section style={{ paddingBottom: 40 }}>
        <div className="kpi-mini-grid">
          <div className="kpi-card">
            <div className="label">{a.kpiInvested}</div>
            <div className="value">{fmtMoney(totals.invested)}</div>
          </div>
          <div className="kpi-card">
            <div className="label">{a.kpiWithdrawn}</div>
            <div className="value">{fmtMoney(totals.withdrawn)}</div>
          </div>
          <div className={`kpi-card ${net >= 0 ? "positive" : "negative"}`}>
            <div className="label">{a.kpiNet}</div>
            <div className="value">{fmtMoney(net)}</div>
          </div>
          <div className={`kpi-card ${roi >= 0 ? "positive" : "negative"}`}>
            <div className="label">{a.kpiRoi}</div>
            <div className="value">{roi.toFixed(1)}%</div>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
