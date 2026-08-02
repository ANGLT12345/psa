import { NextResponse } from "next/server";
import { supabaseAdmin, STORAGE_BUCKET } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/view-url/:id
 * Hands the reader a short-lived signed download URL for the PDF. The bucket
 * stays private — nobody can reach a file without going through this route.
 */
export async function GET(_req, { params }) {
  const { id } = params;

  const { data: doc, error } = await supabaseAdmin
    .from("documents")
    .select("storage_path")
    .eq("id", id)
    .single();

  if (error || !doc) {
    return NextResponse.json({ error: "Entry not found." }, { status: 404 });
  }

  const { data, error: signErr } = await supabaseAdmin.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(doc.storage_path, 3600); // 1 hour, so a viewing session doesn't expire mid-read

  if (signErr) {
    console.error("GET /api/view-url sign failed:", signErr.message);
    return NextResponse.json({ error: "Could not open this document." }, { status: 500 });
  }

  // Never cache this response: a cached (and later expired) signed URL is what
  // produces "InvalidJWT: exp claim timestamp check failed" on reopen.
  return NextResponse.json(
    { url: data.signedUrl },
    { headers: { "Cache-Control": "no-store, max-age=0" } }
  );
}
