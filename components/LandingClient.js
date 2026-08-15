"use client";

import Link from "next/link";
import { useLanguage } from "./LanguageProvider";
import SiteNav from "./SiteNav";
import SiteFooter from "./SiteFooter";
import AuthAwareCta from "./AuthAwareCta";

export default function LandingClient() {
  const { dict } = useLanguage();
  const d = dict;

  return (
    <div className="wrap">
      <SiteNav showAnchors rightSlot={<AuthAwareCta />} />

      <section className="hero">
        <h1>
          {d.hero.title1} <span>{d.hero.titleHighlight}</span>
        </h1>
        <p>{d.hero.subtitle}</p>
        <div className="hero-actions">
          <Link href="/login" className="btn btn-primary">
            {d.hero.ctaStart}
          </Link>
          <a href="#como-funciona" className="btn btn-ghost">
            {d.hero.ctaHow}
          </a>
        </div>
        <div className="hero-note">✓ {d.hero.freeNote}</div>
      </section>

      <section className="section" id="como-funciona">
        <h2>{d.featuresTitle}</h2>
        <p className="sub">{d.featuresSub}</p>
        <div className="grid-3">
          {d.features.map((f) => (
            <div className="card" key={f.title}>
              <div className="icon-badge">{f.icon}</div>
              <h3>{f.title}</h3>
              <p>{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="section" id="resenas">
        <h2>{d.reviewsTitle}</h2>
        <p className="sub">{d.reviewsSub}</p>
        <div className="grid-3">
          {d.reviews.map((r) => (
            <div className="review-card" key={r.name}>
              <div className="stars-row">
                {"★".repeat(r.stars)}
                {"☆".repeat(5 - r.stars)}
              </div>
              <p>&ldquo;{r.text}&rdquo;</p>
              <div className="review-author">{r.name}</div>
              <div className="review-role">{r.role}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="cta-card">
          <h2>{d.ctaCard.title}</h2>
          <p>{d.ctaCard.sub}</p>
          <Link href="/login" className="btn btn-primary">
            {d.ctaCard.button}
          </Link>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
