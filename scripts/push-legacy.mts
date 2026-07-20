/**
 * Push an assembled legacy bundle to a running cutsheet app (local or prod)
 * through the admin import endpoint, in idempotent chunks.
 *
 *   1. npx tsx scripts/import-legacy.ts <dirs-or-json...> --emit bundle.json
 *   2. CUTSHEET_SESSION=<cookie value> npx tsx scripts/push-legacy.ts bundle.json https://<host> \
 *        [--update] [--drawings <dir>]
 *
 * CUTSHEET_SESSION is the value of the `cutsheet_session` cookie from a
 * logged-in ADMIN browser session (DevTools > Application > Cookies).
 * Chunks are safe to re-run: the server's legacy_imports ledger skips
 * anything already imported, so a dropped connection just means running
 * the same command again.
 *
 * --update asks the server to refresh already-imported sheets in place from
 * the bundle (the "Access wins" re-import mode) instead of skipping them.
 * --drawings <dir> also pushes the fittings whiteboard PNGs extracted by
 * scripts/extract-drawings.py (reads <dir>/manifest.json); those upsert by
 * (cutsheet, filename) on the server, so re-pushes refresh rather than
 * duplicate.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

const argv = process.argv.slice(2);
const update = argv.includes("--update");
const drawingsIdx = argv.indexOf("--drawings");
const drawingsDir = drawingsIdx >= 0 ? argv[drawingsIdx + 1] : null;
const positional = argv.filter(
  // drawingsIdx is -1 when --drawings is absent; -1 + 1 = 0 was silently
  // eating the first positional arg (the bundle path).
  (a, i) => a !== "--update" && a !== "--drawings" && (drawingsIdx < 0 || i !== drawingsIdx + 1),
);
const [bundlePath, baseUrl] = positional;
const session = process.env.CUTSHEET_SESSION;
if (!bundlePath || !baseUrl || !session) {
  console.error(
    "usage: CUTSHEET_SESSION=<cookie> npx tsx scripts/push-legacy.ts <bundle.json> <base-url> [--update] [--drawings <dir>]",
  );
  process.exit(1);
}

const SHEET_CHUNK = 250;
const ATTACHMENT_CHUNK_BYTES = 4_000_000; // base64 payload per POST, well under any proxy limit

const endpoint = `${baseUrl.replace(/\/$/, "")}/api/admin/import-legacy`;
const mode = update ? "update" : undefined;

async function post(body: unknown, what: string) {
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: `cutsheet_session=${session}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    console.error(`${what}: HTTP ${res.status} - ${await res.text()}`);
    console.error("Fix the problem and re-run this exact command; finished chunks are idempotent.");
    process.exit(1);
  }
  return (await res.json()) as {
    imported: number;
    updated?: number;
    skipped: number;
    attached?: number;
    unmatched?: number;
  };
}

const { sheets } = JSON.parse(readFileSync(bundlePath, "utf8")) as { sheets: unknown[] };
console.log(`${sheets.length} sheets in ${bundlePath} -> ${baseUrl}${update ? " (update mode)" : ""}`);

let imported = 0;
let updated = 0;
let skipped = 0;
for (let i = 0; i < sheets.length; i += SHEET_CHUNK) {
  const out = await post(
    { mode, sheets: sheets.slice(i, i + SHEET_CHUNK) },
    `sheet chunk ${i / SHEET_CHUNK + 1}`,
  );
  imported += out.imported;
  updated += out.updated ?? 0;
  skipped += out.skipped;
  console.log(
    `sheets ${i / SHEET_CHUNK + 1}/${Math.ceil(sheets.length / SHEET_CHUNK)}: ` +
      `+${out.imported} imported, ~${out.updated ?? 0} updated, ${out.skipped} skipped`,
  );
}
console.log(`sheets done: ${imported} imported, ${updated} updated, ${skipped} skipped`);

if (drawingsDir) {
  type Entry = { key: string; label: string; file: string };
  const manifest = JSON.parse(readFileSync(join(drawingsDir, "manifest.json"), "utf8")) as Entry[];
  console.log(`${manifest.length} drawings in ${drawingsDir}`);
  const pngCache = new Map<string, string>(); // file -> base64 (clones share content)
  let attached = 0;
  let unmatched = 0;
  let batch: { key: string; filename: string; mime: string; dataBase64: string }[] = [];
  let batchBytes = 0;
  let sent = 0;

  const flush = async () => {
    if (batch.length === 0) return;
    sent++;
    const out = await post({ attachments: batch }, `drawing batch ${sent}`);
    attached += out.attached ?? 0;
    unmatched += out.unmatched ?? 0;
    console.log(`drawings batch ${sent}: +${out.attached ?? 0} attached, ${out.unmatched ?? 0} unmatched`);
    batch = [];
    batchBytes = 0;
  };

  for (const m of manifest) {
    let b64 = pngCache.get(m.file);
    if (b64 == null) {
      b64 = readFileSync(join(drawingsDir, m.file)).toString("base64");
      pngCache.set(m.file, b64);
    }
    batch.push({ key: m.key, filename: m.label, mime: "image/png", dataBase64: b64 });
    batchBytes += b64.length;
    if (batch.length >= 200 || batchBytes >= ATTACHMENT_CHUNK_BYTES) await flush();
  }
  await flush();
  console.log(`drawings done: ${attached} attached, ${unmatched} keys not on server`);
}
