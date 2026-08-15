"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";
import { useLanguage } from "../../components/LanguageProvider";
import LangToggle from "../../components/LangToggle";

export default function LoginPage() {
  const router = useRouter();
  const { dict } = useLanguage();
  const d = dict.login;
  const [mode, setMode] = useState("login"); // "login" | "signup" | "forgot"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!active) return;
      if (session) {
        router.replace("/dashboard");
      } else {
        setCheckingSession(false);
      }
    });
    return () => {
      active = false;
    };
  }, [router]);

  function switchMode(next) {
    setMode(next);
    setError("");
    setInfo("");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setInfo("");
    setLoading(true);

    if (mode === "forgot") {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo:
          typeof window !== "undefined"
            ? `${window.location.origin}/reset-password`
            : "https://fundedorbit.com/reset-password",
      });
      setLoading(false);
      if (resetError) {
        setError(resetError.message);
        return;
      }
      setInfo(d.forgotSentMsg);
      return;
    }

    if (mode === "signup") {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo:
            typeof window !== "undefined"
              ? `${window.location.origin}/onboarding`
              : "https://fundedorbit.com/onboarding",
        },
      });
      setLoading(false);
      if (signUpError) {
        setError(signUpError.message);
        return;
      }
      if (data.session) {
        router.push("/onboarding");
      } else {
        setInfo(d.confirmEmailMsg);
      }
      return;
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setLoading(false);
    if (signInError) {
      setError(signInError.message);
      return;
    }
    router.push("/dashboard");
  }

  if (checkingSession) {
    return <div className="auth-wrap" />;
  }

  return (
    <div className="auth-wrap">
      <div style={{ position: "fixed", top: 20, right: 20 }}>
        <LangToggle />
      </div>
      <div className="auth-card">
        <div className="brand" style={{ marginBottom: 22, justifyContent: "center" }}>
          <img src="/logo.png" alt="FundedOrbit" className="dot" />
          {d.brand}
        </div>

        {mode !== "forgot" && (
          <div className="auth-tabs">
            <div
              className={`auth-tab ${mode === "login" ? "active" : ""}`}
              onClick={() => switchMode("login")}
            >
              {d.tabLogin}
            </div>
            <div
              className={`auth-tab ${mode === "signup" ? "active" : ""}`}
              onClick={() => switchMode("signup")}
            >
              {d.tabSignup}
            </div>
          </div>
        )}

        {mode === "forgot" && (
          <div style={{ marginBottom: 18 }}>
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 6 }}>{d.forgotTitle}</div>
            <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>{d.forgotSubtitle}</div>
          </div>
        )}

        {error && <div className="msg err">{error}</div>}
        {info && <div className="msg ok">{info}</div>}

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label>{d.email}</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={d.emailPlaceholder}
            />
          </div>
          {mode !== "forgot" && (
            <div className="field">
              <label>{d.password}</label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={d.passwordPlaceholder}
              />
            </div>
          )}
          {mode === "login" && (
            <div style={{ textAlign: "right", marginBottom: 14, marginTop: -6 }}>
              <button type="button" className="text-link" onClick={() => switchMode("forgot")}>
                {d.forgotPassword}
              </button>
            </div>
          )}
          <button className="btn btn-primary btn-block" type="submit" disabled={loading}>
            {loading
              ? mode === "forgot"
                ? d.forgotSubmitLoading
                : d.submitLoading
              : mode === "forgot"
              ? d.forgotSubmit
              : mode === "signup"
              ? d.submitSignup
              : d.submitLogin}
          </button>
        </form>

        {mode === "forgot" && (
          <div style={{ textAlign: "center", marginTop: 16 }}>
            <button type="button" className="text-link" onClick={() => switchMode("login")}>
              {d.backToLogin}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
