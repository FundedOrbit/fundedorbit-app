"use client";

import { useLanguage } from "./LanguageProvider";

export default function SiteFooter() {
  const { dict } = useLanguage();
  const f = dict.footer;

  return (
    <div className="site-footer">
      <div className="footer-note">
        {dict.footerNote.replace("{year}", String(new Date().getFullYear()))}
      </div>
      <div className="footer-contact">
        {f.contact}: <a href="mailto:fundedorbit@gmail.com">fundedorbit@gmail.com</a>
      </div>
      <div className="footer-rights">{f.rights}</div>
    </div>
  );
}
