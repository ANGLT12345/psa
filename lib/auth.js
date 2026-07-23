import { supabaseAdmin } from "@/lib/supabase";

/** The allowlist of admin emails, from the ADMIN_EMAILS env var (comma-separated). */
export function adminEmails() {
  return (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Verify that a request comes from a signed-in, allowlisted admin.
 * The browser sends the Supabase session's access token as a Bearer token;
 * we validate it and check the email against ADMIN_EMAILS. This is the real
 * security boundary — the hidden /admin URL is just convenience.
 *
 * Returns { user } on success, or { error, status } to return to the client.
 */
export async function requireAdmin(req) {
  const header = req.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return { error: "Not signed in.", status: 401 };

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data?.user) return { error: "Session is invalid or expired.", status: 401 };

  const email = (data.user.email || "").toLowerCase();
  if (!adminEmails().includes(email)) {
    return { error: "This account is not an authorized admin.", status: 403 };
  }
  return { user: data.user };
}
