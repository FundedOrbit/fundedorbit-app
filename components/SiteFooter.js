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
      <div className="footer-suggest">{f.featureRequest}</div>
      <div className="footer-social">
        <a
          href="https://www.instagram.com/fundedorbit/"
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-ghost footer-social-btn"
        >
          📷 {f.followInstagram}
        </a>
      </div>
      <div className="footer-donate">
        <div className="footer-donate-text">{f.donateText}</div>
        <a
          href="https://www.paypal.com/ncp/payment/RSGYMT96ELSE8"
          target="_blank"
          rel="noopener noreferrer"
          className="btn footer-donate-btn"
        >
          {f.donateBtn}
        </a>
      </div>
      <div className="footer-rights">{f.rights}</div>
    </div>
  );
}
