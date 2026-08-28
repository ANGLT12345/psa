"use client";

import React, { useState, useEffect, useRef } from "react";
import { INK, PAPER, BLUE, AMBER, MUTE, BORDER, FIELD_BG, FIELD_BORDER, DISPLAY, MONO, YEARS } from "@/lib/ui";
import ThemeToggle from "@/components/ThemeToggle";

/* ---------- helpers ---------- */
const catalogueId = (doc, i) => `${String(doc.year).slice(2)}-${String(i + 1).padStart(3, "0")}`;

// Title Case: lowercase everything, then capitalize the first letter of each
// word. (CSS `capitalize` can't do this because it never lowercases.)
const titleCase = (s = "") => s.toLowerCase().replace(/(^|\s)[a-z]/g, (m) => m.toUpperCase());

// Bump the suffix to show the intro again to everyone (e.g. if the text changes).
const INTRO_KEY = "archive:intro-seen:v1";

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
  const [confirming, setConfirming] = useState(null); // doc pending delete confirmation
  const [about, setAbout] = useState(false); // the module introduction
  const [firstVisit, setFirstVisit] = useState(false);

  // Show the introduction automatically the first time someone visits.
  useEffect(() => {
    try {
      if (!localStorage.getItem(INTRO_KEY)) {
        setFirstVisit(true);
        setAbout(true);
      }
    } catch {
      // Private browsing or storage blocked — just don't auto-open.
    }
  }, []);

  const closeAbout = () => {
    try {
      localStorage.setItem(INTRO_KEY, "1");
    } catch {}
    setAbout(false);
    setFirstVisit(false);
  };
  const [ready, setReady] = useState(false);
  const [loadErr, setLoadErr] = useState("");

  const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};

  const loadDocs = async () => {
    try {
      const { documents } = await jsonOrThrow(
        await fetch("/api/documents", { cache: "no-store" })
      );
      setDocs(documents || []);
      setLoadErr("");
      return documents || [];
    } catch (e) {
      setLoadErr(e.message);
      return null;
    } finally {
      setReady(true);
    }
  };

  useEffect(() => {
    loadDocs();
  }, []);

  // Throws on failure so the confirm dialog can surface the reason and stay open.
  const removeDoc = async (id) => {
    await jsonOrThrow(
      await fetch(`/api/documents/${id}`, { method: "DELETE", headers: authHeaders })
    );
    setDocs((prev) => prev.filter((x) => x.id !== id));
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
        {/* Two columns that never stack: title left, logo/controls right. */}
        <header className="px-5 md:px-10 pt-8 pb-6 flex items-start justify-between gap-4 md:gap-8">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] tracking-[0.3em] mb-2" style={{ fontFamily: MONO, color: MUTE }}>
              CATALOGUE / {year}
            </p>
            <h1 className="text-4xl md:text-6xl font-bold leading-[1.02] max-w-3xl" style={{ letterSpacing: "-0.035em" }}>
              SST X NIE Science Communication
            </h1>
          </div>
          <div className="shrink-0 flex flex-col items-end gap-3">
            <ThemeToggle />
            <img
              src="/logo.png"
              alt="SST Science Communication"
              className="h-12 md:h-20 w-auto max-w-[38vw] object-contain"
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
                onRemove={() => setConfirming(d)}
              />
            ))
          )}
        </main>
      </div>

      {admin && panel === "new" && (
        <NewEntry
          token={token}
          onCancel={() => setPanel(null)}
          onSaved={async (doc) => {
            if (!doc?.id) {
              alert("The entry did not come back from the server — nothing was saved.");
              return;
            }
            setPanel(null);
            setYear(doc.year);
            // Re-read from the server rather than trusting the optimistic add,
            // so a row that didn't really persist can't appear to have saved.
            const fresh = await loadDocs();
            if (fresh && !fresh.some((d) => d.id === doc.id)) {
              alert(
                "The entry was saved but is missing when re-read from the database. " +
                  "Reload the page; if it is still missing, tell Claude."
              );
            }
          }}
        />
      )}

      {admin && editing && (
        <EditEntry
          token={token}
          doc={editing}
          onCancel={() => setEditing(null)}
          onSaved={(updated) => {
            if (!updated?.id) {
              alert("The update did not come back from the server — nothing was changed.");
              return;
            }
            setDocs((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
            setYear(updated.year);
            setEditing(null);
          }}
        />
      )}

      {/* Persistent way back to the introduction, clear of the year rail. */}
      <button
        onClick={() => setAbout(true)}
        className="fixed bottom-4 left-20 md:left-28 z-40 text-[10px] tracking-widest px-3 py-2 border"
        style={{
          fontFamily: MONO,
          color: INK,
          borderColor: BORDER,
          background: FIELD_BG,
        }}
      >
        ABOUT
      </button>

      {about && <About firstVisit={firstVisit} onClose={closeAbout} />}

      {admin && confirming && (
        <ConfirmDelete
          doc={confirming}
          onCancel={() => setConfirming(null)}
          onConfirm={() => removeDoc(confirming.id)}
          onDone={() => setConfirming(null)}
        />
      )}
    </div>
  );
}

