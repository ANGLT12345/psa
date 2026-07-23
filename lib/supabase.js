import { createClient } from "@supabase/supabase-js";

/**
 * Server-only Supabase client using the service-role key. This bypasses RLS,
 * so it must NEVER be imported into a client component — only into API routes
 * that run on the server. The metadata table lives here; the PDFs live in R2.
 */
export const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);
