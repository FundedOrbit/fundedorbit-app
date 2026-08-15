"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";

const AVATARS = ["🚀", "🛰️", "🪐", "🌙", "⭐", "☄️", "🌌", "🔭", "👨‍🚀", "👩‍🚀"];

const COUNTRIES = [
  { code: "MX", name: "México", flag: "🇲🇽" },
  { code: "US", name: "Estados Unidos", flag: "🇺🇸" },
  { code: "CO", name: "Colombia", flag: "🇨🇴" },
  { code: "AR", name: "Argentina", flag: "🇦🇷" },
  { code: "CL", name: "Chile", flag: "🇨🇱" },
  { code: "PE", name: "Perú", flag: "🇵🇪" },
  { code: "ES", name: "España", flag: "🇪🇸" },
  { code: "EC", name: "Ecuador", flag: "🇪🇨" },
  { code: "VE", name: "Venezuela", flag: "🇻🇪" },
  { code: "GT", name: "Guatemala", flag: "🇬🇹" },
  { code: "BR", name: "Brasil", flag: "🇧🇷" },
  { code: "OTHER", name: "Otro país", flag: "🌐" },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [nickname, setNickname] = useState("");
  const [avatar, setAvatar] = useState(AVATARS[0]);
  const [country, setCountry] = useState(COUNTRIES[0].name);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    async function check() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login");
        return;
      }
      setChecking(false);
    }
    check();
  }, [router]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!nickname.trim()) {
      setError("Elige un nickname.");
      return;
    }
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        nickname: nickname.trim(),
        avatar,
        country,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    setLoading(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    router.push("/dashboard");
  }

  if (checking) {
    return <div className="auth-wrap">Cargando...</div>;
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="brand" style={{ marginBottom: 6, justifyContent: "center" }}>
          <span className="dot" />
          FundedOrbit
        </div>
        <p style={{ textAlign: "center", color: "var(--text-muted)", fontSize: 13, marginBottom: 22 }}>
          Últimos datos para tu perfil
        </p>

        {error && <div className="msg err">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label>Nickname</label>
            <input
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="Como te verán en los rankings"
              maxLength={24}
            />
          </div>

          <div className="field">
            <label>Avatar</label>
            <div className="avatar-grid">
              {AVATARS.map((a) => (
                <div
                  key={a}
                  className={`avatar-opt ${avatar === a ? "selected" : ""}`}
                  onClick={() => setAvatar(a)}
                >
                  {a}
                </div>
              ))}
            </div>
          </div>

          <div className="field">
            <label>País</label>
            <select value={country} onChange={(e) => setCountry(e.target.value)}>
              {COUNTRIES.map((c) => (
                <option key={c.code} value={c.name}>
                  {c.flag} {c.name}
                </option>
              ))}
            </select>
          </div>

          <button className="btn btn-primary btn-block" type="submit" disabled={loading}>
            {loading ? "Guardando..." : "Terminar y entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}
