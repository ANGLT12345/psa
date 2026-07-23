-- The Archive — metadata table.
-- The PDFs themselves live in Cloudflare R2; this table only holds the
-- kilobytes of metadata plus the R2 object key that points at each file.

create extension if not exists "pgcrypto";

create table if not exists public.documents (
  id           uuid primary key default gen_random_uuid(),
  title        text        not null,
  author       text        not null default 'Unattributed',
  kind         text        not null,
  year         integer     not null,
  summary      text,
  r2_key       text        not null unique,
  content_type text        not null default 'application/pdf',
  size_bytes   bigint,
  created_at   timestamptz not null default now()
);

-- The year rail and the shelf both query by year, newest first.
create index if not exists documents_year_created_idx
  on public.documents (year, created_at desc);

-- RLS is enabled but no policies are defined, so anon/authenticated clients
-- get nothing. All access goes through the server routes using the
-- service-role key, which bypasses RLS. Add policies later if you introduce
-- Supabase Auth and want to read directly from the browser.
alter table public.documents enable row level security;
