"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useLanguage } from "./LanguageProvider";
import SiteNav from "./SiteNav";
import SiteFooter from "./SiteFooter";
import AuthAwareCta from "./AuthAwareCta";
import { fetchTraderRankings, fetchCompanyRankings } from "../lib/rankingsClient";
import { countryNameToFlag } from "../lib/countries";

const MEDALS = ["🥇", "🥈", "🥉"];

export default function RankingClient() {
  const { dict } = useLanguage();
  const r = dict.ranking;
  const [loggedIn, setLoggedIn] = useState(false);
  const [checked, setChecked] = useState(false);

  const [traders, setTraders] = useState([]);
  const [tradersLoading, setTradersLoading] = useState(true);
  const [companies, setCompanies] = useState([]);
  const [companiesLoading, setCompaniesLoading] = useState(false);

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

  useEffect(() => {
    let active = true;
    fetchTraderRankings()
      .then((rows) => {
        if (active) setTraders(rows);
      })
      .catch(() => {
        if (active) setTraders([]);
      })
      .finally(() => {
        if (active) setTradersLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!checked || !loggedIn) return;
    let active = true;
    setCompaniesLoading(true);
    fetchCompanyRankings()
      .then((rows) => {
        if (active) setCompanies(rows);
      })
      .catch(() => {
        if (active) setCompanies([]);
      })
      .finally(() => {
        if (active) setCompaniesLoading(false);
      });
    return () => {
      active = false;
    };
  }, [checked, loggedIn]);

  const top3 = traders.slice(0, 3);
  const restTraders = traders.slice(3);

  function renderTraderRow(u) {
    return (
      <div className="rank-row" key={u.rank}>
        <span className={u.rank <= 3 ? "rank-medal" : ""}>{u.rank <= 3 ? MEDALS[u.rank - 1] : u.rank}</span>
        <span className="rank-trader">
          <span className="rank-avatar">{u.avatar}</span> {u.nickname}
        </span>
        <span>{countryNameToFlag(u.country)}</span>
        <span className={u.roi >= 0 ? "positive" : "negative"}>
          {u.roi >= 0 ? "+" : ""}
          {Number(u.roi).toFixed(1)}%
        </span>
        <span>{u.withdrawals}</span>
      </div>
    );
  }

  function renderCompanyRow(c) {
    return (
      <div className="rank-row rank-row-4col" key={c.rank}>
        <span className={c.rank <= 3 ? "rank-medal" : ""}>{c.rank <= 3 ? MEDALS[c.rank - 1] : c.rank}</span>
        <span className="rank-trader">{c.company}</span>
        <span className={c.avgDaysToPay != null ? "positive" : ""}>
          {c.avgDaysToPay != null ? `${Number(c.avgDaysToPay).toFixed(1)}d` : "—"}
        </span>
        <span>{c.totalWithdrawals}</span>
      </div>
    );
  }

  return (
    <div className="wrap">
      <SiteNav rightSlot={<AuthAwareCta />} />

      <section className="hero" style={{ padding: "50px 10px 10px" }}>
        <h1>{r.title}</h1>
        <p>{r.subtitle}</p>
      </section>

      <section className="section" style={{ maxWidth: 760, margin: "0 auto" }}>
        {!checked || tradersLoading ? (
          <div className="card" style={{ textAlign: "center", padding: 40 }}>
            <p className="sub" style={{ margin: 0 }}>{r.loading}</p>
          </div>
        ) : traders.length === 0 ? (
          <div className="card" style={{ textAlign: "center", padding: 40 }}>
            <p style={{ fontWeight: 700, marginBottom: 6 }}>{r.tradersNotEnoughTitle}</p>
            <p className="sub" style={{ margin: 0 }}>{r.tradersNotEnoughSub}</p>
          </div>
        ) : (
          <div className="rank-table">
            <div className="rank-row rank-head">
              <span>#</span>
              <span>{r.colTrader}</span>
              <span>{r.colCountry}</span>
              <span>{r.colRoi}</span>
              <span>{r.colWithdrawals}</span>
            </div>

            {top3.map(renderTraderRow)}

            {restTraders.length === 0 ? null : loggedIn ? (
              restTraders.map(renderTraderRow)
            ) : (
              <div className="rank-blur-wrap">
                <div className="rank-blurred">{restTraders.map(renderTraderRow)}</div>
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

      <section className="section" style={{ maxWidth: 760, margin: "0 auto", paddingTop: 10 }}>
        <h2 style={{ fontSize: 22, textAlign: "center", marginBottom: 6 }}>{r.companiesTitle}</h2>
        <p className="sub" style={{ marginBottom: 24 }}>{r.companiesSubtitle}</p>

        {!checked ? null : !loggedIn ? (
          <div className="rank-table">
            <div className="rank-blur-wrap">
              <div className="rank-blurred">
                <div className="rank-row rank-row-4col rank-head">
                  <span>#</span>
                  <span>{r.colCompanyName}</span>
                  <span>{r.colAvgDaysPay}</span>
                  <span>{r.colTotalCommunityWd}</span>
                </div>
              </div>
              <div className="rank-blur-overlay">
                <div className="rank-blur-title">{r.companiesLockedTitle}</div>
                <div className="rank-blur-sub">{r.companiesLockedSub}</div>
                <Link href="/login" className="btn btn-primary">
                  {r.joinCta}
                </Link>
              </div>
            </div>
          </div>
        ) : companiesLoading ? (
          <div className="card" style={{ textAlign: "center", padding: 40 }}>
            <p className="sub" style={{ margin: 0 }}>{r.loading}</p>
          </div>
        ) : companies.length === 0 ? (
          <div className="card" style={{ textAlign: "center", padding: 40 }}>
            <p style={{ fontWeight: 700, marginBottom: 6 }}>{r.companiesNotEnoughTitle}</p>
            <p className="sub" style={{ margin: 0 }}>{r.companiesNotEnoughSub}</p>
          </div>
        ) : (
          <div className="rank-table">
            <div className="rank-row rank-row-4col rank-head">
              <span>#</span>
              <span>{r.colCompanyName}</span>
              <span>{r.colAvgDaysPay}</span>
              <span>{r.colTotalCommunityWd}</span>
            </div>
            {companies.map(renderCompanyRow)}
          </div>
        )}
      </section>

      <SiteFooter />
    </div>
  );
}
