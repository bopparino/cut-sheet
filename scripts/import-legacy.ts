/**
 * One-time seed: import legacy Access-table exports into the cutsheets DB.
 *
 * Input: a JSON file produced from the five tbl_Cut_Sheet_Library_*.xlsx
 * exports (Header, Custom_Duct, Stock_Duct, PreFab, DuctBoard), shaped as
 *   { [tableName]: { headers: string[], rows: Record<string, unknown>[] } }
 * with every row carrying `property_number` and `Cut Sheet #` join keys.
 *
 * Usage:
 *   npx tsx scripts/import-legacy.ts <raw.json> [--force]
 *
 * DATABASE_PATH picks the target DB (defaults to ./data/cutsheets.db, same
 * as the app). Refuses to run against a non-empty cutsheets table unless
 * --force is passed, so a re-run can't silently double-seed.
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
import { readFileSync } from "node:fs";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import Database from "better-sqlite3";
import { CutsheetSchema, emptyCutsheet, type Cutsheet } from "../src/lib/schema";

type Row = Record<string, unknown>;
type Tables = Record<string, { headers: string[]; rows: Row[] }>;

const [, , inputPath, ...flags] = process.argv;
if (!inputPath) {
  console.error("usage: npx tsx scripts/import-legacy.ts <raw.json> [--force]");
  process.exit(1);
}
const force = flags.includes("--force");

const raw = JSON.parse(readFileSync(resolve(inputPath), "utf8")) as Tables;
for (const t of ["Header", "Custom_Duct", "Stock_Duct", "PreFab"]) {
  if (!raw[t]) throw new Error(`input JSON is missing table ${t}`);
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

// ----- index the four live tables by Cut Sheet # -------------------------

const SHEET_KEY = (r: Row) => num(r["Cut Sheet #"] ?? r["Cut Sheet ."]);
const byId = (t: { rows: Row[] }) => new Map(t.rows.map((r) => [SHEET_KEY(r), r]));
const headerRows = raw.Header.rows;
const customById = byId(raw.Custom_Duct);
const stockById = byId(raw.Stock_Duct);
const prefabById = byId(raw.PreFab);

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
    const first = str(rows[0][col]);
    if (rows.every((r) => str(r[col]) === first)) out.add(col);
  }
  return out;
}

const CONSTANTS = {
  customDuct: constantCols(raw.Custom_Duct.rows),
  stock: constantCols(raw.Stock_Duct.rows),
  prefab: constantCols(raw.PreFab.rows),
  header: constantCols(raw.Header.rows),
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
    Angles: "angles",
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
  fillMap(row, cs.formOnly.blueFlashing as Record<string, number>, {
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
      "BlueFlashingP300",
    ],
    leftovers,
    CONSTANTS.stock,
  );
}

function mapCustomDuct(row: Row, cs: Cutsheet, leftovers: string[]) {
  // Sheet Metal Lines -> free-text additions on the Custom ticket.
  for (let i = 1; i <= 12; i++) {
    const label = str(row[`Sheet Metal Line ${i}`]);
    if (!label) continue;
    const qty = num(row[`Sheet Metal Line ${i} Qty`]);
    cs.customLines.push({ ticket: "custom", label, qty: qty || 1 });
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
  });

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
      "Fan Housings", "FAN LIGHT COMBOS", "CustomFan1", "CustomFan2", "CustomFan3",
      "ROOFJACKS", "NVFanLights",
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
  cutsheet: Cutsheet;
  builder: string;
  createdAt: string | null;
  updatedAt: string | null;
};

const assembled: Assembled[] = [];
const failures: { id: number; error: string }[] = [];
let leftoverTotal = 0;

for (const h of headerRows) {
  const id = SHEET_KEY(h);
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
  collectLeftovers(h, ["Comments", "Creation Notes"], leftovers, CONSTANTS.header);

  const custom = customById.get(id);
  const stock = stockById.get(id);
  const prefab = prefabById.get(id);
  if (custom) mapCustomDuct(custom, cs, leftovers);
  if (stock) mapStock(stock, cs, leftovers);
  if (prefab) mapPreFab(prefab, cs, leftovers);

  cs.custom.miscellaneous.push(...leftovers);
  leftoverTotal += leftovers.length;

  const parsed = CutsheetSchema.safeParse(cs);
  if (!parsed.success) {
    failures.push({ id, error: parsed.error.issues[0]?.message ?? "unknown" });
    continue;
  }
  assembled.push({
    cutsheet: parsed.data,
    builder: str(h.Builder) || "(no builder)",
    createdAt: stamp(h.DateCreated),
    updatedAt: stamp(h["Date Modified"]) ?? stamp(h.DateCreated),
  });
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

const existing = (db.prepare("SELECT COUNT(*) AS n FROM cutsheets").get() as { n: number }).n;
if (existing > 0 && !force) {
  console.error(
    `cutsheets table already has ${existing} rows — pass --force to append anyway`,
  );
  process.exit(1);
}

const insertFolder = db.prepare(
  "INSERT INTO folders (name, parent_id) VALUES (?, ?)",
);
const insertSheet = db.prepare(
  `INSERT INTO cutsheets (data, folder_id, created_at, updated_at)
   VALUES (?, ?, COALESCE(?, datetime('now')), COALESCE(?, datetime('now')))`,
);

const ALPHABET = Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i));
const builderLetter = (builder: string) => {
  const first = builder.trim().charAt(0).toUpperCase();
  return first >= "A" && first <= "Z" ? first : "#";
};

let foldersCreated = 0;
const builderFolderIds = new Map<string, number>();
const seed = db.transaction(() => {
  const mkFolder = (name: string, parentId: number | null) => {
    foldersCreated++;
    return Number(insertFolder.run(name, parentId).lastInsertRowid);
  };

  // Empty A-Z folders at the top level for day-to-day filing.
  for (const l of ALPHABET) mkFolder(l, null);

  // IMPORTS > A-Z, created up front so the imported tree is complete even
  // for letters with no current builder.
  const importsId = mkFolder("IMPORTS", null);
  const letterIds = new Map<string, number>(
    ALPHABET.map((l) => [l, mkFolder(l, importsId)]),
  );

  for (const a of assembled) {
    let folderId = builderFolderIds.get(a.builder);
    if (folderId == null) {
      const letter = builderLetter(a.builder);
      let letterId = letterIds.get(letter);
      if (letterId == null) {
        letterId = mkFolder(letter, importsId); // "#" catch-all, created lazily
        letterIds.set(letter, letterId);
      }
      folderId = mkFolder(a.builder, letterId);
      builderFolderIds.set(a.builder, folderId);
    }
    insertSheet.run(JSON.stringify(a.cutsheet), folderId, a.createdAt, a.updatedAt);
  }
});
seed();

console.log(`imported ${assembled.length} cutsheets into ${dbPath}`);
console.log(
  `folders created: ${foldersCreated} (A-Z, IMPORTS/A-Z, ${builderFolderIds.size} builder folders)`,
);
console.log(`legacy leftover lines preserved in Miscellaneous: ${leftoverTotal}`);
if (failures.length > 0) {
  console.error(`FAILED validation: ${failures.length}`);
  for (const f of failures.slice(0, 10)) console.error(`  #${f.id}: ${f.error}`);
  process.exit(2);
}
