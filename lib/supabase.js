import { createClient } from "@supabase/supabase-js";

/**
 * Server-only Supabase client using the service-role key. This bypasses RLS
 * and is used to sign uploads/downloads and to write metadata rows. It must
 * NEVER be imported into a client component — only into the /api routes.
 */
export const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

/** The private Storage bucket that holds the PDFs. */
export const STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || "documents";
