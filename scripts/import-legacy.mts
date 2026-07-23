/**
 * Seed/append: import legacy Access-table exports into the cutsheets DB.
 *
 * Inputs (any mix, repeatable): directories containing the five
 * tbl_Cut_Sheet_Library_*.xlsx exports (Header, Custom_Duct, Stock_Duct,
 * PreFab, DuctBoard — one letter's worth per directory), or pre-converted
 * JSON files shaped as
 *   { [tableName]: { headers: string[], rows: Record<string, unknown>[] } }.
 * Every row carries `property_number` and `Cut Sheet #` join keys.
 *
 * Usage:
 *   npx tsx scripts/import-legacy.ts <dir-or-json> [more...] [--force]
 *
 * DATABASE_PATH picks the target DB (defaults to ./data/cutsheets.db, same
 * as the app). Safe to re-run and to append later letters: imported legacy
 * ids are recorded in a script-owned `legacy_imports` table (the app never
 * reads it) and already-imported sheets are skipped. Folder structure is
 * found-or-created by name, never duplicated. --force is only needed against
 * a non-empty DB that predates the legacy_imports ledger.
 *
 * Mapping decisions (per Austin, 2026-06-11):
 * - DuctBoard table is skipped entirely (no longer used).
 * - Insulated flex 14ft + 18ft both sum into Insulated Flex R4.
 * - Legacy columns with no home in the new form become text lines in the
 *   Custom-PDF Miscellaneous list, prefixed "Legacy —", so nothing is
 *   silently lost.
 * - Sheet Metal Lines become customLines on the custom ticket.
 * - Folder layout: empty A-Z folders at the top level for day-to-day filing,
 *   plus IMPORTS > A-Z > <builder> holding the imported sheets, lettered by
 *   the builder's first character ("#" catch-all for non-letter builders).
 */
import { readFileSync, readdirSync, statSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import Database from "better-sqlite3";
import ExcelJS from "exceljs";
import { CutsheetSchema, emptyCutsheet, type Cutsheet } from "../src/lib/schema";

type Row = Record<string, unknown>;
type Tables = Record<string, { headers: string[]; rows: Row[] }>;

const args = process.argv.slice(2);
const force = args.includes("--force");
// --update: sheets whose ledger key already exists get their data refreshed
// in place (same row id, same folder, deleted_at untouched) instead of being
// skipped. This is the "Access wins" mode for re-importing from the live
// .mdb files - Kimmy double-enters, and the Access copy is authoritative.
const update = args.includes("--update");
// --emit <file>: write the assembled sheets as a JSON bundle instead of
// touching a DB. The bundle is what scripts/push-legacy.mts sends to the
// admin import endpoint - the path for getting legacy sheets into PROD,
// where the SQLite file lives on the Railway volume out of local reach.
const emitIdx = args.indexOf("--emit");
const emitPath = emitIdx >= 0 ? args[emitIdx + 1] : null;
if (emitIdx >= 0 && !emitPath) {
  console.error("--emit needs a file path");
  process.exit(1);
}
const inputs = args.filter(
  (a, i) => a !== "--force" && a !== "--emit" && a !== "--update" && i !== emitIdx + 1,
);
if (inputs.length === 0) {
  console.error(
    "usage: npx tsx scripts/import-legacy.ts <dir-or-json> [more...] [--force] [--emit bundle.json]",
  );
  process.exit(1);
}

// ----- coercion helpers --------------------------------------------------

const num = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
};
const str = (v: unknown): string => (v == null ? "" : String(v).trim());
const day = (v: unknown): string => str(v).slice(0, 10); // 'YYYY-MM-DD HH:MM:SS' -> date
const stamp = (v: unknown): string | null => (str(v) ? str(v) : null);

// A value worth preserving as a legacy line: nonzero number or non-empty text.
const present = (v: unknown): boolean => {
  if (v == null) return false;
  if (typeof v === "number") return v !== 0;
  return str(v) !== "" && str(v) !== "0";
};

// ----- input loading ------------------------------------------------------

// Header is the spine; the section tables are optional because Access skips
// empty tables when exporting (e.g. a builder with no custom duct rows).
// Missing sections just mean those parts of each sheet stay empty.
const SECTION_TABLES = ["Custom_Duct", "Stock_Duct", "PreFab"];

// Excel serial dates come out of exceljs as UTC Date objects; format with the
// UTC getters so '2021-07-06 08:30:21' survives the round trip unshifted.
function fmtDate(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return (
    `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())} ` +
    `${p(d.getUTCHours())}:${p(d.getUTCMinutes())}:${p(d.getUTCSeconds())}`
  );
}

function cellValue(v: ExcelJS.CellValue): unknown {
  if (v == null) return null;
  if (v instanceof Date) return fmtDate(v);
  if (typeof v === "object") {
    if ("richText" in v) return v.richText.map((rt) => rt.text).join("");
    if ("text" in v) return cellValue(v.text as ExcelJS.CellValue);
    if ("result" in v) return cellValue(v.result as ExcelJS.CellValue);
    return null; // error cells etc.
  }
  return v;
}

async function readXlsxTable(path: string): Promise<{ headers: string[]; rows: Row[] }> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(path);
  const ws = wb.worksheets[0];
  if (!ws) throw new Error(`${path}: workbook has no sheets`);
  const headers: string[] = [];
  ws.getRow(1).eachCell({ includeEmpty: true }, (c, col) => {
    headers[col - 1] = str(cellValue(c.value));
  });
  const rows: Row[] = [];
  ws.eachRow((row, n) => {
    if (n === 1) return;
    const r: Row = {};
    headers.forEach((h, i) => {
      if (h) r[h] = cellValue(row.getCell(i + 1).value);
    });
    rows.push(r);
  });
  return { headers: headers.filter(Boolean), rows };
}

