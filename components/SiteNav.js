"use client";

import { useState } from "react";
import Link from "next/link";
import { useLanguage } from "./LanguageProvider";
import LangToggle from "./LangToggle";
import CouponsLink from "./CouponsLink";

export default function SiteNav({ rightSlot, showAnchors, showDiscord }) {
  const [open, setOpen] = useState(false);
  const { dict } = useLanguage();

  function close() {
    setOpen(false);
  }

  return (
    <div className="nav-sticky">
      <div className="nav nav-inner">
        <Link href="/" className="brand" onClick={close}>
          <img src="/logo.png" alt="FundedOrbit" className="dot" />
          FundedOrbit
        </Link>

        <div className="nav-links nav-links-desktop">
          {showAnchors && (
            <>
              <a href="#como-funciona">{dict.nav.howItWorks}</a>
              <a href="#resenas">{dict.nav.reviews}</a>
            </>
          )}
          {showDiscord && (
            <a href="https://discord.gg/37FeZWwkUu" target="_blank" rel="noopener noreferrer">
              {dict.nav.discord}
            </a>
          )}
          <CouponsLink>{dict.nav.coupons}</CouponsLink>
          <Link href="/ranking">{dict.ranking.navLabel}</Link>
          <Link href="/como-usar">{dict.nav.howToUse}</Link>
        </div>

        <div className="nav-right">
          <LangToggle />
          {rightSlot}
          <button className="burger-btn" onClick={() => setOpen((o) => !o)} type="button" aria-label="Menu">
            <span />
            <span />
            <span />
          </button>
        </div>
      </div>

      {open && (
        <div className="mobile-menu">
          {showAnchors && (
            <>
              <a href="#como-funciona" className="mobile-menu-link" onClick={close}>
                {dict.nav.howItWorks}
              </a>
              <a href="#resenas" className="mobile-menu-link" onClick={close}>
                {dict.nav.reviews}
              </a>
            </>
          )}
          {showDiscord && (
            <a
              href="https://discord.gg/37FeZWwkUu"
              target="_blank"
              rel="noopener noreferrer"
              className="mobile-menu-link"
              onClick={close}
            >
              {dict.nav.discord}
            </a>
          )}
          <CouponsLink className="mobile-menu-link">{dict.nav.coupons}</CouponsLink>
          <Link href="/ranking" className="mobile-menu-link" onClick={close}>
            {dict.ranking.navLabel}
          </Link>
          <Link href="/como-usar" className="mobile-menu-link" onClick={close}>
            {dict.nav.howToUse}
          </Link>
        </div>
      )}
    </div>
  );
}
