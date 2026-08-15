"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";
import { useLanguage } from "../../components/LanguageProvider";
import LangToggle from "../../components/LangToggle";

export default function DashboardPage() {
  const router = useRouter();
  const { dict } = useLanguage();
  const d = dict.dashboard;
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login");
        return;
      }
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();

      if (data && !data.nickname) {
        router.push("/onboarding");
        return;
      }
      setProfile(data);
      setLoading(false);
    }
    load();
  }, [router]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  if (loading) {
    return <div className="auth-wrap">{d.loading}</div>;
  }

  return (
    <div className="wrap">
      <nav className="nav">
        <div className="brand">
          <span className="dot" />
          FundedOrbit
        </div>
        <div className="nav-right">
          <Link href="/como-usar" className="btn btn-ghost">
            {dict.nav.howToUse}
          </Link>
          <LangToggle />
          <button className="btn btn-ghost" onClick={handleLogout}>
            {dict.nav.logout}
          </button>
        </div>
      </nav>

      <section className="hero" style={{ padding: "60px 10px" }}>
        <h1>
          {profile?.avatar} {d.welcome} <span>{profile?.nickname}</span>
        </h1>
        <p>{d.placeholder}</p>
      </section>
    </div>
  );
}
