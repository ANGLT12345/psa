import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/documents            -> every entry, newest first
 * GET /api/documents?year=2026  -> just that year's shelf
 */
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const year = searchParams.get("year");

  let query = supabaseAdmin
    .from("documents")
    .select("*")
    .order("created_at", { ascending: false });

  if (year) query = query.eq("year", Number(year));

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ documents: data });
}

/**
 * Step 3 of the upload. After the browser has PUT the file to R2, it posts the
 * metadata row here, including the r2_key returned by /api/upload-url.
 */
export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { title, author, kind, year, summary, r2_key, size_bytes } = body || {};

  if (!title || !String(title).trim()) {
    return NextResponse.json({ error: "Every entry needs a title." }, { status: 400 });
  }
  if (!r2_key) {
    return NextResponse.json({ error: "Missing the uploaded file key." }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("documents")
    .insert({
      title: String(title).trim(),
      author: String(author || "Unattributed").trim() || "Unattributed",
      kind: kind || "REFERENCE",
      year: Number(year),
      summary: summary ? String(summary).trim() : null,
      r2_key,
      content_type: "application/pdf",
      size_bytes: size_bytes ? Number(size_bytes) : null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ document: data }, { status: 201 });
}
