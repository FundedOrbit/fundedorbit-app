"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../lib/supabaseClient";
import { useLanguage } from "./LanguageProvider";

export default function AuthAwareCta({ className = "btn btn-primary" }) {
  const { dict } = useLanguage();
  const [loggedIn, setLoggedIn] = useState(null);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (active) setLoggedIn(!!session);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setLoggedIn(!!session);
    });
    return () => {
      active = false;
      listener?.subscription?.unsubscribe();
    };
  }, []);

  if (loggedIn === null) {
    return <span className={className} style={{ visibility: "hidden" }}>{dict.nav.login}</span>;
  }

  return loggedIn ? (
    <Link href="/dashboard" className={className}>{dict.nav.dashboard}</Link>
  ) : (
    <Link href="/login" className={className}>{dict.nav.login}</Link>
  );
}
