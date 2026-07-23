import { NextResponse } from "next/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { r2, R2_BUCKET } from "@/lib/r2";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/view-url/:id
 * Hands the reader a short-lived presigned GET URL for the PDF. The bucket
 * stays private — nobody can reach a file without going through this route.
 */
export async function GET(_req, { params }) {
  const { id } = params;

  const { data: doc, error } = await supabaseAdmin
    .from("documents")
    .select("r2_key, content_type")
    .eq("id", id)
    .single();

  if (error || !doc) {
    return NextResponse.json({ error: "Entry not found." }, { status: 404 });
  }

  try {
    const url = await getSignedUrl(
      r2,
      new GetObjectCommand({
        Bucket: R2_BUCKET,
        Key: doc.r2_key,
        ResponseContentType: doc.content_type || "application/pdf",
        ResponseContentDisposition: "inline",
      }),
      { expiresIn: 600 } // 10 minutes
    );
    return NextResponse.json({ url });
  } catch (e) {
    return NextResponse.json(
      { error: e.message || "Could not sign the view URL." },
      { status: 500 }
    );
  }
}
