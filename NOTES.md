# Cut Sheet Form — carry-over notes for the rebuild

Internal HVAC tool. Replaces the paper cutsheet for stock-duct orders — captures the full sheet, persists it, exports three role-specific PDF tickets.

## What survives the nuke

- `shared/src/schema.ts` — zod schema for the entire cutsheet payload. Source of truth for the data model.
- `shared/src/ticketRules.ts` — the rules that decide which row appears on which PDF (Stock / Custom / Truck). Pure function, easy to port.
- `shared/src/index.ts` — re-exports the above.

Everything else (React client, Express server, Railway config, workspace plumbing) is gone.

## Domain rules worth remembering

- **Three PDF tickets:** Stock Duct, Custom Duct, Truck Drivers. Per-row inclusion is in `ticketRules.ts`.
- **"qty > 0 to print":** the form has many more fields than any one PDF consumes. A row only appears on its target PDF if its quantity is greater than zero. The "form-only" fields persist on the saved cutsheet but never print — see `FormOnlySchema` in `schema.ts`.
- **Custom lines:** per-ticket free-text additions (label + qty + which PDF). Append to the bottom of the chosen ticket. Lives at `customLines` in the schema.
- **Attachments:** a single freehand drawing (canvas-based) plus 0..N photo uploads. Both stored as blobs in a separate `attachments` table — *not* inline in the payload JSON. The payload JSON's `attachments` array is a metadata cache only.
- **Plenum package:** small / large / none. Each option implies a fixed set of pre-built plenums — the labels live in the UI, not the schema, so re-derive them on the rebuild from the paper form.

## Useful UX notes from v1

- **Lot duplicate detection:** highlight cutsheets that share a lot number within ~2 weeks of each other's delivery date. Was a Kimmie-requested feature; worth keeping.
- **Autosave:** 1s debounce after the last edit, but *only* once the cutsheet has been created (POST). Don't autosave a blank "new" form — it litters the DB.
- **View toggle:** v1 had a 1:1 paper-form replica view and a card layout view. The 1:1 replica is what shop staff use; the card layout was an experimental modernized version. For the rebuild, decide whether both views are worth carrying or just do one well.
- **SQLite + uploads:** the DB file and the uploads dir both need persistent disk. On Railway that's a Volume mounted at `/data`; on a self-hosted box it's a real directory; on Fly.io it's a Volume too. Don't pick a serverless host.

## Engineering pitfalls we hit (don't repeat)

- **Zustand selectors that build a new array/object each read** (`.filter()`, `.map()`, spreads, `{...}`) cause "Maximum update depth exceeded" via `useSyncExternalStore`. Wrap them in `useShallow` from `zustand/react/shallow`, or hoist the raw collection and `useMemo` the derivation.
- **Never commit `*.tsbuildinfo`.** TypeScript reads it and skips emit, but `dist/` is gitignored, so on a fresh CI build you end up with no declaration files and cascading `TS7016` errors. Add `*.tsbuildinfo` to `.gitignore` from day one.
- **Avoid npm workspaces if deploying to Railway/Nixpacks** (or any builder that uses Docker cache mounts on `/app/node_modules/.cache`). `npm ci` fails with EBUSY against the mount, and workspace build orchestration interacts poorly with their build cache. For a small app, a single-package layout is simpler and deploys cleanly anywhere.
- **PDF rendering:** `@react-pdf/renderer` works but adds ~MB to the bundle. v1 lazy-loaded it on Export click — keep that pattern, or generate PDFs server-side instead.

## Suggested rebuild stack

Open question, not prescriptive:

- **Single package** (no workspaces). One `package.json`. Schema lives at `src/schema.ts`.
- **Stack:** Next.js or Remix if you want one framework that handles both UI and API; or keep Vite + a thin Express/Hono server if you prefer separation.
- **DB:** still SQLite via `better-sqlite3`, or Postgres if you're already setting one up on Railway. Schema is small enough that migration either way is trivial.
- **Deploy:** Fly.io (persistent volumes, no cold starts) or a self-hosted Mac mini / NUC behind Cloudflare Tunnel pointed at `cutsheets.metcalfehvac.com`. Avoid Railway if the build-cache friction continues.
- **UI/UX:** since a redesign is on the table, do the design pass (Figma or pen-and-paper) before writing code. The 1:1 paper replica was the v1 anchor; decide whether to keep it or commit to a modern layout.
