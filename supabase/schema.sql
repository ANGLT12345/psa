-- The Archive — schema.
-- Both the PDFs and their metadata live in Supabase: the files in a private
-- Storage bucket, the metadata in this table (which holds the storage path
-- that points at each file).

create extension if not exists "pgcrypto";

-- 1. Metadata table -------------------------------------------------------
create table if not exists public.documents (
  id           uuid primary key default gen_random_uuid(),
  title        text        not null,
  author       text        not null default 'Unattributed',
  year         integer     not null,
  summary      text,
  storage_path text        not null unique,
  content_type text        not null default 'application/pdf',
  size_bytes   bigint,
  created_at   timestamptz not null default now()
);

-- The year rail and the shelf both query by year, newest first.
create index if not exists documents_year_created_idx
  on public.documents (year, created_at desc);

-- RLS is on with no policies, so anon/authenticated clients get nothing. All
-- access goes through the server routes using the service-role key, which
-- bypasses RLS. Add policies later if you introduce Supabase Auth.
alter table public.documents enable row level security;

-- 2. Private Storage bucket for the PDFs ----------------------------------
-- Not public: every read goes through a short-lived signed URL from the
-- /api/view-url route. Uploads use a one-time signed token from /api/upload-url.
-- (You can also create this bucket in the dashboard: Storage → New bucket →
--  name "documents", Public = off.)
insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;

-- No storage RLS policies are needed: the service-role key signs the uploads
-- and downloads, and clients only ever hold single-use signed tokens/URLs.
