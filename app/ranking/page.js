"use client";

import Link from "next/link";
import { useLanguage } from "../../components/LanguageProvider";
import LangToggle from "../../components/LangToggle";
import { mockRankings } from "../../lib/mockRankings";

const MEDALS = ["🥇", "🥈", "🥉"];

export default function RankingPage() {
  const { dict } = useLanguage();
  const r = dict.ranking;
  const top3 = mockRankings.slice(0, 3);
  const rest = mockRankings.slice(3);

  return (
    <div className="wrap">
      <nav className="nav">
        <Link href="/" className="brand">
          <span className="dot" />
          FundedOrbit
        </Link>
        <div className="nav-right">
          <LangToggle />
          <Link href="/login" className="btn btn-primary">
            {dict.nav.login}
          </Link>
        </div>
      </nav>

      <section className="hero" style={{ padding: "50px 10px 10px" }}>
        <h1>{r.title}</h1>
        <p>{r.subtitle}</p>
      </section>

      <section className="section" style={{ maxWidth: 760, margin: "0 auto" }}>
        <div className="rank-table">
          <div className="rank-row rank-head">
            <span>#</span>
            <span>{r.colTrader}</span>
            <span>{r.colCountry}</span>
            <span>{r.colRoi}</span>
            <span>{r.colWithdrawals}</span>
          </div>

          {top3.map((u) => (
            <div className="rank-row" key={u.rank}>
              <span className="rank-medal">{MEDALS[u.rank - 1]}</span>
              <span className="rank-trader">
                <span className="rank-avatar">{u.avatar}</span> {u.nickname}
              </span>
              <span>{u.country}</span>
              <span className="positive">+{u.roi.toFixed(1)}%</span>
              <span>{u.withdrawals}</span>
            </div>
          ))}

          <div className="rank-blur-wrap">
            <div className="rank-blurred">
              {rest.map((u) => (
                <div className="rank-row" key={u.rank}>
                  <span>{u.rank}</span>
                  <span className="rank-trader">
                    <span className="rank-avatar">{u.avatar}</span> {u.nickname}
                  </span>
                  <span>{u.country}</span>
                  <span className="positive">+{u.roi.toFixed(1)}%</span>
                  <span>{u.withdrawals}</span>
                </div>
              ))}
            </div>
            <div className="rank-blur-overlay">
              <div className="rank-blur-title">{r.blurTitle}</div>
              <div className="rank-blur-sub">{r.blurSub}</div>
              <Link href="/login" className="btn btn-primary">
                {r.joinCta}
              </Link>
            </div>
          </div>
        </div>
      </section>

      <div className="footer-note">
        {dict.footerNote.replace("{year}", String(new Date().getFullYear()))}
      </div>
    </div>
  );
}
