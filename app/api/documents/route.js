import { NextResponse } from "next/server";
import { supabaseAdmin, isConfigured } from "@/lib/supabase";
import { requireAdmin } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/documents            -> every entry, newest first
 * GET /api/documents?year=2026  -> just that year's shelf
 */
export async function GET(req) {
  if (!isConfigured) {
    console.error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not set in this environment.");
    return NextResponse.json(
      { error: "The server is missing its database configuration." },
      { status: 503 }
    );
  }

  const { searchParams } = new URL(req.url);
  const year = searchParams.get("year");

  // This endpoint is public, so select explicit columns: storage_path is an
  // internal detail and is never needed by the client (views go through
  // /api/view-url, which resolves the path server-side).
  let query = supabaseAdmin
    .from("documents")
    .select("id, title, author, year, summary, size_bytes, created_at")
    .order("created_at", { ascending: false });

  if (year) query = query.eq("year", Number(year));

  let data, error;
  try {
    ({ data, error } = await query);
  } catch (e) {
    // A thrown (rather than returned) error means we never reached Postgres at
    // all — the usual cause is a paused/unreachable Supabase project, which on
    // the free tier happens after 7 days with no database request.
    console.error("GET /api/documents could not reach the database:", e?.message || e);
    return NextResponse.json(
      {
        error:
          "Could not reach the database. If this is a free Supabase project it may be paused — restore it from the dashboard.",
        code: "unreachable",
      },
      { status: 503 }
    );
  }

  if (error) {
    console.error("GET /api/documents failed:", error.code, error.message, error.details || "");

    // A network-level failure comes back with no Postgres error code — we never
    // reached the database. On the free tier the usual cause is a paused
    // project (7 days with no database request), which must be restored by hand.
    if (!error.code || /fetch failed|network|ENOTFOUND|ECONNREFUSED/i.test(error.message || "")) {
      return NextResponse.json(
        {
          error:
            "Could not reach the database. If this is a free Supabase project it may be paused — restore it from the dashboard.",
          code: "unreachable",
        },
        { status: 503 }
      );
    }

    // Otherwise return just the Postgres error code — enough to diagnose
    // (42703 = missing column, 42P01 = missing table) without leaking schema.
    return NextResponse.json(
      { error: "Could not load the catalogue.", code: error.code },
      { status: 500 }
    );
  }
  return NextResponse.json({ documents: data });
}

/**
 * Step 3 of the upload. After the browser has PUT the file to R2, it posts the
 * metadata row here, including the r2_key returned by /api/upload-url.
 */
export async function POST(req) {
  const gate = await requireAdmin(req);
  if (gate.error) return NextResponse.json({ error: gate.error }, { status: gate.status });

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { title, author, year, summary, storage_path, size_bytes } = body || {};

  if (!title || !String(title).trim()) {
    return NextResponse.json({ error: "Every entry needs a title." }, { status: 400 });
  }
  if (!storage_path) {
    return NextResponse.json({ error: "Missing the uploaded file path." }, { status: 400 });
  }
  // Only accept paths shaped like the ones /api/upload-url mints
  // ("<year|misc>/<uuid>-<safe-filename>"), so a row can't be pointed at an
  // arbitrary object elsewhere in the bucket.
  const PATH_RE = /^(\d{4}|misc)\/[0-9a-f-]{36}-[\w.-]+$/i;
  if (!PATH_RE.test(String(storage_path))) {
    return NextResponse.json({ error: "Invalid file path." }, { status: 400 });
  }

  const yearNum = Number(year);
  if (!Number.isInteger(yearNum)) {
    return NextResponse.json({ error: "A valid year is required." }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("documents")
    .insert({
      title: String(title).trim(),
      author: String(author || "Unattributed").trim() || "Unattributed",
      year: yearNum,
      summary: summary ? String(summary).trim() : null,
      storage_path,
      content_type: "application/pdf",
      size_bytes: size_bytes ? Number(size_bytes) : null,
    })
    .select()
    .single();

  if (error) {
    console.error("POST /api/documents failed:", error.message);
    return NextResponse.json({ error: "Could not save the entry." }, { status: 500 });
  }
  return NextResponse.json({ document: data }, { status: 201 });
}