/* ---------- module introduction ---------- */
function About({ firstVisit, onClose }) {
  return (
    <Modal title="About this archive" onCancel={onClose} wide>
      <div className="space-y-4 text-[15px] leading-relaxed" style={{ color: INK }}>
        <p>
          Through a collaboration between School of Science and Technology (SST)&apos;s English
          Language Department and Dr Tan Aik Leng, Deputy Head of Teaching &amp; Curriculum
          Matters (Natural Sciences &amp; Science Education) at NIE, the Science Communication
          Module provides Secondary 4 IDP students with an authentic platform to develop their
          skills as effective science communicators.
        </p>
        <p>
          During the 10-week module, students learn to critically engage with scientific research
          and translate complex ideas into accessible and engaging popular science articles for a
          wider audience.
        </p>
        <p>
          The module culminates in a visit to NIE, where students gain first-hand insights into
          scientific research through a laboratory tour before presenting their work to NIE science
          researchers and their fellow IDP students. Drawing on the research papers they have
          explored, students communicate complex scientific concepts and research findings with
          clarity and confidence, while responding thoughtfully to questions from their audience.
        </p>
        <p>
          Through this authentic learning experience, students strengthen not only their scientific
          literacy and communication skills, but also their ability to communicate with confidence,
          purpose and impact.
        </p>
      </div>

      <div className="flex items-center gap-3 mt-7">
        <button
          onClick={onClose}
          className="text-[11px] tracking-widest px-5 py-2.5"
          style={{ fontFamily: MONO, background: BLUE, color: "#fff" }}
        >
          {firstVisit ? "GOT IT" : "CLOSE"}
        </button>
        {firstVisit && (
          <span className="text-[10px] tracking-wide" style={{ fontFamily: MONO, color: MUTE }}>
            REOPEN ANY TIME VIA “ABOUT”
          </span>
        )}
      </div>
    </Modal>
  );
}

/* ---------- delete confirmation (admin only) ---------- */
function ConfirmDelete({ doc, onConfirm, onCancel, onDone }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const go = async () => {
    setErr("");
    setBusy(true);
    try {
      await onConfirm();
      onDone();
    } catch (e) {
      setErr(e.message);
      setBusy(false);
    }
  };

  return (
    <Modal title="Delete this entry?" onCancel={busy ? () => {} : onCancel}>
      <p className="text-base font-bold mb-1" style={{ letterSpacing: "-0.01em" }}>
        {titleCase(doc.title)}
      </p>
      <p className="text-[11px] tracking-widest mb-4" style={{ fontFamily: MONO, color: MUTE }}>
        {doc.year} · {doc.author?.toUpperCase()}
      </p>
      <p className="text-sm mb-1" style={{ color: MUTE }}>
        This removes the catalogue entry <b>and permanently deletes the PDF</b> from
        storage.
      </p>
      <p className="text-sm" style={{ color: MUTE }}>
        It cannot be undone — the file would have to be uploaded again.
      </p>

      {err && (
        <p className="text-sm mt-3" style={{ color: "#B3261E" }}>
          {err}
        </p>
      )}

      <div className="flex gap-3 mt-6">
        <button
          onClick={go}
          disabled={busy}
          className="text-[11px] tracking-widest px-5 py-2.5 disabled:opacity-50"
          style={{ fontFamily: MONO, background: "#B3261E", color: "#fff" }}
        >
          {busy ? "DELETING…" : "DELETE PERMANENTLY"}
        </button>
        <button
          onClick={onCancel}
          disabled={busy}
          className="text-[11px] tracking-widest px-3 py-2.5 disabled:opacity-50"
          style={{ fontFamily: MONO, color: MUTE }}
        >
          CANCEL
        </button>
      </div>
    </Modal>
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
            style={{ letterSpacing: "-0.03em", color: hover ? BLUE : INK }}
          >
            {titleCase(doc.title)}
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
        <h1 className="text-3xl md:text-5xl font-bold leading-[1.05]" style={{ letterSpacing: "-0.04em" }}>
          {titleCase(doc.title)}
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

      // 2. Snapshot the file into memory first. Uploading the live File
      //    reference fails with net::ERR_UPLOAD_FILE_CHANGED if the file's
      //    on-disk timestamp changes mid-upload (common when it sits in a
      //    OneDrive/cloud-synced folder). An in-memory Blob can't change.
      setPhase("READING FILE…");
      let snapshot;
      try {
        snapshot = new Blob([await file.arrayBuffer()], { type: "application/pdf" });
      } catch {
        throw new Error("Couldn't read that file. If it's in a cloud-synced folder, copy it somewhere local (e.g. Downloads) and try again.");
      }

      // 3. Upload the snapshot straight to storage with a plain PUT — the file
      //    never passes through our function, so no body-size limit.
      setPhase("UPLOADING…");
      let put;
      try {
        put = await fetch(signedUrl, {
          method: "PUT",
          headers: { "Content-Type": "application/pdf" },
          body: snapshot,
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

      // 4. Record the metadata row.
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
function Modal({ title, children, onCancel, wide = false }) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4" style={{ background: "rgba(14,23,38,0.7)" }}>
      <div
        className={`w-full ${wide ? "max-w-2xl" : "max-w-lg"} p-6 md:p-8 mt-10 mb-10`}
        style={{ background: PAPER, color: INK }}
      >
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
