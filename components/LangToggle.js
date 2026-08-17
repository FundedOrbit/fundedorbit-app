"use client";

import { useLanguage } from "./LanguageProvider";

function FlagES() {
  return (
    <svg viewBox="0 0 3 2" width="22" height="15" style={{ display: "block", borderRadius: 3 }}>
      <rect width="3" height="2" fill="#AA151B" />
      <rect y="0.5" width="3" height="1" fill="#F1BF00" />
    </svg>
  );
}

function FlagUK() {
  return (
    <svg viewBox="0 0 60 36" width="22" height="15" style={{ display: "block", borderRadius: 3 }}>
      <rect width="60" height="36" fill="#00247d" />
      <path d="M0,0 L60,36 M60,0 L0,36" stroke="#fff" strokeWidth="6" />
      <path d="M0,0 L60,36 M60,0 L0,36" stroke="#cf142b" strokeWidth="2" />
      <path d="M30,0 V36 M0,18 H60" stroke="#fff" strokeWidth="10" />
      <path d="M30,0 V36 M0,18 H60" stroke="#cf142b" strokeWidth="6" />
    </svg>
  );
}

export default function LangToggle() {
  const { lang, setLang } = useLanguage();

  return (
    <div className="lang-toggle" role="group" aria-label="Language">
      <button
        type="button"
        className={`lang-opt ${lang === "es" ? "active" : ""}`}
        onClick={() => setLang("es")}
        title="Español"
        aria-label="Español"
      >
        <FlagES />
      </button>
      <button
        type="button"
        className={`lang-opt ${lang === "en" ? "active" : ""}`}
        onClick={() => setLang("en")}
        title="English"
        aria-label="English"
      >
        <FlagUK />
      </button>
    </div>
  );
}
