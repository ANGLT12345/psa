"use client";

import React, { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import Archive from "@/components/Archive";
import { INK, PAPER, MUTE, DISPLAY, MONO } from "@/lib/ui";

/* Browser Supabase client — used ONLY for admin email login. The anon key is
   safe to expose. If the public env vars aren't set, we show a clear message
   instead of crashing. */
const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SB_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = SB_URL && SB_ANON ? createClient(SB_URL, SB_ANON) : null;

export default function AdminPage() {
  const [status, setStatus] = useState("loading"); // loading | signedout | denied | admin
  const [token, setToken] = useState(null);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  // Verify a session against the server allowlist.
  const check = async (session) => {
    if (!session) {
      setStatus("signedout");
      return;
    }
    const t = session.access_token;
    try {
      const res = await fetch("/api/admin/me", { headers: { Authorization: `Bearer ${t}` } });
      if (res.ok) {
        setToken(t);
        setStatus("admin");
      } else {
        setStatus("denied");
      }
    } catch {
      setStatus("denied");
    }
  };

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => check(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => check(session));
    return () => sub.subscription.unsubscribe();
  }, []);

  const signIn = async () => {
    setMsg("");
    setBusy(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/admin` },
    });
    // On success the browser redirects to Google; only errors return here.
    if (error) {
      setBusy(false);
      setMsg(error.message);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setToken(null);
    setStatus("signedout");
  };

  /* ---- config missing ---- */
  if (!supabase) {
    return (
      <Shell>
        <h1 className="text-3xl font-bold mb-3" style={{ letterSpacing: "-0.03em" }}>
          Admin isn't configured
        </h1>
        <p className="text-sm" style={{ color: MUTE }}>
          Set <code>NEXT_PUBLIC_SUPABASE_URL</code> and <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> (plus{" "}
          <code>ADMIN_EMAILS</code> on the server) and redeploy.
        </p>
      </Shell>
    );
  }

  /* ---- authorized: show the catalogue with tools ---- */
  if (status === "admin") {
    return (
      <div style={{ background: PAPER, minHeight: "100vh" }}>
        <div
          className="flex items-center justify-between px-5 md:px-10 py-2"
          style={{ background: INK, color: PAPER, fontFamily: MONO }}
        >
          <span className="text-[10px] tracking-widest">ADMIN</span>
          <button onClick={signOut} className="text-[10px] tracking-widest" style={{ color: "#FFC53D" }}>
            SIGN OUT
          </button>
        </div>
        <Archive admin token={token} />
      </div>
    );
  }

  /* ---- signed in but not on the allowlist ---- */
  if (status === "denied") {
    return (
      <Shell>
        <h1 className="text-3xl font-bold mb-3" style={{ letterSpacing: "-0.03em" }}>
          Not authorized
        </h1>
        <p className="text-sm mb-5" style={{ color: MUTE }}>
          This account isn't on the admin list.
        </p>
        <button
          onClick={signOut}
          className="text-[11px] tracking-widest px-4 py-2"
          style={{ fontFamily: MONO, background: INK, color: PAPER }}
        >
          SIGN OUT
        </button>
      </Shell>
    );
  }

  /* ---- loading ---- */
  if (status === "loading") {
    return (
      <Shell>
        <p className="text-sm" style={{ fontFamily: MONO, color: MUTE }}>
          LOADING…
        </p>
      </Shell>
    );
  }

  /* ---- signed out: Google login ---- */
  return (
    <Shell>
      <h1 className="text-4xl font-bold mb-2" style={{ letterSpacing: "-0.03em" }}>
        Admin
      </h1>
      <p className="text-sm mb-5" style={{ color: MUTE }}>
        Sign in with your authorized Google account.
      </p>
      {msg && (
        <p className="text-sm mb-3" style={{ color: "#B3261E" }}>
          {msg}
        </p>
      )}
      <button
        onClick={signIn}
        disabled={busy}
        className="flex items-center gap-3 px-5 py-2.5 bg-white border disabled:opacity-50"
        style={{ borderColor: "#B6C2CF" }}
      >
        <GoogleMark />
        <span className="text-[11px] tracking-widest" style={{ fontFamily: MONO, color: INK }}>
          {busy ? "REDIRECTING…" : "CONTINUE WITH GOOGLE"}
        </span>
      </button>
    </Shell>
  );
}

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z"
      />
    </svg>
  );
}

function Shell({ children }) {
  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{ background: PAPER, color: INK, fontFamily: DISPLAY }}
    >
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}
