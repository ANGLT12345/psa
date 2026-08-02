import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { supabaseAdmin, STORAGE_BUCKET } from "@/lib/supabase";
import { requireAdmin } from "@/lib/auth";

export const runtime = "nodejs";

/**
 * Step 1 of the upload. The browser asks for a signed upload token. The file
 * never touches this function — the browser uploads it straight to Supabase
 * Storage with the token — so there is no serverless body-size limit.
 * Admin-only.
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
    console.error("POST /api/upload-url sign failed:", error.message);
    return NextResponse.json({ error: "Could not start the upload." }, { status: 500 });
  }

  // data.signedUrl is an absolute, pre-authorized URL (the token is baked into
  // its query string). The browser just PUTs the file to it — no Supabase SDK
  // and no public env vars needed on the client.
  let signedUrl = data.signedUrl;
  if (!/^https?:\/\//i.test(signedUrl)) {
    const base = String(process.env.SUPABASE_URL).replace(/\/$/, "");
    signedUrl = `${base}/storage/v1${signedUrl.startsWith("/") ? "" : "/"}${signedUrl}`;
  }

  return NextResponse.json({ path: data.path, signedUrl });
}
