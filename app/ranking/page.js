"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useLanguage } from "../../components/LanguageProvider";
import SiteNav from "../../components/SiteNav";
import SiteFooter from "../../components/SiteFooter";
import { mockRankings } from "../../lib/mockRankings";

const MEDALS = ["🥇", "🥈", "🥉"];

export default function RankingPage() {
  const { dict } = useLanguage();
  const r = dict.ranking;
  const [loggedIn, setLoggedIn] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    async function check() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setLoggedIn(!!session);
      setChecked(true);
    }
    check();
  }, []);

  const top3 = mockRankings.slice(0, 3);
  const rest = mockRankings.slice(3);

  function renderRow(u) {
    return (
      <div className="rank-row" key={u.rank}>
        <span className={u.rank <= 3 ? "rank-medal" : ""}>{u.rank <= 3 ? MEDALS[u.rank - 1] : u.rank}</span>
        <span className="rank-trader">
          <span className="rank-avatar">{u.avatar}</span> {u.nickname}
        </span>
        <span>{u.country}</span>
        <span className="positive">+{u.roi.toFixed(1)}%</span>
        <span>{u.withdrawals}</span>
      </div>
    );
  }

  return (
    <div className="wrap">
      <SiteNav rightSlot={
        <Link href="/login" className="btn btn-primary">{dict.nav.login}</Link>
      } />

      <section className="hero" style={{ padding: "50px 10px 10px" }}>
        <h1>{r.title}</h1>
        <p>{r.subtitle}</p>
      </section>

      <section className="section" style={{ maxWidth: 760, margin: "0 auto" }}>
        {!checked ? null : (
          <div className="rank-table">
            <div className="rank-row rank-head">
              <span>#</span>
              <span>{r.colTrader}</span>
              <span>{r.colCountry}</span>
              <span>{r.colRoi}</span>
              <span>{r.colWithdrawals}</span>
            </div>

            {top3.map(renderRow)}

            {loggedIn ? (
              rest.map(renderRow)
            ) : (
              <div className="rank-blur-wrap">
                <div className="rank-blurred">{rest.map(renderRow)}</div>
                <div className="rank-blur-overlay">
                  <div className="rank-blur-title">{r.blurTitle}</div>
                  <div className="rank-blur-sub">{r.blurSub}</div>
                  <Link href="/login" className="btn btn-primary">
                    {r.joinCta}
                  </Link>
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      <SiteFooter />
    </div>
  );
}
