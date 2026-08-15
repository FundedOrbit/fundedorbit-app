"use client";

import { useState } from "react";
import Link from "next/link";
import { useLanguage } from "./LanguageProvider";

export default function CouponsLink({ className, children }) {
  const [open, setOpen] = useState(false);
  const { dict } = useLanguage();
  const c = dict.coupons;

  return (
    <>
      <span className={className} style={{ cursor: "pointer" }} onClick={() => setOpen(true)}>
        {children}
      </span>
      {open && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}>
          <div className="modal-card">
            <button className="modal-close" onClick={() => setOpen(false)} type="button">
              ✕
            </button>
            <div className="icon-badge" style={{ marginBottom: 14 }}>🎟️</div>
            <h2 style={{ marginTop: 0 }}>{c.title}</h2>
            <p style={{ color: "var(--text-secondary)", lineHeight: 1.6, fontSize: 14 }}>{c.body}</p>
            <Link href="/login" className="btn btn-primary btn-block" onClick={() => setOpen(false)}>
              {c.cta}
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