async function loadInput(path: string): Promise<Tables> {
  const full = resolve(path);
  if (statSync(full).isDirectory()) {
    const out: Tables = {};
    for (const f of readdirSync(full)) {
      const m = /^tbl_Cut_Sheet_Library_(.+)\.xlsx$/i.exec(f);
      if (!m) continue;
      out[m[1]] = await readXlsxTable(join(full, f));
    }
    return out;
  }
  return JSON.parse(readFileSync(full, "utf8")) as Tables;
}

// NOTE: inputs are processed one source at a time (see the assemble section).
// Each letter's Access library was its own database with its own autonumber,
// so "Cut Sheet #" collides freely ACROSS sources — joining the section
// tables to headers is only valid within a single export directory.

const SHEET_KEY = (r: Row) => num(r["Cut Sheet #"] ?? r["Cut Sheet ."]);
const byId = (t: { rows: Row[] } | undefined) =>
  new Map((t?.rows ?? []).map((r) => [SHEET_KEY(r), r]));

// ----- per-section mappers ------------------------------------------------

/** Fill `target[mapped]` from `row[oldCol]` for every clean rename. */
function fillMap(
  row: Row,
  target: Record<string, number>,
  mapping: Record<string, string>,
) {
  for (const [oldCol, newKey] of Object.entries(mapping)) {
    target[newKey] = (target[newKey] ?? 0) + num(row[oldCol]);
  }
}

/**
 * Columns whose value is identical across every row of a table are Access
 * form defaults (e.g. "3 Inch Wall Cap" = 1 on all 341 rows), not data —
 * never worth a leftover line.
 */
function constantCols(rows: Row[]): Set<string> {
  const out = new Set<string>();
  if (rows.length < 2) return out;
  for (const col of Object.keys(rows[0])) {
    // Majority default, not strict constant: a value repeated on >=90% of a
    // source's rows is an Access form default, and echoing it onto nearly
    // every sheet made all sheets read identical ("fake data" to Kimmy).
    const counts = new Map<string, number>();
    for (const r of rows) {
      const v = str(r[col]);
      counts.set(v, (counts.get(v) ?? 0) + 1);
    }
    const top = Math.max(...counts.values());
    // Small sources can't establish a "default" statistically - require a
    // strict constant below 20 rows.
    const threshold = rows.length < 20 ? 1 : 0.9;
    if (top >= rows.length * threshold) out.add(col);
  }
  return out;
}

// Recomputed per source directory before its rows are assembled — each
// letter's Access library has its own form defaults.
let CONSTANTS = {
  customDuct: new Set<string>(),
  stock: new Set<string>(),
  prefab: new Set<string>(),
  header: new Set<string>(),
};

/** Push "Legacy — col: value" for every present value in `cols`. */
function collectLeftovers(
  row: Row,
  cols: string[],
  leftovers: string[],
  skip: Set<string> = new Set(),
) {
  for (const c of cols) {
    if (skip.has(c)) continue;
    if (present(row[c])) leftovers.push(`Legacy — ${c}: ${str(row[c])}`);
  }
}

// ----- unmapped-column audit ----------------------------------------------
// The P400 lesson: a column that's neither mapped, nor leftover-listed, nor a
// form-default constant vanishes SILENTLY — no error, no leftover line, the
// data just never arrives. Every row handed to a mapper is wrapped in a
// recording proxy, so any column the mappers never even LOOK at gets flagged
// per source after assembly. New columns in future exports announce
// themselves instead of dying quietly.

/** Wrap a row so every column read is recorded into `seen`. */
const track = (row: Row, seen: Set<string>): Row =>
  new Proxy(row, {
    get(t, p) {
      if (typeof p === "string") seen.add(p);
      return t[p as string];
    },
  });

// Columns dropped ON PURPOSE (decided with the shop) — the audit stays quiet.
const DELIBERATELY_DROPPED = new Set([
  "Angles", // not on the new cut sheet; shop confirmed it's dead (July 2026)
]);

function auditUnmapped(
  source: string,
  tableName: string,
  table: { headers: string[]; rows: Row[] } | undefined,
  seen: Set<string>,
  constants: Set<string>,
) {
  if (!table) return;
  const flagged: string[] = [];
  for (const col of table.headers) {
    if (seen.has(col) || constants.has(col) || DELIBERATELY_DROPPED.has(col)) continue;
    let n = 0;
    for (const r of table.rows) if (present(r[col])) n++;
    if (n > 0) flagged.push(`${col} — data on ${n} row${n === 1 ? "" : "s"}`);
  }
  if (flagged.length > 0) {
    console.warn(`⚠ ${source} / ${tableName}: UNMAPPED columns with data (values are NOT imported):`);
    for (const f of flagged) console.warn(`    ${f}`);
  }
}

/**
 * Retired products with no field on the new form: carry each as a VISIBLE
 * line in the sheet's Miscellaneous box (per Austin, July 2026 — same
 * philosophy as the legacy fan boxes: a reprint should match what the shop
 * originally built). Only the 2004-07 Server library has data in these
 * columns; they're inert for the 2023-era sources.
 */
function retiredToMisc(row: Row, cs: Cutsheet, map: Record<string, string>) {
  for (const [col, label] of Object.entries(map)) {
    const n = num(row[col]);
    if (n > 0) cs.custom.miscellaneous.push(`${label} — ${n}`);
  }
}

const RETIRED_STOCK_MISC: Record<string, string> = {
  "8x10x48 Duct": '8x10 x 48" Duct',
  "8x12x48 Duct": '8x12 x 48" Duct',
  "8x14x48 Duct": '8x14 x 48" Duct',
  "8x16x48 Duct": '8x16 x 48" Duct',
  "8x18x48 Duct": '8x18 x 48" Duct',
  "10x16x48 Duct": '10x16 x 48" Duct',
  "3x10x100 Duct": '3x10 x 100" Duct',
  "3x12x100 Duct": '3x12 x 100" Duct',
};

