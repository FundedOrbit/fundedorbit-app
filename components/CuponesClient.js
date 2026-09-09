"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../lib/supabaseClient";
import { useLanguage } from "./LanguageProvider";
import SiteNav from "./SiteNav";
import SiteFooter from "./SiteFooter";
import AuthAwareCta from "./AuthAwareCta";

const EXNESS_URL = "https://one.exnessonelink.com/a/0r70joegie";

export default function CuponesClient() {
  const { dict } = useLanguage();
  const c = dict.coupons;
  const [loggedIn, setLoggedIn] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (active) {
        setLoggedIn(!!session);
        setChecked(true);
      }
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setLoggedIn(!!session);
    });
    return () => {
      active = false;
      listener?.subscription?.unsubscribe();
    };
  }, []);

  return (
    <div className="wrap">
      <SiteNav rightSlot={<AuthAwareCta />} />

      <section className="hero" style={{ padding: "50px 10px 10px" }}>
        <h1>{c.pageTitle}</h1>
        <p>{c.pageSubtitle}</p>
      </section>

      <section className="section" style={{ maxWidth: 700, margin: "0 auto" }}>
        <div className="card partner-card">
          <div className="partner-logo-plate">
            <img src="/exness-logo.png" alt="Exness" className="partner-logo" />
          </div>
          <div className="partner-tag">{c.exnessTag}</div>
          <h3 style={{ marginTop: 6 }}>{c.exnessName}</h3>
          <p>{c.exnessBody}</p>
          <a
            className="btn btn-primary partner-cta"
            href={EXNESS_URL}
            target="_blank"
            rel="noopener noreferrer nofollow sponsored"
          >
            {c.exnessCta}
          </a>
        </div>

        <p className="footer-note" style={{ margin: "20px 0 0" }}>{c.moreComingSoon}</p>

        {checked && !loggedIn && (
          <div className="card" style={{ textAlign: "center", marginTop: 24 }}>
            <h3 style={{ marginTop: 0 }}>{c.nudgeTitle}</h3>
            <p style={{ marginBottom: 18 }}>{c.nudgeBody}</p>
            <Link href="/login" className="btn btn-primary">
              {c.nudgeCta}
            </Link>
          </div>
        )}
      </section>

      <SiteFooter />
    </div>
  );
}
