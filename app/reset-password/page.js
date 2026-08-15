"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";
import { useLanguage } from "../../components/LanguageProvider";
import LangToggle from "../../components/LangToggle";

export default function ResetPasswordPage() {
  const router = useRouter();
  const { dict } = useLanguage();
  const r = dict.resetPassword;

  const [status, setStatus] = useState("checking"); // "checking" | "ready" | "invalid" | "done"
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    let settled = false;

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active || settled) return;
      if (event === "PASSWORD_RECOVERY" || (event === "SIGNED_IN" && session)) {
        settled = true;
        setStatus("ready");
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!active || settled) return;
      if (session) {
        settled = true;
        setStatus("ready");
      }
    });

    const timer = setTimeout(() => {
      if (!active || settled) return;
      settled = true;
      setStatus("invalid");
    }, 2500);

    return () => {
      active = false;
      clearTimeout(timer);
      listener.subscription.unsubscribe();
    };
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (password !== password2) {
      setError(r.mismatch);
      return;
    }
    if (password.length < 6) {
      setError(r.newPasswordPlaceholder);
      return;
    }

    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setStatus("done");
    setTimeout(() => {
      router.push("/dashboard");
    }, 1500);
  }

  return (
    <div className="auth-wrap">
      <div style={{ position: "fixed", top: 20, right: 20 }}>
        <LangToggle />
      </div>
      <div className="auth-card">
        <div className="brand" style={{ marginBottom: 22, justifyContent: "center" }}>
          <img src="/logo.png" alt="FundedOrbit" className="dot" />
          {r.brand}
        </div>

        {status === "checking" && <div className="msg ok">{r.checking}</div>}

        {status === "invalid" && (
          <>
            <div className="msg err">{r.invalidLink}</div>
            <button
              className="btn btn-primary btn-block"
              type="button"
              onClick={() => router.push("/login")}
            >
              {r.requestNew}
            </button>
          </>
        )}

        {status === "done" && <div className="msg ok">{r.successMsg}</div>}

        {status === "ready" && (
          <>
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 6 }}>{r.title}</div>
              <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>{r.subtitle}</div>
            </div>

            {error && <div className="msg err">{error}</div>}

            <form onSubmit={handleSubmit}>
              <div className="field">
                <label>{r.newPassword}</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={r.newPasswordPlaceholder}
                />
              </div>
              <div className="field">
                <label>{r.confirmPassword}</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password2}
                  onChange={(e) => setPassword2(e.target.value)}
                  placeholder={r.confirmPasswordPlaceholder}
                />
              </div>
              <button className="btn btn-primary btn-block" type="submit" disabled={loading}>
                {loading ? r.submitLoading : r.submit}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
