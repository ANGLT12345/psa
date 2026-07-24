"use client";

import React, { useState, useEffect, useRef } from "react";
import { INK, PAPER, BLUE, AMBER, MUTE, BORDER, FIELD_BG, FIELD_BORDER, DISPLAY, MONO, YEARS } from "@/lib/ui";
import ThemeToggle from "@/components/ThemeToggle";

/* ---------- helpers ---------- */
const catalogueId = (doc, i) => `${String(doc.year).slice(2)}-${String(i + 1).padStart(3, "0")}`;

async function jsonOrThrow(res) {
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || `Request failed (${res.status}).`);
  return body;
}

/**
 * The catalogue. Read-only by default; pass admin + token to enable the
 * upload and remove tools (used only by the hidden /admin page).
 */
export default function Archive({ admin = false, token = null }) {
  const [docs, setDocs] = useState([]);
  const [year, setYear] = useState(2026);
  const [open, setOpen] = useState(null);
  const [panel, setPanel] = useState(null); // 'new'
  const [editing, setEditing] = useState(null); // doc being edited
  const [ready, setReady] = useState(false);
  const [loadErr, setLoadErr] = useState("");

  const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};

  const loadDocs = async () => {
    try {
      const { documents } = await jsonOrThrow(await fetch("/api/documents"));
      setDocs(documents || []);
      setLoadErr("");
    } catch (e) {
      setLoadErr(e.message);
    } finally {
      setReady(true);
    }
  };

  useEffect(() => {
    loadDocs();
  }, []);

  const removeDoc = async (id) => {
    const prev = docs;
    setDocs(docs.filter((x) => x.id !== id)); // optimistic
    try {
      await jsonOrThrow(await fetch(`/api/documents/${id}`, { method: "DELETE", headers: authHeaders }));
    } catch (e) {
      setDocs(prev); // roll back
      alert(e.message);
    }
  };

  const shown = docs.filter((d) => d.year === year);
  const totalBytes = docs.reduce((sum, d) => sum + (d.size_bytes || 0), 0);
  const usedMB = totalBytes / 1e6;
  const usedLabel = usedMB >= 1000 ? `${(usedMB / 1000).toFixed(2)} GB` : `${usedMB.toFixed(1)} MB`;

  if (open) return <Reader doc={open} onBack={() => setOpen(null)} />;

  return (
    <div className="archive-enter min-h-screen flex" style={{ background: PAPER, color: INK, fontFamily: DISPLAY }}>
      {/* year rail */}
      <aside
        className="w-16 md:w-24 shrink-0 flex flex-col items-center justify-start gap-2 py-6 border-r"
        style={{ borderColor: BORDER }}
      >
        {YEARS.map((y) => {
          const active = y === year;
          return (
            <button
              key={y}
              onClick={() => setYear(y)}
              className="w-full py-6 transition-colors"
              style={{ background: active ? INK : "transparent", color: active ? PAPER : MUTE }}
            >
              <span
                className="block text-lg md:text-2xl font-bold"
                style={{ writingMode: "vertical-rl", transform: "rotate(180deg)", letterSpacing: "0.08em", margin: "0 auto" }}
              >
                {y}
              </span>
              <span className="block mt-3 text-[10px]" style={{ fontFamily: MONO, color: active ? AMBER : "#9AA7B6" }}>
                {docs.filter((d) => d.year === y).length}
              </span>
            </button>
          );
        })}
      </aside>

      <div className="flex-1 min-w-0">
        <header className="px-5 md:px-10 pt-8 pb-6 flex flex-wrap items-start justify-between gap-4">
          <div className="order-2 md:order-1">
            <p className="text-[10px] tracking-[0.3em] mb-2" style={{ fontFamily: MONO, color: MUTE }}>
              CATALOGUE / {year}
            </p>
            <h1 className="text-4xl md:text-6xl font-bold leading-[1.02] max-w-3xl" style={{ letterSpacing: "-0.035em" }}>
              SST-IDP Pop Science Articles
            </h1>
          </div>
          <div className="order-1 md:order-2 flex flex-col items-end gap-3">
            <ThemeToggle />
            <img
              src="/logo.png"
              alt="SST Science Communication"
              className="h-24 md:h-32 w-auto"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
            {admin && (
              <>
                <button
                  onClick={() => setPanel("new")}
                  className="text-[11px] tracking-widest px-4 py-2"
                  style={{ fontFamily: MONO, background: INK, color: PAPER }}
                >
                  + NEW ENTRY
                </button>
                <p className="text-[10px] tracking-wide text-right" style={{ fontFamily: MONO, color: MUTE }}>
                  {docs.length} {docs.length === 1 ? "FILE" : "FILES"} · {usedLabel} / 1 GB
                </p>
              </>
            )}
          </div>
        </header>

        <div className="h-px mx-5 md:mx-10" style={{ background: INK }} />

        <main className="px-5 md:px-10 pb-24">
          {!ready ? (
            <p className="py-20 text-sm" style={{ fontFamily: MONO, color: MUTE }}>
              READING CATALOGUE…
            </p>
          ) : loadErr ? (
            <div className="py-20 max-w-md">
              <p className="text-sm mb-3" style={{ fontFamily: MONO, color: "#B3261E" }}>
                COULD NOT REACH THE CATALOGUE
              </p>
              <p className="text-sm mb-5" style={{ color: MUTE }}>
                {loadErr}
              </p>
              <button
                onClick={() => {
                  setReady(false);
                  loadDocs();
                }}
                className="text-[11px] tracking-widest px-4 py-2"
                style={{ fontFamily: MONO, background: INK, color: PAPER }}
              >
                RETRY
              </button>
            </div>
          ) : shown.length === 0 ? (
            <div className="py-24 max-w-md">
              <p className="text-2xl font-bold mb-2" style={{ letterSpacing: "-0.02em" }}>
                Nothing filed under {year}{admin ? "." : " yet."}
              </p>
              {admin && (
                <>
                  <p className="text-sm mb-5" style={{ color: MUTE }}>
                    Upload a PDF and it lands here.
                  </p>
                  <button
                    onClick={() => setPanel("new")}
                    className="text-[11px] tracking-widest px-4 py-2"
                    style={{ fontFamily: MONO, background: BLUE, color: "#fff" }}
                  >
                    START THE {year} SHELF
                  </button>
                </>
              )}
            </div>
          ) : (
            shown.map((d, i) => (
              <Row
                key={d.id}
                doc={d}
                idx={catalogueId(d, i)}
                admin={admin}
                onOpen={() => setOpen(d)}
                onEdit={() => setEditing(d)}
                onRemove={() => removeDoc(d.id)}
              />
            ))
          )}
        </main>
      </div>

      {admin && panel === "new" && (
        <NewEntry
          token={token}
          onCancel={() => setPanel(null)}
          onSaved={(doc) => {
            setDocs((prev) => [doc, ...prev]);
            setYear(doc.year);
            setPanel(null);
          }}
        />
      )}

      {admin && editing && (
        <EditEntry
          token={token}
          doc={editing}
          onCancel={() => setEditing(null)}
          onSaved={(updated) => {
            setDocs((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
            setYear(updated.year);
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

/* ---------- row ---------- */
function Row({ doc, idx, admin, onOpen, onEdit, onRemove }) {
  const [hover, setHover] = useState(false);
  return (
    <div
      className="relative border-b"
      style={{ borderColor: "#CDD6E0" }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <button onClick={onOpen} className="w-full text-left py-6 md:py-8 flex items-baseline gap-4 md:gap-8">
        <span className="text-[11px] shrink-0 w-16" style={{ fontFamily: MONO, color: hover ? BLUE : MUTE }}>
          {idx}
        </span>
        <span className="flex-1 min-w-0">
          <span
            className="block text-xl md:text-3xl font-bold leading-tight transition-colors"
            style={{ letterSpacing: "-0.03em", color: hover ? BLUE : INK, textTransform: "capitalize" }}
          >
            {doc.title}
          </span>
          {doc.summary && (
            <span className="block mt-1.5 text-sm max-w-2xl" style={{ color: MUTE }}>
              {doc.summary}
            </span>
          )}
        </span>
        <span className="hidden md:block text-[10px] tracking-widest shrink-0 text-right" style={{ fontFamily: MONO, color: MUTE }}>
          {doc.author?.toUpperCase()}
        </span>
      </button>
      {admin && hover && (
        <div className="absolute right-0 top-2 flex gap-3">
          <button
            onClick={onEdit}
            className="text-[10px] tracking-widest px-2 py-1"
            style={{ fontFamily: MONO, color: BLUE }}
          >
            EDIT
          </button>
          <button
            onClick={onRemove}
            className="text-[10px] tracking-widest px-2 py-1"
            style={{ fontFamily: MONO, color: "#B3261E" }}
          >
            REMOVE
          </button>
        </div>
      )}
    </div>
  );
}

/* ---------- reader ---------- */
function Reader({ doc, onBack }) {
  const [src, setSrc] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { url } = await jsonOrThrow(await fetch(`/api/view-url/${doc.id}`, { cache: "no-store" }));
        if (alive) setSrc(url);
      } catch (e) {
        if (alive) setErr(e.message);
      }
    })();
    return () => {
      alive = false;
    };
  }, [doc.id]);

  return (
    <div className="archive-enter min-h-screen" style={{ background: PAPER, color: INK, fontFamily: DISPLAY }}>
      <div className="px-5 md:px-10 py-5 flex items-center justify-between">
        <button onClick={onBack} className="text-[11px] tracking-widest" style={{ fontFamily: MONO, color: BLUE }}>
          ← BACK TO CATALOGUE
        </button>
        <div className="flex items-center gap-3">
          <span className="text-[11px] tracking-widest" style={{ fontFamily: MONO, color: MUTE }}>
            {doc.year}
          </span>
          <ThemeToggle />
        </div>
      </div>

      <div className="px-5 md:px-10 pb-6 max-w-4xl">
        <h1 className="text-3xl md:text-5xl font-bold leading-[1.05]" style={{ letterSpacing: "-0.04em", textTransform: "capitalize" }}>
          {doc.title}
        </h1>
        {doc.summary && (
          <p className="mt-3 text-base md:text-lg" style={{ color: MUTE }}>
            {doc.summary}
          </p>
        )}
        <p className="mt-3 text-[11px] tracking-widest" style={{ fontFamily: MONO, color: MUTE }}>
          CURATED BY {doc.author?.toUpperCase()}
        </p>
      </div>

      <div className="px-2 md:px-10 pb-10" onContextMenu={(e) => e.preventDefault()}>
        {err ? (
          <div className="p-8 bg-white text-black">
            <p className="font-bold mb-1">Couldn't open this file.</p>
            <p className="text-sm" style={{ color: MUTE }}>
              {err}
            </p>
          </div>
        ) : src ? (
          // #toolbar=0 hides the browser PDF top bar; page=1 + view=FitH open
          // at the top of the first page, fit to width (not scrolled/centered).
          <iframe
            src={`${src}#page=1&view=FitH&toolbar=0&navpanes=0&statusbar=0`}
            title={doc.title}
            className="w-full h-[82vh] bg-white"
          />
        ) : (
          <div className="p-8 bg-white text-black">
            <p className="text-sm" style={{ fontFamily: MONO, color: MUTE }}>
              OPENING…
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- new entry (admin only) ---------- */
function NewEntry({ token, onSaved, onCancel }) {
  const [f, setF] = useState({ title: "", author: "", year: 2026, summary: "" });
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState("");
  const [err, setErr] = useState("");
  const picker = useRef(null);

  const set = (k) => (e) => setF({ ...f, [k]: k === "year" ? Number(e.target.value) : e.target.value });
  const field = "w-full px-3 py-2 text-sm border";
  const fieldStyle = { borderColor: FIELD_BORDER, background: FIELD_BG, color: INK };
  const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};

  const submit = async () => {
    setErr("");
    if (!f.title.trim()) return setErr("Every entry needs a title.");
    if (!file) return setErr("Choose a PDF to upload.");
    if (file.type !== "application/pdf") return setErr("That file isn't a PDF.");

    const author = f.author.trim() || "Unattributed";
    setBusy(true);
    try {
      // 1. Ask the server for a pre-authorized upload URL.
      setPhase("PREPARING…");
      const { path, signedUrl } = await jsonOrThrow(
        await fetch("/api/upload-url", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeaders },
          body: JSON.stringify({ filename: file.name, contentType: "application/pdf", year: f.year }),
        })
      );

      // 2. Upload the file straight to storage with a plain PUT — the file
      //    never passes through our function, so no body-size limit.
      setPhase("UPLOADING…");
      let put;
      try {
        put = await fetch(signedUrl, {
          method: "PUT",
          headers: { "Content-Type": "application/pdf" },
          body: file,
        });
      } catch {
        // fetch() rejects (not an HTTP error) on network/CORS problems.
        throw new Error(
          "Couldn't reach storage to upload (network blocked, offline, or a CORS issue). Try again, or check that the Storage bucket allows uploads from this site."
        );
      }
      if (!put.ok) {
        const raw = await put.text().catch(() => "");
        let detail = raw;
        try {
          detail = JSON.parse(raw).message || detail;
        } catch {}
        throw new Error(`Upload failed (${put.status})${detail ? `: ${detail}` : ""}.`);
      }

      // 3. Record the metadata row.
      setPhase("SAVING…");
      const { document } = await jsonOrThrow(
        await fetch("/api/documents", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeaders },
          body: JSON.stringify({
            title: f.title,
            author,
            year: f.year,
            summary: f.summary,
            storage_path: path,
            size_bytes: file.size,
          }),
        })
      );

      onSaved(document);
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
      setPhase("");
    }
  };

  return (
    <Modal title="New entry" onCancel={onCancel}>
      <div className="mb-4">
        <input
          ref={picker}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={(e) => setFile(e.target.files[0])}
        />
        <button
          onClick={() => picker.current?.click()}
          className="w-full py-8 border-2 border-dashed text-sm"
          style={{ borderColor: FIELD_BORDER, color: MUTE }}
        >
          {file ? `${file.name} · ${(file.size / 1e6).toFixed(1)} MB` : "Choose a PDF from your computer"}
        </button>
        <p className="mt-2 text-[10px] tracking-wide" style={{ fontFamily: MONO, color: MUTE }}>
          PDF FILES ONLY
        </p>
      </div>

      <Field label="Title">
        <input className={field} style={fieldStyle} value={f.title} onChange={set("title")} />
      </Field>

      <Field label="Year">
        <select className={field} style={fieldStyle} value={f.year} onChange={set("year")}>
          {YEARS.map((y) => (
            <option key={y}>{y}</option>
          ))}
        </select>
      </Field>

      <Field label="Curated by">
        <input className={field} style={fieldStyle} value={f.author} onChange={set("author")} />
      </Field>

      <Field label="Summary">
        <textarea
          className={field}
          style={fieldStyle}
          rows={4}
          value={f.summary}
          onChange={set("summary")}
        />
      </Field>

      {err && (
        <p className="text-sm mt-3" style={{ color: "#B3261E" }}>
          {err}
        </p>
      )}

      <div className="flex gap-3 mt-6">
        <button
          onClick={submit}
          disabled={busy}
          className="text-[11px] tracking-widest px-5 py-2.5 disabled:opacity-50"
          style={{ fontFamily: MONO, background: BLUE, color: "#fff" }}
        >
          {busy ? phase || "WORKING…" : "FILE IT"}
        </button>
        <button onClick={onCancel} className="text-[11px] tracking-widest px-3 py-2.5" style={{ fontFamily: MONO, color: MUTE }}>
          CANCEL
        </button>
      </div>
    </Modal>
  );
}

/* ---------- edit entry (admin only) ---------- */
function EditEntry({ token, doc, onSaved, onCancel }) {
  const [f, setF] = useState({
    title: doc.title || "",
    author: doc.author === "Unattributed" ? "" : doc.author || "",
    year: doc.year || YEARS[0],
    summary: doc.summary || "",
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const set = (k) => (e) => setF({ ...f, [k]: k === "year" ? Number(e.target.value) : e.target.value });
  const field = "w-full px-3 py-2 text-sm border";
  const fieldStyle = { borderColor: FIELD_BORDER, background: FIELD_BG, color: INK };
  const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};

  const submit = async () => {
    setErr("");
    if (!f.title.trim()) return setErr("Every entry needs a title.");
    const author = f.author.trim() || "Unattributed";
    setBusy(true);
    try {
      const { document } = await jsonOrThrow(
        await fetch(`/api/documents/${doc.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", ...authHeaders },
          body: JSON.stringify({ title: f.title, author, year: f.year, summary: f.summary }),
        })
      );
      onSaved(document);
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title="Edit entry" onCancel={onCancel}>
      <Field label="Title">
        <input className={field} style={fieldStyle} value={f.title} onChange={set("title")} />
      </Field>

      <Field label="Year">
        <select className={field} style={fieldStyle} value={f.year} onChange={set("year")}>
          {YEARS.map((y) => (
            <option key={y}>{y}</option>
          ))}
        </select>
      </Field>

      <Field label="Curated by">
        <input className={field} style={fieldStyle} value={f.author} onChange={set("author")} />
      </Field>

      <Field label="Summary">
        <textarea
          className={field}
          style={fieldStyle}
          rows={4}
          value={f.summary}
          onChange={set("summary")}
        />
      </Field>

      {err && (
        <p className="text-sm mt-3" style={{ color: "#B3261E" }}>
          {err}
        </p>
      )}

      <div className="flex gap-3 mt-6">
        <button
          onClick={submit}
          disabled={busy}
          className="text-[11px] tracking-widest px-5 py-2.5 disabled:opacity-50"
          style={{ fontFamily: MONO, background: BLUE, color: "#fff" }}
        >
          {busy ? "SAVING…" : "SAVE CHANGES"}
        </button>
        <button onClick={onCancel} className="text-[11px] tracking-widest px-3 py-2.5" style={{ fontFamily: MONO, color: MUTE }}>
          CANCEL
        </button>
      </div>
    </Modal>
  );
}

/* ---------- shells ---------- */
function Modal({ title, children, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4" style={{ background: "rgba(14,23,38,0.7)" }}>
      <div className="w-full max-w-lg p-6 mt-10 mb-10" style={{ background: PAPER, color: INK }}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-2xl font-bold" style={{ letterSpacing: "-0.03em" }}>
            {title}
          </h2>
          <button onClick={onCancel} className="text-[11px]" style={{ fontFamily: MONO, color: MUTE }}>
            ESC
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block mb-3">
      <span className="block text-[10px] tracking-[0.2em] mb-1.5" style={{ fontFamily: MONO, color: MUTE }}>
        {label.toUpperCase()}
      </span>
      {children}
    </label>
  );
}
