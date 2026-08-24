-- Security check for The Archive.
-- Paste into the Supabase SQL editor and run. Each query prints what it should
-- say; anything different is worth fixing before it bites.
--
-- Threat model: the only people who may upload/delete are those whose email is
-- in ADMIN_EMAILS. Everyone else is a reader. The anon key is PUBLIC (it ships
-- in the /admin page), so nothing may be reachable with it except reading the
-- catalogue through the API.

-- 1) RLS must be ON for the documents table. ---------------------------------
--    Expected: rowsecurity = true
--    If false, anyone holding the public anon key can INSERT/DELETE rows
--    directly, bypassing the admin check entirely.
select schemaname, tablename, rowsecurity
from pg_tables
where tablename = 'documents';

-- 2) There must be NO policies on documents. ---------------------------------
--    Expected: 0 rows.
--    The app reaches the table only with the service-role key, which bypasses
--    RLS. Any policy here is a door for the anon/authenticated role.
select policyname, roles, cmd, qual, with_check
from pg_policies
where tablename = 'documents';

-- 3) There must be NO storage policies. --------------------------------------
--    Expected: 0 rows.
--    A policy such as "authenticated users can insert" would let ANY signed-up
--    account upload straight into the bucket without ever touching our API,
--    which is the main way the admin allowlist gets bypassed.
select policyname, roles, cmd, qual, with_check
from pg_policies
where schemaname = 'storage';

-- 4) The bucket must be private, and should cap size + MIME type. ------------
--    Expected: public = false
--               file_size_limit  set (e.g. 26214400 = 25 MB), not null
--               allowed_mime_types = {application/pdf}, not null
--    The API's content-type check is advisory only: the browser sets its own
--    header on the direct PUT, so only the bucket can actually enforce this.
select id, public, file_size_limit, allowed_mime_types
from storage.buckets;

-- 5) Review every auth account that exists. ----------------------------------
--    Expected: only people you recognise. An account you don't know that has
--    an email matching ADMIN_EMAILS is an active compromise.
--    email_confirmed_at must be non-null for anyone who can reach admin.
select
  email,
  email_confirmed_at,
  raw_app_meta_data ->> 'provider' as provider,
  created_at,
  last_sign_in_at
from auth.users
order by created_at desc;

-- 6) Orphans: rows whose file is gone, or files with no row. -----------------
--    Not a vulnerability, but a mismatch can indicate failed/partial uploads.
select count(*) as document_rows from public.documents;
select count(*) as stored_objects from storage.objects where bucket_id = 'documents';
