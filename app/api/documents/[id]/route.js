import { NextResponse } from "next/server";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { r2, R2_BUCKET } from "@/lib/r2";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

/**
 * DELETE /api/documents/:id
 * Removes the metadata row and the underlying R2 object together, so we don't
 * leave orphaned PDFs paying storage in the bucket.
 */
export async function DELETE(_req, { params }) {
  const { id } = params;

  const { data: doc, error: readErr } = await supabaseAdmin
    .from("documents")
    .select("r2_key")
    .eq("id", id)
    .single();

  if (readErr || !doc) {
    return NextResponse.json({ error: "Entry not found." }, { status: 404 });
  }

  // Delete the object first; if R2 is unreachable we keep the row so nothing
  // silently vanishes from the catalogue.
  try {
    await r2.send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: doc.r2_key }));
  } catch (e) {
    return NextResponse.json(
      { error: `Could not remove the file from R2: ${e.message}` },
      { status: 502 }
    );
  }

  const { error: delErr } = await supabaseAdmin.from("documents").delete().eq("id", id);
  if (delErr) {
    return NextResponse.json({ error: delErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
