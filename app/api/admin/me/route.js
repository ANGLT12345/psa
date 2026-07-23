import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/admin/me
 * Tells the admin page whether the current session belongs to an allowlisted
 * admin, so it can show the upload tools or a "not authorized" message.
 */
export async function GET(req) {
  const gate = await requireAdmin(req);
  if (gate.error) return NextResponse.json({ admin: false, error: gate.error }, { status: gate.status });
  return NextResponse.json({ admin: true, email: gate.user.email });
}