const RETIRED_PREFAB_MISC: Record<string, string> = {
  "3 Inch Screen Cap": '3" Screen Cap',
  // Access column really has two spaces in "Screen  Cap".
  "4 Inch Screen  Cap": '4" Screen Cap',
  "5 Inch x 10 Foot Insulated Flex": "5\" x 10' Insulated Flex",
  "6 Inch x 10 Foot Insulated Flex": "6\" x 10' Insulated Flex",
  "7 Inch x 10 Foot Insulated Flex": "7\" x 10' Insulated Flex",
  "8 Inch x 10 Foot Insulated Flex": "8\" x 10' Insulated Flex",
  "Furn-Conn-1ft-adj": "Furnace Connector 1' Adj",
  "5x4x5 BV-Tee": "5x4x5 BV Tee",
};

const DUCT60_MAP: Record<string, string> = {
  "3x10x60 Duct": "3.25x10",
  "3x12x60 Duct": "3.25x12",
  "8x6x60 Duct": "8x6", "8x8x60 Duct": "8x8", "8x10x60 Duct": "8x10",
  "8x12x60 Duct": "8x12", "8x14x60 Duct": "8x14", "8x16x60 Duct": "8x16",
  "8x18x60 Duct": "8x18", "8x20x60 Duct": "8x20", "8x22x60 Duct": "8x22",
  "8x24x60 Duct": "8x24",
  "10x10x60 Duct": "10x10", "10x12x60 Duct": "10x12", "10x14x60 Duct": "10x14",
  "10x16x60 Duct": "10x16", "10x18x60 Duct": "10x18", "10x20x60 Duct": "10x20",
  "10x22x60 Duct": "10x22", "10x24x60 Duct": "10x24",
  "12x12x60 Duct": "12x12", "12x14x60 Duct": "12x14", "12x16x60 Duct": "12x16",
  "12x18x60 Duct": "12x18", "12x20x60 Duct": "12x20", "12x22x60 Duct": "12x22",
  "12x24x60 Duct": "12x24",
  "14x14x60 Duct": "14x14", "14x16x60 Duct": "14x16", "14x18x60 Duct": "14x18",
  "14x20x60 Duct": "14x20",
  // 16x14 was the same stick written the other way around.
  "16x14x60 Duct": "14x16",
};

const BOOT_MAP: Record<string, string> = {
  "10x31/4x6": "10x3.25x6", "12x31/4x7": "12x3.25x7", "14x31/4x8": "14x3.25x8",
  "10x4x4": "10x4x4", "10x4x5": "10x4x5", "10x4x6": "10x4x6",
  "10x6x6": "10x6x6", "12x4x7": "12x4x7", "12x6x7": "12x6x7", "14x4x8": "14x4x8",
};

function mapStock(row: Row, cs: Cutsheet, leftovers: string[]) {
  fillMap(row, cs.stock.duct60 as Record<string, number>, DUCT60_MAP);
  retiredToMisc(row, cs, RETIRED_STOCK_MISC);
  fillMap(row, cs.stock.sdMisc as Record<string, number>, {
    "24 Inch Drives": "drive24",
    "26 Inch Slips": "slips26",
    Mastic: "mastic",
    Brushes: "brushes",
  });
  fillMap(row, cs.truck.ovPipe as Record<string, number>, {
    "5InOvalPipe": "5", "6InOvalPipe": "6", "7InOvalPipe": "7", "8InOvalPipe": "8",
  });
  fillMap(row, cs.truck.rndPipe as Record<string, number>, {
    "4x10 Round": "4x10", "5x10 Round": "5x10", "6x10 Round": "6x10",
    "7x10 Round": "7x10", "8x5 Round": "8x5", "10x5 Round": "10x5",
    "12x5 Round": "12x5", "14x5 Round": "14x5", "16x5 Round": "16x5",
  });
  fillMap(row, cs.formOnly.sdMiscExtras as Record<string, number>, {
    FoilInsulation: "foilIns",
  });
  fillMap(row, cs.formOnly.birdCage as Record<string, number>, {
    "4InBirdCageWallCap": "4", "6InBirdCageWallCap": "6",
  });
  fillMap(row, cs.formOnly.metalScreen as Record<string, number>, {
    "6InMetalWallCap": "metal6", "8InMetalWallCap": "metal8",
    "10InMetalWallCap": "metal10", "10x31/4MetalWallCap": "metal10x3_25",
    "6InMetalScreenWallCap": "screen6", "8InMetalScreenWallCap": "screen8",
    "10InMetalScreenWallCap": "screen10",
  });
  // TP/BT are both metal 6" boxes; the new form only distinguishes metal/plastic.
  fillMap(row, cs.formOnly.dryerBox as Record<string, number>, {
    "6InBoxTPDryerBox": "metal6", "6InBoxBTDryerBox": "metal6",
    "6InBoxPlasticDryerBox": "plastic6",
  });
  fillMap(row, cs.formOnly.bVent as Record<string, number>, {
    "60DegreeBVent": "deg60",
  });
  fillMap(row, cs.formOnly.galRedr as Record<string, number>, {
    "4x3GalRed": "4x3", "5x4GalRed": "5x4", "6x5GalRed": "6x5",
    "7x6GalRed": "7x6", "8x7GalRed": "8x7",
  });
  fillMap(row, cs.formOnly.saddleTap as Record<string, number>, {
    "4InSaddleTap": "4", "5InSaddleTap": "5", "6InSaddleTap": "6",
    "7InSaddleTap": "7", "8InSaddleTap": "8", "10InSaddleTap": "10",
    "12InSaddleTap": "12",
  });
  // The old Access FORM labels this row "P400 (4\")" but the COLUMN was never
  // renamed from an earlier product name: it is BlueFlashingP300 in every
  // library. Verified against Jade prop 219116 (Kimmie's red-pen sheets):
  // column P300 = 1 on zone 1 and 6 on zone 2, exactly the values her form
  // shows as P400. It used to sit in the leftovers list as "P300", so the
  // qty vanished from the printed sheet entirely.
  fillMap(row, cs.formOnly.blueFlashing as Record<string, number>, {
    BlueFlashingP300: "p400",
    BlueFlashingP600: "p600",
  });
  fillMap(row, cs.formOnly.simpsonStp as Record<string, number>, {
    "18InSimpsonStr": "stp18", "24InSimpsonStr": "stp24",
  });
  collectLeftovers(
    row,
    [
      "12 Inch Drives",
      "3x8x115 Duct", "3x10x115 Duct", "3x12x115 Duct", "3x14x115 Duct",
      "3x10 Round",
      "3inLouveredWallCap", "4inLouveredWallCap", "6InLouveredWallCap",
      "3inBirdCageWallCap",
      "7InMetalWallCap", "7InMetalScreenWallCap",
      "3InBoxTPDryerBox", "3InBoxBTDryerBox", "4InBoxPlasticDryerBox",
      "60DegreeFurnaceConnector", "6x5BVentRed", "6x4BVentRed", "5x4BVentRed",
    ],
    leftovers,
    CONSTANTS.stock,
  );
}

