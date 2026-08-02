import { NextResponse } from "next/server";
import { supabaseAdmin, STORAGE_BUCKET } from "@/lib/supabase";
import { requireAdmin } from "@/lib/auth";

export const runtime = "nodejs";

/**
 * DELETE /api/documents/:id
 * Removes the metadata row and the underlying Storage object together, so we
 * don't leave orphaned PDFs eating the 1 GB bucket.
 */
/**
 * PATCH /api/documents/:id
 * Update an existing entry's metadata (not the file). Admin-only.
 */
export async function PATCH(req, { params }) {
  const gate = await requireAdmin(req);
  if (gate.error) return NextResponse.json({ error: gate.error }, { status: gate.status });

  const { id } = params;

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { title, author, year, summary } = body || {};
  if (!title || !String(title).trim()) {
    return NextResponse.json({ error: "Every entry needs a title." }, { status: 400 });
  }

  const yearNum = Number(year);
  if (!Number.isInteger(yearNum)) {
    return NextResponse.json({ error: "A valid year is required." }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("documents")
    .update({
      title: String(title).trim(),
      author: String(author || "Unattributed").trim() || "Unattributed",
      year: yearNum,
      summary: summary ? String(summary).trim() : null,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("PATCH /api/documents failed:", error.message);
    return NextResponse.json({ error: "Could not update the entry." }, { status: 500 });
  }
  if (!data) return NextResponse.json({ error: "Entry not found." }, { status: 404 });
  return NextResponse.json({ document: data });
}

export async function DELETE(req, { params }) {
  const gate = await requireAdmin(req);
  if (gate.error) return NextResponse.json({ error: gate.error }, { status: gate.status });

  const { id } = params;

  const { data: doc, error: readErr } = await supabaseAdmin
    .from("documents")
    .select("storage_path")
    .eq("id", id)
    .single();

  if (readErr || !doc) {
    return NextResponse.json({ error: "Entry not found." }, { status: 404 });
  }

  // Delete the object first; if this fails we keep the row so nothing silently
  // vanishes from the catalogue.
  const { error: rmErr } = await supabaseAdmin.storage
    .from(STORAGE_BUCKET)
    .remove([doc.storage_path]);

  if (rmErr) {
    console.error("DELETE storage.remove failed:", rmErr.message);
    return NextResponse.json({ error: "Could not remove the stored file." }, { status: 502 });
  }

  const { error: delErr } = await supabaseAdmin.from("documents").delete().eq("id", id);
  if (delErr) {
    console.error("DELETE /api/documents failed:", delErr.message);
    return NextResponse.json({ error: "Could not remove the entry." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
