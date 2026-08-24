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

There are two pages:

- **`/`** — the public, read-only catalogue. No upload controls, no login, no
  technical labels. The browser ships zero Supabase code here.
- **`/admin`** — a hidden page that adds the upload and remove tools, gated by
  an email allowlist (`ADMIN_EMAILS`) via **Sign in with Google**. The gate is
  enforced on the server, so the upload APIs reject anyone whose Google email
  isn't on the list — the hidden URL is just convenience, not the security.

Files never pass through the serverless function. The server mints a
**pre-authorized upload URL** and the browser PUTs the file straight to Storage,
so there's no request-body size limit. Reads go through a **short-lived signed
URL** so the bucket stays private.

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

- `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` are **server-only** (the
  `service_role` secret, not the anon key). `SUPABASE_URL` must include
  `https://`.
- `ADMIN_EMAILS` is a comma-separated allowlist of who may sign in at `/admin`
  and upload.
- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` are used **only by
  the `/admin` login page** (the anon key is meant to be public).

### Enable admin login (Sign in with Google)

1. **Google Cloud Console** → APIs & Services → Credentials → create an **OAuth
   client ID** (type: Web application). Under **Authorized redirect URIs** add:

   ```
   https://<your-project-ref>.supabase.co/auth/v1/callback
   ```

   Copy the **Client ID** and **Client secret**.

2. **Supabase dashboard** → Authentication → **Providers → Google** → enable it
   and paste the Client ID + secret.

3. **Supabase dashboard** → Authentication → **URL Configuration**:
   - **Site URL** → your production URL, e.g. `https://your-app.vercel.app`
   - **Redirect URLs** → add `https://your-app.vercel.app/**` and
     `http://localhost:3000/**`

Then visit `/admin`, click **Continue with Google**, and sign in with an account
whose email is in `ADMIN_EMAILS`.

### 3. Run

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Routes

| Route                | Method | Purpose                                              |
| -------------------- | ------ | ---------------------------------------------------- |
| `/api/upload-url`    | POST   | Mint a pre-authorized upload URL `{ path, signedUrl }` · **admin** |
| `/api/documents`     | GET    | List entries (optional `?year=`) · public            |
| `/api/documents`     | POST   | Insert a metadata row after the upload · **admin**   |
| `/api/documents/:id` | DELETE | Remove the row **and** the Storage object · **admin** |
| `/api/view-url/:id`  | GET    | Sign a short-lived download URL for the reader · public |
| `/api/admin/me`      | GET    | Report whether the caller is an allowlisted admin    |

"admin" routes require a `Bearer` access token from a Supabase session whose
email is in `ADMIN_EMAILS`.

## Notes

- **Egress:** the free ceiling is 5 GB/month — roughly 1,250 views of a 4 MB
  PDF across everything. Fine for a low-traffic archive; upgrade if a document
  goes viral.
- **Idle pause:** free Supabase projects pause after 7 days with no database
  request, and un-pausing is manual from the dashboard. [`vercel.json`](vercel.json)
  defines two Vercel Cron jobs (Mondays and Thursdays, 09:00 UTC) that hit
  `/api/documents` — each one runs a real query, which resets the 7-day timer.
  Two runs spaced 3–4 days apart means a single missed run still can't reach 7
  days. Note the Hobby plan allows **2 cron jobs per project** at a
  no-more-than-daily frequency, so this sits exactly at the limit.
- **Growing past 1 GB / going card-free-but-bigger:** the alternative is Google
  Drive (15 GB free), but programmatic upload needs Google OAuth and a
  school-/org-managed Google account may have third-party app access disabled by
  an admin — verify that before committing to it.
