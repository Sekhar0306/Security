# Sentryline

A passive web/mobile application security scanner with a findings dashboard, JSON API, and CLI —
built with Next.js (App Router), Tailwind, and Prisma/Postgres. Deploys to Vercel.

**Scope of checks:** HTTPS enforcement, security headers (HSTS, CSP, X-Frame-Options,
X-Content-Type-Options, Referrer-Policy, Permissions-Policy), cookie flags (Secure, HttpOnly,
SameSite), server/version disclosure, common exposed paths (`.env`, `.git/config`, etc.), and
mixed-content detection. All checks are passive HTTP requests — the same kind a browser makes —
with no exploitation, injection, or brute forcing.

**Only scan applications you own or have explicit permission to test.**

## Project layout

```
app/
  page.tsx              landing page
  dashboard/page.tsx     web app: run scans, view & triage findings
  api/scan/route.ts       POST — run a scan, persist results
  api/findings/route.ts   GET  — list scan history
  api/findings/[id]/route.ts  PATCH — update a finding's status
lib/scanner.ts            the scanning engine (shared logic reference)
lib/prisma.ts             Prisma client singleton
cli/scan.js                standalone CLI, no build step required
prisma/schema.prisma       Scan / Finding models
```

## 1. Local setup

```bash
npm install
cp .env.example .env      # then fill in DATABASE_URL
npx prisma migrate dev --name init
npm run dev
```

Visit `http://localhost:3000` for the landing page, `http://localhost:3000/dashboard` for the app.

You need a Postgres database. Free options that work well here:
- **Vercel Postgres** (Storage tab in your Vercel project → Postgres → copy `DATABASE_URL`)
- **Neon** (neon.tech) — free tier, works with Prisma out of the box
- **Supabase** — use the "connection pooling" URI for serverless

## 2. Using the CLI

The CLI is self-contained (no Prisma/build step needed) and can run anywhere Node 18+ is installed:

```bash
node cli/scan.js https://example.com
node cli/scan.js example.com --json
node cli/scan.js example.com --api https://your-deployed-app.vercel.app   # also saves to the dashboard
```

Good candidate for a CI step (e.g. a GitHub Actions job that scans a staging URL on every deploy).

## 3. Deploying to Vercel

**Option A — via GitHub (recommended):**
1. Push this project to a new GitHub repo.
2. Go to [vercel.com/new](https://vercel.com/new) and import the repo.
3. In the project's **Storage** tab, add a Postgres database (or paste your Neon/Supabase URL as
   the `DATABASE_URL` environment variable under **Settings → Environment Variables**).
4. Deploy. Vercel will run `npm run build`, which runs `prisma generate` automatically.
5. After the first deploy, run the migration against your production database once:
   ```bash
   npx prisma migrate deploy
   ```
   (run this locally with `DATABASE_URL` pointed at production, or via `vercel env pull` first)

**Option B — via Vercel CLI:**
```bash
npm i -g vercel
vercel          # first deploy, follow prompts
vercel env add DATABASE_URL production
vercel --prod
```

## 4. Extending it

- Add auth (e.g. NextAuth) before exposing this publicly — right now anyone with the URL can
  trigger scans and see findings.
- Add scheduled re-scans via a Vercel Cron job hitting `/api/scan` for saved targets.
- Add rate limiting on `/api/scan` to avoid the endpoint being used to hammer arbitrary URLs.
