"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useLanguage } from "./LanguageProvider";

export default function CouponsLink({ className, children }) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { dict } = useLanguage();
  const c = dict.coupons;

  useEffect(() => {
    setMounted(true);
  }, []);

  const modal = open && (
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
  );

  return (
    <>
      <span className={className} style={{ cursor: "pointer" }} onClick={() => setOpen(true)}>
        {children}
      </span>
      {mounted && modal ? createPortal(modal, document.body) : null}
    </>
  );
}
