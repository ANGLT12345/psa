import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { r2, R2_BUCKET } from "@/lib/r2";

export const runtime = "nodejs";

/**
 * Step 1 of the upload. The browser asks for a short-lived presigned PUT URL.
 * The file never touches this function — the browser uploads it straight to
 * R2 — so there is no 4.5 MB serverless body limit to worry about.
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
  const key = `docs/${Number(year) || "misc"}/${randomUUID()}-${safe}`;

  try {
    const uploadUrl = await getSignedUrl(
      r2,
      new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: key,
        ContentType: "application/pdf",
      }),
      { expiresIn: 300 } // 5 minutes to complete the PUT
    );

    return NextResponse.json({ uploadUrl, key });
  } catch (e) {
    return NextResponse.json(
      { error: e.message || "Could not sign the upload URL." },
      { status: 500 }
    );
  }
}
