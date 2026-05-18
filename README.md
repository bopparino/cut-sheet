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
| `UPLOADS_DIR` | `./uploads` | Drawing/photo blob storage (planned) |

Copy `.env.example` → `.env.local` to override locally.

## PDF generation

The pipeline is intentionally simple: every ticket has a normal Next.js page at `/print/[id]/[ticket]` styled with Tailwind. The PDF endpoint launches a reusable headless Chromium, navigates back to that page over localhost, and pipes `page.pdf()` to the response. One styling pass covers both screen and paper.

## Domain notes

See `NOTES.md` for design rules carried over from v1 (qty-gating, attachments model, autosave behavior, lessons learned).