function mapCustomDuct(row: Row, cs: Cutsheet, leftovers: string[]) {
  // Sheet Metal Lines = the old form's Miscellaneous box. They used to land
  // in customLines, which only print at the BOTTOM OF THE CUSTOM PICK TICKET
  // — invisible on the cut sheet itself, so Kimmie read them as "not brought
  // over". Route them into custom.miscellaneous instead: that's the sheet's
  // Miscellaneous box, and ticket-rules already prints those rows on the
  // Custom ticket too, so nothing is lost off the ticket either.
  for (let i = 1; i <= 12; i++) {
    const label = str(row[`Sheet Metal Line ${i}`]);
    if (!label) continue;
    const qty = num(row[`Sheet Metal Line ${i} Qty`]);
    cs.custom.miscellaneous.push(qty > 1 ? `${qty} — ${label}` : label);
  }

  const whRows = (
    prefix: string,
    count: number,
    qtyCol: (i: number) => string,
    wCol: (i: number) => string,
    hCol: (i: number) => string,
    slCol?: (i: number) => string,
  ) => {
    const out: { qty: number; w: string; h: string }[] = [];
    for (let i = 1; i <= count; i++) {
      const qty = num(row[qtyCol(i)]);
      const w = str(row[wCol(i)]);
      const h = str(row[hCol(i)]);
      if (qty === 0 && !w && !h) continue;
      out.push({ qty, w, h });
      // WHRow has no SL field in the new schema; preserve the flag visibly.
      if (slCol && str(row[slCol(i)]).toUpperCase() === "Y") {
        leftovers.push(`Legacy — ${prefix} ${w}x${h} marked SL`);
      }
    }
    return out;
  };

  cs.custom.endCaps = whRows(
    "End Cap", 5,
    (i) => `End Cap ${i} Qty`, (i) => `End Cap ${i} Width`,
    (i) => `End Cap ${i} Height`, (i) => `End Cap ${i} SL`,
  );
  cs.custom.volumeDampers = whRows(
    "VD", 5,
    (i) => `VD ${i} Qty`, (i) => `VD ${i} Width`, (i) => `VD ${i} Height`,
  );
  cs.custom.canvasConn = whRows(
    "CC", 5,
    (i) => `CC ${i} Qty`, (i) => `CC ${i} Width`, (i) => `CC ${i} Height`,
  );

  for (let i = 1; i <= 12; i++) {
    const qty = num(row[`CD ${i} Qty`]);
    const w = str(row[`CD ${i} Width`]);
    const h = str(row[`CD ${i} Height`]);
    const l = str(row[`CD ${i} Length`]);
    if (qty === 0 && !w && !h && !l) continue;
    cs.custom.customDuct.push({
      qty, w, h, l,
      sl: str(row[`CD ${i} SL`]).toUpperCase() === "Y" ? "Y" : "N",
    });
  }

  fillMap(row, cs.formOnly.filterRacks as Record<string, number>, {
    FR16X25: "16x25", FR20x25: "20x25", LBox: "lBox",
  });
  fillMap(row, cs.formOnly.drainPans as Record<string, number>, {
    DP31X31: "31x31", DP31x36: "31x36", DP31X60: "31x60",
  });
  fillMap(row, cs.formOnly.returnPlenum as Record<string, number>, {
    "14x24SLRP": "14x24SL", "18x24SLRP-S": "18x24SL", "Furnace Feet": "furnaceFeet",
  });

  const small = num(row.SmallPlenumPackage);
  const large = num(row.LargePlenumPackage);
  if (large > 0) cs.header.plenumPackage = "large";
  else if (small > 0) cs.header.plenumPackage = "small";
  if (small > 1) leftovers.push(`Legacy — Small Plenum Package qty: ${small}`);
  if (large > 1) leftovers.push(`Legacy — Large Plenum Package qty: ${large}`);

  collectLeftovers(row, ["14x24SLRP-L", "DPL", "DPW", "DPQ"], leftovers, CONSTANTS.customDuct);
}

