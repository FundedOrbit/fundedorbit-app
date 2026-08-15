"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";
import { useLanguage } from "../../components/LanguageProvider";
import LangToggle from "../../components/LangToggle";

export default function LoginPage() {
  const router = useRouter();
  const { dict } = useLanguage();
  const d = dict.login;
  const [mode, setMode] = useState("login"); // "login" | "signup"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setInfo("");
    setLoading(true);

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

  return (
    <div className="auth-wrap">
      <div style={{ position: "fixed", top: 20, right: 20 }}>
        <LangToggle />
      </div>
      <div className="auth-card">
        <div className="brand" style={{ marginBottom: 22, justifyContent: "center" }}>
          <span className="dot" />
          {d.brand}
        </div>

        <div className="auth-tabs">
          <div
            className={`auth-tab ${mode === "login" ? "active" : ""}`}
            onClick={() => setMode("login")}
          >
            {d.tabLogin}
          </div>
          <div
            className={`auth-tab ${mode === "signup" ? "active" : ""}`}
            onClick={() => setMode("signup")}
          >
            {d.tabSignup}
          </div>
        </div>

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
          <button className="btn btn-primary btn-block" type="submit" disabled={loading}>
            {loading ? d.submitLoading : mode === "signup" ? d.submitSignup : d.submitLogin}
          </button>
        </form>
      </div>
    </div>
  );
}
