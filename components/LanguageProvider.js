"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { translations } from "../lib/i18n";

const LanguageContext = createContext({
  lang: "es",
  setLang: () => {},
  dict: translations.es,
});

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState("es");

  useEffect(() => {
    const saved = typeof window !== "undefined" ? window.localStorage.getItem("fo_lang") : null;
    if (saved === "en" || saved === "es") {
      setLangState(saved);
    }
  }, []);

  function setLang(next) {
    setLangState(next);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("fo_lang", next);
    }
  }

  const dict = translations[lang] || translations.es;

  return (
    <LanguageContext.Provider value={{ lang, setLang, dict }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