function mapPreFab(row: Row, cs: Cutsheet, leftovers: string[]) {
  retiredToMisc(row, cs, RETIRED_PREFAB_MISC);
  fillMap(row, cs.formOnly.ovalSHeads as Record<string, number>, {
    "8x6x4 Oval Stackheads": "8x6x4", "8x6x5 Oval Stackheads": "8x6x5",
    "10x6x6 Oval Stackheads": "10x6x6", "12x6x7 Oval Stackheads": "12x6x7",
    "14x6x8 Oval Stackheads": "14x6x8",
  });
  fillMap(row, cs.formOnly.ovalToRnd as Record<string, number>, {
    "5x5OvalToRoundEll": "5x5", "6x6OvalToRoundEll": "6x6", "7x7OvalToRoundEll": "7x7",
  });
  fillMap(row, cs.formOnly.rndEll as Record<string, number>, {
    "4 Inch Round Ell": "4", "5 Inch Round Ell": "5", "6 Inch Round Ell": "6",
    "7 Inch Round Ell": "7", "8 Inch Round Ell": "8", "10 Inch Round Ell": "10",
    "12 Inch Round Ell": "12", "14 Inch Round Ell": "14", "16 Inch Round Ell": "16",
  });

  for (const [suffix, target] of [
    ["Ell Boots", cs.formOnly.ellBoots],
    ["End Boots", cs.formOnly.endBoots],
  ] as const) {
    for (const [oldSize, newSize] of Object.entries(BOOT_MAP)) {
      const col = `${oldSize} ${suffix}`;
      (target as Record<string, number>)[newSize] += num(row[col]);
    }
  }
  // Straight Boots: the export doubled some spaces; 8x31/4x5 and 12x4x8 have
  // no home in the new size list and land in leftovers below.
  fillMap(row, cs.formOnly.strtBoots as Record<string, number>, {
    "10x31/4x6 Straight  Boots": "10x3.25x6",
    "12x31/4x7 Straight  Boots": "12x3.25x7",
    "14x31/4x8 Straight  Boots": "14x3.25x8",
    "10x4x4 Straight Boots": "10x4x4", "10x4x5 Straight Boots": "10x4x5",
    "10x4x6 Straight Boots": "10x4x6", "10x6x6 Straight Boots": "10x6x6",
    "12x4x7 Straight Boots": "12x4x7", "14x4x8 Straight Boots": "14x4x8",
  });

  // "Flat Ell" lines up with the form's 5F/6F/7F oval ells; vertical has no home.
  fillMap(row, cs.formOnly.ovalEll as Record<string, number>, {
    "5 Inch Flat Ell Flat": "5F", "6 Inch Flat Ell Flat": "6F", "7 Inch Flat Ell Flat": "7F",
  });

  fillMap(row, cs.formOnly.fans as Record<string, number>, {
    "4InGalvNeck": "gNeckSilv4", "6InGalvNeck": "gNeck116_6",
    // The Access column is NAMED CustomFan1 but it IS the paper form's
    // standard 4" fan box (AE80): proven against the printed 2026 Hadley
    // packet (paper "STD Fan 4: 5" = CustomFan1 5) and the trim pull's AE80
    // counts; nonzero on 47% of all sheets - the everyday bath fan.
    CustomFan1: "AE80_4",
    // The paper form had five fan boxes (STD Fan 3" / STD Fan 4" / 744 /
    // 744 F/L / RoofJK) and Access has five used columns. CustomFan1 = STD
    // Fan 4 (packet-proven). Fan Housings is a STANDALONE fan box (706/711
    // sheets with it have no fan/light columns) = STD Fan 3" -> today's
    // 3"-duct offering, the SLM 70. The two remaining columns are the two
    // 744-family boxes; the current form collapsed them into one 744 line,
    // so both map there regardless of which was which.
    "Fan Housings": "SLM70",
    "FAN LIGHT COMBOS": "744",
    NVFanLights: "744",
    // Legacy single unsized ROOFJACKS box -> the shop's smallest/default
    // current offering, Roof J 6". Assumption recorded in legacyNotes below.
    ROOFJACKS: "roofJ6",
  });
  if (num(row.ROOFJACKS) > 0) {
    leftovers.push(`Roof jacks mapped to 6" (legacy box had no size) × ${num(row.ROOFJACKS)}`);
  }
  // Legacy fan-ish columns with no current offering go to Miscellaneous as
  // REAL, described lines (per Austin: "be detailed of what it is").
  // Provenance for the elimination-mapped boxes (hidden, auditable).
  if (num(row["Fan Housings"]) > 0)
    leftovers.push(`Legacy "STD Fan 3" box mapped to SLM 70 × ${num(row["Fan Housings"])}`);
  if (num(row.NVFanLights) > 0)
    leftovers.push(`Legacy 744-family box mapped to 744 × ${num(row.NVFanLights)}`);

  fillMap(row, cs.custom.rndCollars as Record<string, number>, {
    "4 Inch Round Collar": "4", "5 Inch Round Collar": "5", "6 Inch Round Collar": "6",
    "7 Inch Round Collar": "7", "8 Inch Round Collar": "8", "10 Inch Round Collar": "10",
    "12 Inch Round Collar": "12", "14 Inch Round Collar": "14", "16 Inch Round Collar": "16",
  });
  fillMap(row, cs.formOnly.airTights as Record<string, number>, {
    "4InchAirTight": "4", "5InchAirTight": "5", "6InchAirTight": "6",
    "7InchAirTight": "7", "8 Inch Air Tight": "8", "10 Inch Air Tight": "10",
    "12 Inch Air Tight": "12", "14 Inch Air Tight": "14", "16 Inch Air Tight": "16",
  });

  fillMap(row, cs.formOnly.uninsulatedFlex as Record<string, number>, {
    "5 Inch x 7 Foot Non-Insulated Flex": "5",
    "6 Inch x 7 Foot Non-Insulated Flex": "6",
    "7 Inch x 7 Foot Non-Insulated Flex": "7",
    "8 Inch x 7 Foot Non-Insulated Flex": "8",
    "10 Inch x 7 Foot Non-Insulated Flex": "10",
    "12 Inch x 7 Foot Non-Insulated Flex": "12",
    "4 Inch x 14 Foot Non-Insulated Flex": "4",
    "10 Inch x 14 Foot Non-Insulated Flex": "10",
    "12 Inch x 14 Foot Non-Insulated Flex": "12",
    "14 Inch x 14 Foot Non-Insulated Flex": "14",
  });
  // Per Austin: both insulated lengths sum into R4; R8 starts empty.
  for (const len of ["14", "18"]) {
    fillMap(row, cs.formOnly.insulatedFlexR4 as Record<string, number>, {
      [`4 Inch x ${len} Foot Insulated Flex`]: "4",
      [`5 Inch x ${len} Foot Insulated Flex`]: "5",
      [`6 Inch x ${len} Foot Insulated Flex`]: "6",
      [`7 Inch x ${len} Foot Insulated Flex`]: "7",
      [`8 Inch x ${len} Foot Insulated Flex`]: "8",
      [`10 Inch x ${len} Foot Insulated Flex`]: "10",
      [`12 Inch x ${len} Foot Insulated Flex`]: "12",
      [`14 Inch x ${len} Foot Insulated Flex`]: "14",
      [`16 Inch x ${len} Foot Insulated Flex`]: "16",
    });
  }

  // Multi-line free text -> one row per line.
  const lines = (col: string) =>
    str(row[col]).split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
  cs.formOnly.wallRegs = lines("Wall Registers");
  cs.formOnly.grills = lines("Grilles");
  cs.formOnly.filterGrills = lines("Filters Grills");
  cs.formOnly.floorRegs = lines("Floor Registers");

  fillMap(row, cs.formOnly.bVent as Record<string, number>, {
    "B-vent-5ft-PC": "pc5", "B-vent-3ft-PC": "pc3", "B-vent-2ft-PC": "pc2",
    "B-vent-1ft- PC": "pc1", "B-Vent-60-Deg": "deg60", "B-Vent-90-Deg": "deg90",
    "B-vent-CCF": "ccf",
    // The new form has one Tee field; size detail is lost by design ("loose" migration).
    "6x6x6 BV-Tee": "tee", "5x5x5 BV-Tee": "tee", "4x4x4 BV Tee": "tee",
  });
  fillMap(row, cs.formOnly.flexBVent as Record<string, number>, {
    "4x36 Flex B-vent": "4x36", "4x60 Flex B-vent": "4x60",
  });

  cs.formOnly.panningMetal36x36 = num(row.PanningMetal);
  cs.formOnly.condRegs8x6 = num(row.ConditioningRegister8x6);

  collectLeftovers(
    row,
    [
      "6x5OvalToRoundEll", "7x6OvalToRoundEll",
      "3 Inch Round Ell",
      "8x31/4x5 Ell Boots", "8x31/4x5 End Boots", "8x31/4x5 Straight Boots",
      "12x4x8 Straight Boots",
      "5 Inch  Ell Vertical", "6 Inch  Ell Vertical", "7 Inch  Ell Vertical",
      "8 Inch Flat Ell Flat",
      "CustomFan2", "CustomFan3",
      "3 Inch Wall Cap", "4 Inch Wall Cap", "5 Inch Wall Cap", "6 Inch Wall Cap",
      "7 Inch Wall Cap", "8 Inch Wall Cap", "10x31/4 Inch Wall Cap",
      "6 Inch Screen  Cap", "7 Inch Screen  Cap", "8 Inch Screen Cap",
      "3 Inch x 14 Foot Non-Insulated Flex",
      "B_Vent Diameter", "Furn-Conn-Diameter",
      "B-vent-6in-PC", "B-Vent-45-Deg", "BV-Redr",
      "Furn-Conn-5ft-PC", "Furn-Conn-3ft-PC", "Furn-Conn-2ft-PC", "Furn-Conn-1ft-PC",
      "Furn-Conn-6in-PC", "Furn-Conn-1inc-Adj-PC", "Furn-Conn-45-Deg",
      "Furn-Conn-60-Deg", "Furn-Conn-90-Deg",
      "5x36 Flex B-vent", "5x60 Flex B-vent",
    ],
    leftovers,
    CONSTANTS.prefab,
  );
}

