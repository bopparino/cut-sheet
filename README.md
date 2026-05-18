# Cut Sheet Form

Web cutsheet for stock-duct orders. Captures the full sheet, persists to SQLite, and generates three role-specific PDF tickets (Stock / Custom / Truck) server-side.

## Stack

- **Next.js 15** (App Router) with React 19 and TypeScript
- **Tailwind CSS v4** + **shadcn/ui** (new-york style, neutral base)
- **better-sqlite3** for persistence (single file, WAL mode)
- **Puppeteer** for HTML → PDF rendering; the `/print/[id]/[ticket]` route is the print view, the `/api/pdf/[id]/[ticket]` route is what Puppeteer prints to a PDF stream
- **Zod** for schema (data model lives in `src/lib/schema.ts`)

## Local dev

```sh
npm install
npm run dev
```

Open http://localhost:3000. The SQLite file lands at `./data/cutsheets.db` and the schema is created on first connect.

## Env vars

| Var | Default | Purpose |
| --- | --- | --- |
| `DATABASE_PATH` | `./data/cutsheets.db` | SQLite file location |
| `PUPPETEER_EXECUTABLE_PATH` | (unset) | Override Puppeteer's Chromium. Set to `/usr/bin/chromium` in Docker so we don't have to ship Puppeteer's bundled copy. |
| `PORT` | `3000` | HTTP port the Next server binds to. Railway sets this automatically. |

Copy `.env.example` → `.env.local` to override locally.

## PDF generation

The pipeline is intentionally simple: every ticket has a normal Next.js page at `/print/[id]/[ticket]` styled with Tailwind. The PDF endpoint launches a reusable headless Chromium, navigates back to that page over localhost, and pipes `page.pdf()` to the response. One styling pass covers both screen and paper.

## Railway deploy

The repo ships a `Dockerfile` (two-stage build with system Chromium for Puppeteer + Debian build tools for `better-sqlite3`'s native compile) and a `railway.json` that points Railway at it. To deploy:

1. **Connect this repo to a new Railway service.** Railway reads `railway.json`, sees `builder: DOCKERFILE`, and builds from the `Dockerfile` in the repo root. No nixpacks involved — the previous build-cache friction is gone.
2. **Attach a persistent Volume.** Railway containers have ephemeral disk; without a volume both the SQLite file *and* every uploaded photo/document blob wipe on every redeploy.
   - Service settings → Volumes → New Volume.
   - Mount path: `/data`.
3. **Set the environment variable** `DATABASE_PATH=/data/cutsheets.db` on the service. The schema migration auto-runs on first connect.
4. **Deploy.** The `/api/health` healthcheck confirms the service booted. Add your custom domain in Service Settings → Networking once the deploy is green.

The Dockerfile sets `PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium` and `PUPPETEER_SKIP_DOWNLOAD=true` itself; you don't have to set those on the service.

## Domain notes

See `NOTES.md` for design rules carried over from v1 (qty-gating, attachments model, autosave behavior, lessons learned).
