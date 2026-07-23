import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { supabaseAdmin, STORAGE_BUCKET } from "@/lib/supabase";

export const runtime = "nodejs";

/**
 * Step 1 of the upload. The browser asks for a signed upload token. The file
 * never touches this function — the browser uploads it straight to Supabase
 * Storage with the token — so there is no serverless body-size limit.
 */
export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { filename, contentType, year } = body || {};

  if (contentType !== "application/pdf") {
    return NextResponse.json({ error: "Only PDF uploads are allowed." }, { status: 400 });
  }

  const safe = String(filename || "document.pdf").replace(/[^\w.-]+/g, "-");
  const path = `${Number(year) || "misc"}/${randomUUID()}-${safe}`;

  const { data, error } = await supabaseAdmin.storage
    .from(STORAGE_BUCKET)
    .createSignedUploadUrl(path);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // The browser uses { path, token } with storage.uploadToSignedUrl(...).
  return NextResponse.json({ path: data.path, token: data.token });
}
