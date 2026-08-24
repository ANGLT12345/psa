import { createClient } from "@supabase/supabase-js";

/** True when the server has the credentials it needs to talk to Supabase. */
export const isConfigured = Boolean(
  process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Server-only Supabase client using the service-role key. This bypasses RLS
 * and is used to sign uploads/downloads and to write metadata rows. It must
 * NEVER be imported into a client component — only into the /api routes.
 *
 * Built lazily so a missing env var surfaces as a clear "not configured"
 * response instead of throwing at module load (which shows up as an opaque 500).
 */
export const supabaseAdmin = isConfigured
  ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    })
  : null;

/** The private Storage bucket that holds the PDFs. */
export const STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || "documents";
