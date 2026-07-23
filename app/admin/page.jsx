"use client";

import React, { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import Archive from "@/components/Archive";
import { INK, PAPER, BLUE, MUTE, DISPLAY, MONO } from "@/lib/ui";

/* Browser Supabase client — used ONLY for admin email login. The anon key is
   safe to expose. If the public env vars aren't set, we show a clear message
   instead of crashing. */
const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SB_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = SB_URL && SB_ANON ? createClient(SB_URL, SB_ANON) : null;

export default function AdminPage() {
  const [status, setStatus] = useState("loading"); // loading | signedout | denied | admin
  const [token, setToken] = useState(null);
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
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

  const sendLink = async () => {
    setMsg("");
    if (!email.trim()) return setMsg("Enter your email.");
    setBusy(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/admin` },
    });
    setBusy(false);
    if (error) return setMsg(error.message);
    setSent(true);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setToken(null);
    setSent(false);
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

  /* ---- signed out: email login ---- */
  return (
    <Shell>
      <h1 className="text-4xl font-bold mb-2" style={{ letterSpacing: "-0.03em" }}>
        Admin
      </h1>
      {sent ? (
        <p className="text-sm" style={{ color: MUTE }}>
          Check <b>{email}</b> for a sign-in link, then open it on this device.
        </p>
      ) : (
        <>
          <p className="text-sm mb-5" style={{ color: MUTE }}>
            Enter your email to get a one-time sign-in link.
          </p>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendLink()}
            placeholder="you@example.com"
            className="w-full px-3 py-2 text-sm bg-white border mb-3"
            style={{ borderColor: "#B6C2CF" }}
          />
          {msg && (
            <p className="text-sm mb-3" style={{ color: "#B3261E" }}>
              {msg}
            </p>
          )}
          <button
            onClick={sendLink}
            disabled={busy}
            className="text-[11px] tracking-widest px-5 py-2.5 disabled:opacity-50"
            style={{ fontFamily: MONO, background: BLUE, color: "#fff" }}
          >
            {busy ? "SENDING…" : "SEND LOGIN LINK"}
          </button>
        </>
      )}
    </Shell>
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
