# The Archive

A PDF document archive built entirely on **Supabase** — no credit card, no
second vendor:

- **Supabase Storage** (private bucket) holds the PDFs.
- **Supabase Postgres** holds the metadata (title, year, kind, author, the
  storage path).

Free tier is **1 GB storage + 5 GB egress/month** and requires **no payment
method**. Cloudflare R2 gives more headroom (10 GB, free egress) but forces you
to link a credit card to switch it on, so for a small, card-free archive
Supabase alone is the cleaner fit. If you later outgrow it, the storage layer is
isolated behind four API routes and swapping in R2 is a small change.

Files never pass through the serverless function. The server mints a
**pre-authorized upload URL** and the browser PUTs the file straight to Storage,
so there's no request-body size limit. Reads go through a **short-lived signed
URL** so the bucket stays private. The browser holds no Supabase credentials at
all — every secret stays on the server.

```
Browser ──POST /api/upload-url──▶ Vercel ──sign──▶ { path, signedUrl }
Browser ──PUT file──────────────────────────────▶ Supabase Storage
Browser ──POST /api/documents──▶ Vercel ──insert─▶ Supabase (metadata row)

Reader  ──GET /api/view-url/:id▶ Vercel ──sign──▶ signed URL ──▶ Storage
```

## Stack

- Next.js 14 (App Router) on Vercel
- `@supabase/supabase-js` — server-only (service-role)
- Tailwind CSS

## Setup

### 1. Create a Supabase project

Free plan, no card. Then in the **SQL editor** run
[`supabase/schema.sql`](supabase/schema.sql). It:

- creates the `documents` table + index (RLS on, no policies — server-only
  access), and
- creates a **private** Storage bucket named `documents`.

(You can also make the bucket by hand: Storage → New bucket → name `documents`,
Public = **off**.)

### 2. Environment variables

Copy `.env.example` to `.env.local` and fill it in from Project Settings → API.
On Vercel, add the same variables in Project Settings → Environment Variables,
then **redeploy**.

- Only **three** vars, and all are **server-only** — the browser never receives
  a Supabase credential.
- `SUPABASE_URL` must include `https://`.
- `SUPABASE_SERVICE_ROLE_KEY` is the `service_role` secret (not the anon key).

### 3. Run

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Routes

| Route                | Method | Purpose                                              |
| -------------------- | ------ | ---------------------------------------------------- |
| `/api/upload-url`    | POST   | Mint a pre-authorized upload URL `{ path, signedUrl }`|
| `/api/documents`     | GET    | List entries (optional `?year=`)                     |
| `/api/documents`     | POST   | Insert a metadata row after the upload               |
| `/api/documents/:id` | DELETE | Remove the row **and** the Storage object            |
| `/api/view-url/:id`  | GET    | Sign a short-lived download URL for the reader        |

## Notes

- **Egress:** the free ceiling is 5 GB/month — roughly 1,250 views of a 4 MB
  PDF across everything. Fine for a low-traffic archive; upgrade if a document
  goes viral.
- **Idle pause:** free projects pause after 7 days with no request. A weekly
  Vercel Cron hitting `/api/documents` keeps it warm.
- **Growing past 1 GB / going card-free-but-bigger:** the alternative is Google
  Drive (15 GB free), but programmatic upload needs Google OAuth and a
  school-/org-managed Google account may have third-party app access disabled by
  an admin — verify that before committing to it.
