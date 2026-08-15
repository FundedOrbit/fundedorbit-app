"use client";

import Link from "next/link";
import { useLanguage } from "../../components/LanguageProvider";
import LangToggle from "../../components/LangToggle";

export default function ComoUsarPage() {
  const { dict } = useLanguage();
  const g = dict.comoUsar;

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
        <h1>{g.title}</h1>
      </section>
      <p className="guide-intro">{g.intro}</p>

      <section className="section" style={{ maxWidth: 760, margin: "0 auto", paddingTop: 0 }}>
        {g.sections.map((s) => (
          <div className="guide-section" key={s.heading}>
            <h3>{s.heading}</h3>
            <p>{s.body}</p>
          </div>
        ))}
      </section>

      <section className="section">
        <div className="cta-card">
          <h2>{dict.ctaCard.title}</h2>
          <p>{dict.ctaCard.sub}</p>
          <Link href="/login" className="btn btn-primary">
            {dict.ctaCard.button}
          </Link>
        </div>
      </section>

      <div className="footer-note">
        {dict.footerNote.replace("{year}", String(new Date().getFullYear()))}
      </div>
    </div>
  );
}
