import { NextResponse } from "next/server";
import { supabaseAdmin, STORAGE_BUCKET } from "@/lib/supabase";

export const runtime = "nodejs";

/**
 * DELETE /api/documents/:id
 * Removes the metadata row and the underlying Storage object together, so we
 * don't leave orphaned PDFs eating the 1 GB bucket.
 */
export async function DELETE(_req, { params }) {
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
    return NextResponse.json(
      { error: `Could not remove the file from Storage: ${rmErr.message}` },
      { status: 502 }
    );
  }

  const { error: delErr } = await supabaseAdmin.from("documents").delete().eq("id", id);
  if (delErr) {
    return NextResponse.json({ error: delErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
