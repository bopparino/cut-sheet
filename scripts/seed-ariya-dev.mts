/**
 * Dev fixture for the Ariya API: inserts a handful of known cut sheets so
 * search/aggregate answers can be checked by hand (8x16 duct60 totals 16
 * across the two NVR sheets, prop 219786 spans two zone sheets, prop
 * 999999999 is the legacy placeholder, etc).
 *
 * Usage:
 *   npx tsx scripts/seed-ariya-dev.mts [--force]
 *
 * DATABASE_PATH picks the target (defaults to ./data/cutsheets.db, same as
 * the app). Refuses to touch a DB that already has cutsheets unless --force —
 * this is a dev fixture, pointing it at production data is always a mistake.
 */
import Database from "better-sqlite3";
import { CutsheetSchema, type Cutsheet } from "../src/lib/schema";

const path = process.env.DATABASE_PATH ?? "./data/cutsheets.db";
const db = new Database(path);

const existing = (db.prepare("SELECT COUNT(*) AS n FROM cutsheets").get() as { n: number }).n;
if (existing > 0 && !process.argv.includes("--force")) {
  console.error(`Refusing: ${path} already has ${existing} cutsheet(s). Pass --force if you really mean it.`);
  process.exit(1);
}

type Deep = Record<string, unknown>;

function sheet(overrides: Deep): Cutsheet {
  // parse() fills every default; overrides ride on top of the empty form.
  const base: Deep = {
    header: {},
    stock: { duct60: {}, sdMisc: {} },
    custom: {
      endCaps: [], volumeDampers: [], canvasConn: [], customDuct: [],
      miscellaneous: [], rndCollars: {}, roundVolumeDampers: {},
    },
    truck: { ovPipe: {}, rndPipe: {} },
    formOnly: {
      filterRacks: {}, drainPans: {}, returnPlenum: {},
      plenumContents: { small: {}, large: {} },
      ovalEll: {}, ovalToRnd: {}, ovalSHeads: {}, ellBoots: {}, endBoots: {},
      strtBoots: {}, tto: {}, midAtlanticWallCaps: {}, birdCage: {},
      metalScreen: {}, dryerBox: {}, rndEll: {}, blueFlashing: {},
      freshAirDampers: {}, galRedr: {}, fans: {}, straightBootBoxes: {},
      simpsonStp: {}, sdMiscExtras: {}, uninsulatedFlex: {},
      insulatedFlexR4: {}, insulatedFlexR8: {}, saddleTap: {}, airTights: {},
      bVent: {}, flexBVent: {}, panningMetal36x36: 0, condRegs8x6: 0,
    },
  };
  const merge = (target: Deep, source: Deep): Deep => {
    for (const [k, v] of Object.entries(source)) {
      if (v && typeof v === "object" && !Array.isArray(v) && target[k] && typeof target[k] === "object") {
        merge(target[k] as Deep, v as Deep);
      } else {
        target[k] = v;
      }
    }
    return target;
  };
  return CutsheetSchema.parse(merge(base, overrides));
}

const fixtures: Array<{ data: Cutsheet; createdAt?: string }> = [
  {
    data: sheet({
      name: "Stone Ridge 15K Zone 1",
      header: {
        builder: "NVR", project: "Stone Ridge", lot: "15K", propNumber: "219786",
        region: "MD", zone: "Zone 1", foreman: "Mike", projectCode: "SR22",
        deliveryDate: "8/25/2026", plenumPackage: "small",
      },
      stock: { duct60: { "8x16": 12, "10x12": 6 } },
      formOnly: { insulatedFlexR8: { "6": 10 } },
      custom: { miscellaneous: ["Legacy — 2 rolls foil tape"] },
    }),
  },
  {
    data: sheet({
      name: "Stone Ridge 15K Zone 2",
      header: {
        builder: "NVR", project: "Stone Ridge", lot: "15K", propNumber: "219786",
        region: "MD", zone: "Zone 2", foreman: "Mike", projectCode: "SR22",
      },
      stock: { duct60: { "8x16": 4 } },
      truck: { rndPipe: { "6x10": 8 } },
    }),
  },
  {
    data: sheet({
      name: "Hartland 101",
      header: {
        builder: "Ryan Homes", project: "Hartland", lot: "101", propNumber: "300123",
        region: "VA", foreman: "Dale", plenumPackage: "large",
      },
      custom: { customDuct: [{ qty: 2, w: "18", h: "8", l: "60", sl: "Y" }] },
      truck: { rndPipe: { "6x10": 20 } },
      customLines: [{ ticket: "truck", label: "Extra bundle of hangers", qty: 1 }],
    }),
    createdAt: "2025-12-01 10:00:00",
  },
  {
    data: sheet({
      name: "Legacy import — DAN RYAN",
      header: { builder: "DAN RYAN", propNumber: "999999999", region: "WV" },
      formOnly: { legacyNotes: ["Legacy — special order register boot"] },
      stock: { duct60: { "8x16": 99 } },
    }),
  },
];

const insert = db.prepare(
  "INSERT INTO cutsheets (data, created_at, updated_at) VALUES (?, COALESCE(?, datetime('now')), COALESCE(?, datetime('now')))",
);
for (const f of fixtures) {
  const info = insert.run(JSON.stringify(f.data), f.createdAt ?? null, f.createdAt ?? null);
  console.log(`Seeded sheet #${info.lastInsertRowid}: ${f.data.name}`);
}
console.log("Done.");