// ----- assemble -----------------------------------------------------------

const EQ_MAP: Record<string, "Job" | "Whs" | "Hold"> = { J: "Job", W: "Whs", H: "Hold" };
const REGIONS = new Set(["MD", "VA", "WV"]);

type Assembled = {
  // Dedupe identity. "Cut Sheet #" alone collides across the per-letter
  // Access databases (each restarted its autonumber), so the key is
  // propNumber|CutSheet#|BUILDER — verified to separate every real sheet in
  // the PT1+PT2 exports, while still collapsing the template sheets that
  // were exported identically into several letter directories.
  key: string;
  legacyId: number;
  cutsheet: Cutsheet;
  builder: string;
  createdAt: string | null;
  updatedAt: string | null;
};

const assembled: Assembled[] = [];
const failures: { id: number; error: string }[] = [];
let leftoverTotal = 0;
let emptySkipped = 0;

function assembleSource(tables: Tables, sourceName: string) {
  const customById = byId(tables.Custom_Duct);
  const stockById = byId(tables.Stock_Duct);
  const prefabById = byId(tables.PreFab);
  CONSTANTS = {
    customDuct: constantCols(tables.Custom_Duct?.rows ?? []),
    stock: constantCols(tables.Stock_Duct?.rows ?? []),
    prefab: constantCols(tables.PreFab?.rows ?? []),
    header: constantCols(tables.Header.rows),
  };

  // Every column the mappers read this source, per table (the join keys are
  // read by byId() on the raw rows, before wrapping — mark them by hand;
  // property_number rides along in every section table as a second join key).
  const joinKeys = ["Cut Sheet #", "Cut Sheet .", "property_number"];
  const seen = {
    customDuct: new Set<string>(joinKeys),
    stock: new Set<string>(joinKeys),
    prefab: new Set<string>(joinKeys),
    header: new Set<string>(joinKeys),
  };

  for (const hRaw of tables.Header.rows) {
  const h = track(hRaw, seen.header);
  const id = SHEET_KEY(h);
  // Empty Access artifact rows (no builder, house, project, or lot) exist in
  // most letter exports — nothing worth importing.
  if (!str(h.Builder) && !str(h["House Type"]) && !str(h.Project) && !str(h.Lot)) {
    emptySkipped++;
    continue;
  }
  const cs = emptyCutsheet();
  const leftovers: string[] = [];

  const region = str(h.State);
  const eq = EQ_MAP[str(h["Eq to Job/Whs/Hold"]).toUpperCase()] ?? "";
  cs.name = str(h["House Type"]);
  cs.header = {
    ...cs.header,
    builder: str(h.Builder),
    project: str(h.Project),
    houseType: str(h["House Type"]),
    lot: str(h.Lot),
    block: str(h.Block),
    section: str(h.Section),
    foreman: str(h.Foreman),
    region: (REGIONS.has(region) ? region : "") as Cutsheet["header"]["region"],
    date: day(h.DateCreated),
    deliveryDate: day(h["Delivery Date"]),
    projectCode: str(h["Project Code"]),
    option: str(h.Option),
    propNumber: str(h.property_number),
    zone: str(h.Zone),
    eqTo: eq as Cutsheet["header"]["eqTo"],
  };
  // Cloned From / AsBuilts initials are header metadata with no home on the
  // new form — preserved as hidden legacyNotes, never printed.
  collectLeftovers(
    h,
    ["Comments", "Creation Notes", "Cut Sheet Cloned From", "AsBuilts Reviewed by Initials"],
    leftovers,
    CONSTANTS.header,
  );

  const custom = customById.get(id);
  const stock = stockById.get(id);
  const prefab = prefabById.get(id);
  if (custom) mapCustomDuct(track(custom, seen.customDuct), cs, leftovers);
  if (stock) mapStock(track(stock, seen.stock), cs, leftovers);
  if (prefab) mapPreFab(track(prefab, seen.prefab), cs, leftovers);

  // Leftovers used to spam custom.miscellaneous (printed on the Custom
  // ticket!) - Kimmy read 7,000 identical "Legacy -" lines as corrupted
  // data. They now live in formOnly.legacyNotes: stored, never printed.
  cs.formOnly.legacyNotes = leftovers;
  leftoverTotal += leftovers.length;

  const parsed = CutsheetSchema.safeParse(cs);
  if (!parsed.success) {
    failures.push({ id, error: parsed.error.issues[0]?.message ?? "unknown" });
    continue;
  }
  assembled.push({
    key: `${str(h.property_number)}|${id}|${str(h.Builder).toUpperCase()}`,
    legacyId: id,
    cutsheet: parsed.data,
    builder: str(h.Builder) || "(no builder)",
    createdAt: stamp(h.DateCreated),
    updatedAt: stamp(h["Date Modified"]) ?? stamp(h.DateCreated),
  });
  }

  auditUnmapped(sourceName, "Header", tables.Header, seen.header, CONSTANTS.header);
  auditUnmapped(sourceName, "Custom_Duct", tables.Custom_Duct, seen.customDuct, CONSTANTS.customDuct);
  auditUnmapped(sourceName, "Stock_Duct", tables.Stock_Duct, seen.stock, CONSTANTS.stock);
  auditUnmapped(sourceName, "PreFab", tables.PreFab, seen.prefab, CONSTANTS.prefab);
}

