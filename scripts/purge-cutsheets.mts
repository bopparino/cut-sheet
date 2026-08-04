/**
 * Bulk retention purge for cut sheets, in three reviewable steps.
 *
 *   1. Preview (writes purge-report.csv, changes NOTHING on the server):
 *      CUTSHEET_SESSION=<cookie> node scripts/purge-cutsheets.mts https://<host> --preview
 *        [--cutoff-days 30]            age rule: DATE strictly older than N days ago
 *        [--cutoff 2026-07-05]         ...or an explicit ISO cutoff date instead
 *        [--builders KHOV,HOVNANIAN]   purge any builder containing these (any date)
 *        [--out purge-report.csv]
 *
 *   2. Review the CSV in Excel. The `action` column is the whole contract:
 *      rows marked `purge` will be deleted, rows marked `keep` will not.
 *      Flip individual cells either way; nothing else in the row matters.
 *      Rows the server marked keep-edited (a human edited the sheet in the
 *      app) and keep-undated (no parseable DATE) start as `keep`.
 *
 *   3. Execute (soft-delete - everything lands in /admin/trash, restorable):
 *      CUTSHEET_SESSION=<cookie> node scripts/purge-cutsheets.mts https://<host> --execute purge-report.csv
 *
 *   Undo (restores exactly the rows the CSV marks `purge`):
 *      CUTSHEET_SESSION=<cookie> node scripts/purge-cutsheets.mts https://<host> --restore purge-report.csv
 *
 * CUTSHEET_SESSION is the value of the `cutsheet_session` cookie from a
 * logged-in ADMIN browser session (DevTools > Application > Cookies).
 * Take a fresh backup (/api/backup) before --execute. Node builtins only,
 * so plain `node` works - no tsx needed.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { createInterface } from "node:readline/promises";

const argv = process.argv.slice(2);
const flag = (name: string): string | null => {
  const i = argv.indexOf(name);
  return i >= 0 ? (argv[i + 1] ?? null) : null;
};
const has = (name: string) => argv.includes(name);

const baseUrl = argv.find((a) => /^https?:\/\//.test(a));
const session = process.env.CUTSHEET_SESSION;
const mode = has("--preview") ? "preview" : has("--execute") ? "execute" : has("--restore") ? "restore" : null;
if (!baseUrl || !session || !mode) {
  console.error(
    "usage: CUTSHEET_SESSION=<cookie> node scripts/purge-cutsheets.mts <base-url> " +
      "(--preview [--cutoff-days N | --cutoff YYYY-MM-DD] [--builders A,B] [--out file.csv] " +
      "| --execute file.csv | --restore file.csv)",
  );
  process.exit(1);
}

const endpoint = `${baseUrl.replace(/\/$/, "")}/api/admin/purge`;

async function post(body: unknown): Promise<Record<string, unknown>> {
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: `cutsheet_session=${session}` },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    console.error(`HTTP ${res.status} - ${await res.text()}`);
    process.exit(1);
  }
  return (await res.json()) as Record<string, unknown>;
}

// ---------- CSV (builder names contain commas, so quote properly) ----------

const esc = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') inQ = false;
      else field += c;
    } else if (c === '"') inQ = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field); field = "";
      if (row.some((f) => f !== "")) rows.push(row);
      row = [];
    } else field += c;
  }
  row.push(field);
  if (row.some((f) => f !== "")) rows.push(row);
  return rows;
}

type PreviewRow = {
  id: number; verdict: string; reason: string; builder: string; project: string;
  houseType: string; lot: string; date: string; updatedAt: string; editedBy: string | null;
};

// ---------- preview ----------

if (mode === "preview") {
  const cutoffArg = flag("--cutoff");
  const days = Number(flag("--cutoff-days") ?? 30);
  const cutoffDate =
    cutoffArg ?? new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);
  const buildersLike = (flag("--builders") ?? "KHOV,HOVNANIAN")
    .split(",").map((s) => s.trim()).filter(Boolean);
  const outFile = flag("--out") ?? "purge-report.csv";

  console.log(`preview: DATE before ${cutoffDate}, or builder containing [${buildersLike.join(", ")}]`);
  const res = await post({ action: "preview", cutoffDate, buildersLike });
  const rows = res.rows as PreviewRow[];
  const t = res.totals as Record<string, number>;

  const header = "action,id,server_verdict,reason,builder,project,house_type,lot,date,last_updated,edited_by";
  const lines = rows.map((r) =>
    [
      r.verdict === "purge" ? "purge" : "keep",
      String(r.id), r.verdict, r.reason, r.builder, r.project, r.houseType,
      r.lot, r.date, r.updatedAt, r.editedBy ?? "",
    ].map(esc).join(","),
  );
  writeFileSync(outFile, [header, ...lines].join("\n") + "\n");

  console.log(`\n${t.live} live sheets on the server:`);
  console.log(`  ${t.purge} marked purge`);
  console.log(`  ${t.keepEdited} kept (human-edited in the app) - review these rows in the CSV`);
  console.log(`  ${t.keepUndated} kept (blank/unparseable DATE)`);
  console.log(`  ${t.notMatched} untouched (recent DATE, non-matching builder; not in the CSV)`);
  console.log(`\nwrote ${outFile} (${lines.length} rows)`);
  console.log(`next: review/adjust the action column, take a fresh /api/backup, then:`);
  console.log(`  CUTSHEET_SESSION=... node scripts/purge-cutsheets.mts ${baseUrl} --execute ${outFile}`);
}

// ---------- execute / restore ----------

if (mode === "execute" || mode === "restore") {
  const file = argv[argv.indexOf(`--${mode}`) + 1];
  if (!file || file.startsWith("--")) {
    console.error(`--${mode} needs the reviewed CSV path`);
    process.exit(1);
  }
  const rows = parseCsv(readFileSync(file, "utf8"));
  const header = rows[0].map((h) => h.trim().toLowerCase());
  const actionCol = header.indexOf("action");
  const idCol = header.indexOf("id");
  if (actionCol < 0 || idCol < 0) {
    console.error("CSV is missing the action/id columns - use a file written by --preview");
    process.exit(1);
  }
  const ids = rows.slice(1)
    .filter((r) => (r[actionCol] ?? "").trim().toLowerCase() === "purge")
    .map((r) => Number(r[idCol]))
    .filter((n) => Number.isInteger(n) && n > 0);
  if (ids.length === 0) {
    console.log("no rows marked purge - nothing to do");
    process.exit(0);
  }

  const verb = mode === "execute" ? "soft-delete (to Trash)" : "RESTORE from Trash";
  console.log(`${file}: ${ids.length} sheets marked purge -> ${verb} on ${baseUrl}`);
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question(`type ${mode.toUpperCase()} to confirm: `);
  rl.close();
  if (answer.trim() !== mode.toUpperCase()) {
    console.log("aborted, nothing changed");
    process.exit(0);
  }

  const CHUNK = 2000;
  let changed = 0, skipped = 0;
  for (let i = 0; i < ids.length; i += CHUNK) {
    const out = await post({ action: mode, ids: ids.slice(i, i + CHUNK) });
    changed += Number(out.deleted ?? out.restored ?? 0);
    skipped += Number(out.skipped ?? 0);
    console.log(`  batch ${Math.floor(i / CHUNK) + 1}/${Math.ceil(ids.length / CHUNK)} done`);
  }
  if (mode === "execute") {
    console.log(`done: ${changed} sheets moved to Trash, ${skipped} were already gone.`);
    console.log(`undo any time: --restore ${file} (restores the same id list)`);
  } else {
    console.log(`done: ${changed} sheets restored, ${skipped} were not in the Trash.`);
  }
}
