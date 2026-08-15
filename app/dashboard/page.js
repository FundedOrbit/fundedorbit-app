"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";

export default function DashboardPage() {
  const router = useRouter();
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
    return <div className="auth-wrap">Cargando...</div>;
  }

  return (
    <div className="wrap">
      <nav className="nav">
        <div className="brand">
          <span className="dot" />
          FundedOrbit
        </div>
        <button className="btn btn-ghost" onClick={handleLogout}>
          Cerrar sesión
        </button>
      </nav>

      <section className="hero" style={{ padding: "60px 10px" }}>
        <h1>
          {profile?.avatar} Bienvenido, <span>{profile?.nickname}</span>
        </h1>
        <p>
          Tu cuenta está lista. El panel completo de cuentas fondeadas (el mismo que ya usas
          en tu versión local) se está migrando aquí — muy pronto vas a poder registrar y
          gestionar tus cuentas fondeadas desde fundedorbit.com.
        </p>
      </section>
    </div>
  );
}
