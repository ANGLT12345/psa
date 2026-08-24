-- Security check for The Archive.
--
-- Threat model: only people whose email is in ADMIN_EMAILS may upload, edit, or
-- delete. Everyone else is a reader. The anon key is PUBLIC (it ships in the
-- /admin page), so nothing may be reachable with it except reading the
-- catalogue through the API.
--
-- NOTE: the Supabase SQL editor only displays the result of the LAST statement.
-- Run PART 1 on its own (select just that block and hit Run) to see every check
-- in a single table.

-- ===========================================================================
-- PART 1 — one-shot summary. Run this block by itself.
-- ===========================================================================
select 'RLS enabled on documents' as check,
       case when bool_or(rowsecurity) then 'PASS' else 'FAIL — RLS is OFF' end as status,
       'anon key could write directly if off' as detail
from pg_tables
where tablename = 'documents'

union all
select 'No policies on documents',
       case when count(*) = 0 then 'PASS' else 'REVIEW — ' || count(*)::text || ' policy' end,
       coalesce(string_agg(policyname, ', '), 'none')
from pg_policies
where tablename = 'documents'

union all
select 'No storage policies',
       case when count(*) = 0 then 'PASS' else 'REVIEW — ' || count(*)::text || ' policy' end,
       coalesce(string_agg(policyname, ', '), 'none')
from pg_policies
where schemaname = 'storage'

union all
select 'Bucket is private',
       case when bool_or(public) then 'FAIL — BUCKET IS PUBLIC' else 'PASS' end,
       coalesce(string_agg(
         id || ': size_limit=' || coalesce(file_size_limit::text, 'NONE') ||
         ', mime=' || coalesce(allowed_mime_types::text, 'NONE'), ' | '), 'no buckets')
from storage.buckets

union all
select 'Auth accounts',
       count(*)::text || ' account(s)',
       coalesce(string_agg(
         coalesce(email, '(no email)') ||
         case when email_confirmed_at is null then ' [UNCONFIRMED]' else '' end, ', '), 'none')
from auth.users

union all
select 'Catalogue rows vs stored files',
       case when (select count(*) from public.documents)
               = (select count(*) from storage.objects where bucket_id = 'documents')
            then 'PASS' else 'MISMATCH — orphans exist' end,
       (select count(*)::text from public.documents) || ' rows / ' ||
       (select count(*)::text from storage.objects where bucket_id = 'documents') || ' files';

-- ===========================================================================
-- PART 2 — find orphaned files (stored but not in the catalogue).
-- These are usually left behind by an upload whose metadata insert failed.
-- They are invisible in the app but still consume the 1 GB quota.
-- ===========================================================================
select o.name as orphaned_file,
       round((o.metadata ->> 'size')::numeric / 1048576, 2) as size_mb,
       o.created_at
from storage.objects o
left join public.documents d on d.storage_path = o.name
where o.bucket_id = 'documents'
  and d.id is null
order by o.created_at desc;

-- To delete the orphans listed above, from the Supabase dashboard:
--   Storage → documents → tick the files → Delete.
-- (Deleting through the dashboard is safer than a SQL delete, which would
--  remove the row but not the underlying object.)

-- ===========================================================================
-- PART 3 — the reverse: catalogue rows whose file is missing.
-- These show in the app but fail to open.
-- ===========================================================================
select d.id, d.title, d.storage_path, d.created_at
from public.documents d
left join storage.objects o
  on o.name = d.storage_path and o.bucket_id = 'documents'
where o.id is null
order by d.created_at desc;
