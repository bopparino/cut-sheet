/**
 * Push an assembled legacy bundle to a running cutsheet app (local or prod)
 * through the admin import endpoint, in idempotent chunks.
 *
 *   1. npx tsx scripts/import-legacy.ts <dirs...> --emit bundle.json
 *   2. CUTSHEET_SESSION=<cookie value> npx tsx scripts/push-legacy.ts bundle.json https://<host>
 *
 * CUTSHEET_SESSION is the value of the `cutsheet_session` cookie from a
 * logged-in ADMIN browser session (DevTools > Application > Cookies).
 * Chunks are safe to re-run: the server's legacy_imports ledger skips
 * anything already imported, so a dropped connection just means running
 * the same command again.
 */
import { readFileSync } from "node:fs";

const [bundlePath, baseUrl] = process.argv.slice(2);
const session = process.env.CUTSHEET_SESSION;
if (!bundlePath || !baseUrl || !session) {
  console.error(
    "usage: CUTSHEET_SESSION=<cookie> npx tsx scripts/push-legacy.ts <bundle.json> <base-url>",
  );
  process.exit(1);
}

const CHUNK = 250;

const { sheets } = JSON.parse(readFileSync(bundlePath, "utf8")) as { sheets: unknown[] };
console.log(`${sheets.length} sheets in ${bundlePath} -> ${baseUrl}`);

let imported = 0;
let skipped = 0;
for (let i = 0; i < sheets.length; i += CHUNK) {
  const chunk = sheets.slice(i, i + CHUNK);
  const res = await fetch(`${baseUrl.replace(/\/$/, "")}/api/admin/import-legacy`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: `cutsheet_session=${session}`,
    },
    body: JSON.stringify({ sheets: chunk }),
  });
  if (!res.ok) {
    console.error(`chunk ${i / CHUNK + 1}: HTTP ${res.status} - ${await res.text()}`);
    console.error("Fix the problem and re-run this exact command; imported chunks are skipped.");
    process.exit(1);
  }
  const out = (await res.json()) as { imported: number; skipped: number };
  imported += out.imported;
  skipped += out.skipped;
  console.log(
    `chunk ${i / CHUNK + 1}/${Math.ceil(sheets.length / CHUNK)}: +${out.imported} imported, ${out.skipped} skipped`,
  );
}
console.log(`done: ${imported} imported, ${skipped} already there`);