for (const input of inputs) {
  const tables = await loadInput(input);
  if (!tables.Header) throw new Error(`${input}: missing Header table`);
  const missing = SECTION_TABLES.filter((t) => !tables[t]);
  console.log(
    `${input}: ${tables.Header.rows.length} header rows` +
      (missing.length ? ` (no ${missing.join(", ")} file)` : ""),
  );
  assembleSource(tables, input);
}

// Newest first, so when the same key appears in several sources (the Caruso
// year files overlap; templates were copied between letters) the freshest
// Date Modified wins and older copies fall to the dedupe skip below.
assembled.sort((a, b) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""));

if (emitPath) {
  // Dedupe by key keeping the first (newest, thanks to the sort) copy. The
  // server has no cross-chunk memory, so in --update mode a stale duplicate
  // arriving later in the bundle would overwrite the fresh one it just wrote.
  const seen = new Set<string>();
  const unique = assembled.filter((a) => !seen.has(a.key) && (seen.add(a.key), true));
  writeFileSync(emitPath, JSON.stringify({ sheets: unique }));
  console.log(
    `emitted ${unique.length} assembled sheets to ${emitPath} ` +
      `(${assembled.length - unique.length} stale duplicates dropped; no DB writes)` +
      (failures.length ? `; ${failures.length} rows failed schema` : ""),
  );
  process.exit(0);
}

// ----- write --------------------------------------------------------------

const dbPath = process.env.DATABASE_PATH ?? "./data/cutsheets.db";
mkdirSync(dirname(dbPath), { recursive: true });
const db = new Database(dbPath);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");
// Same bootstrap DDL as src/lib/db.ts (can't import it here: "server-only").
db.exec(`
  CREATE TABLE IF NOT EXISTS folders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    parent_id INTEGER REFERENCES folders(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_folders_parent ON folders(parent_id);
  CREATE TABLE IF NOT EXISTS cutsheets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    data TEXT NOT NULL,
    folder_id INTEGER REFERENCES folders(id) ON DELETE SET NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    deleted_at TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_cutsheets_folder ON cutsheets(folder_id);
  CREATE TABLE IF NOT EXISTS attachments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cutsheet_id INTEGER NOT NULL REFERENCES cutsheets(id) ON DELETE CASCADE,
    kind TEXT NOT NULL CHECK (kind IN ('drawing', 'image', 'document')),
    filename TEXT NOT NULL,
    mime TEXT NOT NULL,
    size INTEGER NOT NULL,
    blob BLOB NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_attachments_cutsheet ON attachments(cutsheet_id);
`);
const version = db.pragma("user_version", { simple: true }) as number;
if (version < 4) db.pragma("user_version = 4");

// Script-owned dedupe ledger: which legacy sheets are already in this DB,
// and which row each became. The app never reads this table. Keyed by
// propNumber|CutSheet#|BUILDER (see Assembled.key) because Cut Sheet # alone
// collides across the per-letter Access databases.
db.exec(`
  CREATE TABLE IF NOT EXISTS legacy_imports (
    key TEXT PRIMARY KEY,
    cutsheet_id INTEGER NOT NULL REFERENCES cutsheets(id) ON DELETE CASCADE
  );
`);

