import { supabaseAdmin, isConfigured } from "@/lib/supabase";

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
  if (!isConfigured) {
    return { error: "The server is missing its database configuration.", status: 503 };
  }

  const header = req.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return { error: "Not signed in.", status: 401 };

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data?.user) return { error: "Session is invalid or expired.", status: 401 };

  const user = data.user;

  // The allowlist is keyed on email, so an unverified email must never satisfy
  // it — otherwise anyone who can create an account claiming an admin's address
  // (e.g. if email confirmation is ever disabled on the Auth project) would be
  // let in. Google OAuth sets email_confirmed_at, so real admins are unaffected.
  const verified = Boolean(user.email_confirmed_at) || user.user_metadata?.email_verified === true;
  if (!verified) {
    return { error: "This account's email is not verified.", status: 403 };
  }

  const email = (user.email || "").toLowerCase();
  if (!adminEmails().includes(email)) {
    return { error: "This account is not an authorized admin.", status: 403 };
  }
  return { user };
}
