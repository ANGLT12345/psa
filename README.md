# The Archive

A PDF document archive that splits the two jobs the right way:

- **Cloudflare R2** holds the PDFs. Free tier is 10 GB storage, 1M writes /
  10M reads per month, and **$0 egress** — which is the part that matters, since
  every viewer streams the whole file. Beyond the free tier it's ~$0.015/GB/mo.
- **Supabase Postgres** holds the metadata (title, year, kind, author, the R2
  object key). That's kilobytes; 500 MB is enormous for this.

Files never pass through the serverless function. The browser uploads straight
to R2 with a **presigned PUT**, so there's no 4.5 MB body limit, and reads go
through a **short-lived presigned GET** so the bucket can stay private.

```
Browser ──POST /api/upload-url──▶ Vercel ──sign──▶ presigned PUT URL
Browser ──PUT file────────────────────────────────▶ Cloudflare R2
Browser ──POST /api/documents──▶ Vercel ──insert──▶ Supabase (metadata row)

Reader  ──GET /api/view-url/:id▶ Vercel ──sign──▶ presigned GET URL ──▶ R2
```

## Stack

- Next.js 14 (App Router) on Vercel
- `@aws-sdk/client-s3` + `s3-request-presigner` (R2 is S3-compatible)
- `@supabase/supabase-js` (service-role, server-only)
- Tailwind CSS

## Setup

### 1. Supabase

Create a project, then run [`supabase/schema.sql`](supabase/schema.sql) in the
SQL editor. It creates the `documents` table and an index. RLS is on with no
policies — all access is server-side via the service-role key.

### 2. Cloudflare R2

1. Create a bucket (e.g. `the-archive`). Keep it **private**.
2. Create an R2 API token with **Object Read & Write** on that bucket.
3. Add a **CORS policy** to the bucket so the browser's presigned PUT is
   allowed. In the bucket's Settings → CORS, add:

   ```json
   [
     {
       "AllowedOrigins": ["http://localhost:3000", "https://your-app.vercel.app"],
       "AllowedMethods": ["PUT", "GET"],
       "AllowedHeaders": ["content-type"],
       "MaxAgeSeconds": 3600
     }
   ]
   ```

   Without this, the direct-to-R2 upload fails with a CORS error in the browser.

### 3. Environment variables

Copy `.env.example` to `.env.local` and fill it in. On Vercel, add the same
variables in Project Settings → Environment Variables. The
`SUPABASE_SERVICE_ROLE_KEY` and R2 secret are server-only — they are never sent
to the browser.

### 4. Run

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Routes

| Route                       | Method | Purpose                                             |
| --------------------------- | ------ | --------------------------------------------------- |
| `/api/upload-url`           | POST   | Sign a presigned PUT; returns `{ uploadUrl, key }`  |
| `/api/documents`            | GET    | List entries (optional `?year=`)                    |
| `/api/documents`            | POST   | Insert a metadata row after the R2 upload           |
| `/api/documents/:id`        | DELETE | Remove the row **and** the R2 object                |
| `/api/view-url/:id`         | GET    | Sign a presigned GET for the reader                 |

## Notes

- **Keeping Supabase awake:** free projects pause after 7 days with no request.
  A low-traffic archive can go dark on its own. A weekly cron (Vercel Cron
  hitting `/api/documents`) keeps it warm, or upgrade to Pro if it's real.
- **Making the bucket public instead:** if the docs are meant to be
  world-readable, you can attach a custom domain to the bucket and iframe the
  public URL directly, skipping `/api/view-url`. Private + presigned GET (the
  default here) is the right call when they aren't.