// Migrate a v1 ledger (legacy_id INTEGER PRIMARY KEY, written by the first K
// import): rebuild each key from the cutsheet row the id maps to.
const ledgerCols = db.prepare("PRAGMA table_info(legacy_imports)").all() as { name: string }[];
if (ledgerCols.some((c) => c.name === "legacy_id")) {
  db.exec(`
    CREATE TABLE legacy_imports_v2 (
      key TEXT PRIMARY KEY,
      cutsheet_id INTEGER NOT NULL REFERENCES cutsheets(id) ON DELETE CASCADE
    );
    INSERT INTO legacy_imports_v2 (key, cutsheet_id)
      SELECT json_extract(c.data, '$.header.propNumber') || '|' || li.legacy_id || '|' ||
             UPPER(TRIM(json_extract(c.data, '$.header.builder'))),
             li.cutsheet_id
      FROM legacy_imports li JOIN cutsheets c ON c.id = li.cutsheet_id;
    DROP TABLE legacy_imports;
    ALTER TABLE legacy_imports_v2 RENAME TO legacy_imports;
  `);
  console.log("migrated legacy_imports ledger to composite keys");
}

const existing = (db.prepare("SELECT COUNT(*) AS n FROM cutsheets").get() as { n: number }).n;
const ledger = (db.prepare("SELECT COUNT(*) AS n FROM legacy_imports").get() as { n: number }).n;
if (existing > 0 && ledger === 0 && !force) {
  console.error(
    `cutsheets table has ${existing} rows but no legacy_imports ledger — ` +
      `this DB predates dedupe, so a re-import would duplicate. ` +
      `Pass --force only if you're sure these inputs aren't already in it.`,
  );
  process.exit(1);
}
const alreadyImported = new Set<string>(
  (db.prepare("SELECT key FROM legacy_imports").all() as { key: string }[]).map((r) => r.key),
);

const insertFolder = db.prepare(
  "INSERT INTO folders (name, parent_id) VALUES (?, ?)",
);
// `parent_id IS ?` (not =) so a NULL parent matches top-level folders.
const findFolder = db.prepare(
  "SELECT id FROM folders WHERE name = ? AND parent_id IS ?",
);
const insertSheet = db.prepare(
  `INSERT INTO cutsheets (data, folder_id, created_at, updated_at)
   VALUES (?, ?, COALESCE(?, datetime('now')), COALESCE(?, datetime('now')))`,
);
const recordImport = db.prepare(
  "INSERT INTO legacy_imports (key, cutsheet_id) VALUES (?, ?)",
);
const updateSheet = db.prepare(
  `UPDATE cutsheets SET data = ?, updated_at = COALESCE(?, updated_at)
   WHERE id = (SELECT cutsheet_id FROM legacy_imports WHERE key = ?)`,
);

const ALPHABET = Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i));
const builderLetter = (builder: string) => {
  const first = builder.trim().charAt(0).toUpperCase();
  return first >= "A" && first <= "Z" ? first : "#";
};

let foldersCreated = 0;
let imported = 0;
let updated = 0;
let skipped = 0;
const builderFolderIds = new Map<string, number>();
const seed = db.transaction(() => {
  // Find-or-create, so re-runs and later letter batches reuse the existing
  // tree instead of duplicating it.
  const folder = (name: string, parentId: number | null) => {
    const found = findFolder.get(name, parentId) as { id: number } | undefined;
    if (found) return found.id;
    foldersCreated++;
    return Number(insertFolder.run(name, parentId).lastInsertRowid);
  };

  // Empty A-Z folders at the top level for day-to-day filing.
  for (const l of ALPHABET) folder(l, null);

  // IMPORTS > A-Z, created up front so the imported tree is complete even
  // for letters with no current builder.
  const importsId = folder("IMPORTS", null);
  const letterIds = new Map<string, number>(
    ALPHABET.map((l) => [l, folder(l, importsId)]),
  );

  // In-run dedupe is separate from the ledger: within one run the newest
  // copy of a key (first after the sort) must win even in --update mode,
  // where ledger membership no longer means "skip".
  const seenThisRun = new Set<string>();
  for (const a of assembled) {
    if (seenThisRun.has(a.key)) {
      skipped++;
      continue;
    }
    seenThisRun.add(a.key);
    if (alreadyImported.has(a.key)) {
      if (update) {
        updateSheet.run(JSON.stringify(a.cutsheet), a.updatedAt, a.key);
        updated++;
      } else {
        skipped++;
      }
      continue;
    }
    let folderId = builderFolderIds.get(a.builder);
    if (folderId == null) {
      const letter = builderLetter(a.builder);
      let letterId = letterIds.get(letter);
      if (letterId == null) {
        letterId = folder(letter, importsId); // "#" catch-all, created lazily
        letterIds.set(letter, letterId);
      }
      folderId = folder(a.builder, letterId);
      builderFolderIds.set(a.builder, folderId);
    }
    const res = insertSheet.run(
      JSON.stringify(a.cutsheet),
      folderId,
      a.createdAt,
      a.updatedAt,
    );
    recordImport.run(a.key, Number(res.lastInsertRowid));
    // Keep the in-memory set current so the same sheet appearing twice within
    // one run (e.g. a template exported into several letter directories) is
    // skipped instead of violating the ledger's PRIMARY KEY.
    alreadyImported.add(a.key);
    imported++;
  }
});
seed();

console.log(`imported ${imported} cutsheets into ${dbPath}`);
if (updated > 0) console.log(`updated ${updated} existing sheets in place (--update)`);
if (skipped > 0) console.log(`skipped ${skipped} already-imported (legacy_imports ledger)`);
if (emptySkipped > 0) console.log(`skipped ${emptySkipped} empty Access artifact rows`);
console.log(`folders created: ${foldersCreated}`);
console.log(`legacy leftover lines preserved in Miscellaneous: ${leftoverTotal}`);
if (failures.length > 0) {
  console.error(`FAILED validation: ${failures.length}`);
  for (const f of failures.slice(0, 10)) console.error(`  #${f.id}: ${f.error}`);
  process.exit(2);
}
