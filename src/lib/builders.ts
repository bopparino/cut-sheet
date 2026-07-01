import "server-only";
import { db } from "@/lib/db";

// The shop organizes work by builder, not by alphabet. This rolls the flat
// cutsheets table up into one row per builder, derived from each sheet's
// header.builder field — no separate builder table to keep in sync. Each
// builder carries its own cutsheets as openable leaves so the Browse screen
// can expand a builder straight to its sheets. Sheets with no builder land in
// a single "Unfiled" bucket that sorts to the bottom.
//
// This is read-only derivation for display. It does not change how cutsheets
// are stored, filed, or edited.

export type CutsheetLeaf = {
  id: number;
  title: string;
  lot: string;
  deliveryDate: string;
  updatedAt: string;
};

export type BuilderRow = {
  name: string;
  unfiled: boolean;
  cutsheets: number;
  activeLots: number;
  updatedAt: string; // most recent sheet's UTC timestamp
  sheets: CutsheetLeaf[];
};

export type BuilderRollup = {
  builders: BuilderRow[];
  totalBuilders: number;
  totalCutsheets: number;
};

type Row = { id: number; data: string; updated_at: string };
type Agg = {
  name: string;
  unfiled: boolean;
  lots: Set<string>;
  updatedAt: string;
  sheets: CutsheetLeaf[];
};

type Header = { builder?: string; project?: string; lot?: string; deliveryDate?: string };

// Same display title the Recent tiles and search results use: explicit name,
// else builder · project, else the numeric fallback.
function deriveTitle(name: string, h: Header, id: number): string {
  return (
    (name ?? "").trim() ||
    [h.builder, h.project].filter(Boolean).join(" · ") ||
    `Cutsheet #${id}`
  );
}

// Distinct, non-empty builder names across all live cutsheets, alphabetical.
// Feeds the builder autocomplete (datalist) on the new-cutsheet and replica
// header inputs.
export function listBuilderNames(): string[] {
  const rows = db
    .prepare<[], { b: string }>(
      `SELECT DISTINCT TRIM(json_extract(data, '$.header.builder')) AS b
       FROM cutsheets
       WHERE deleted_at IS NULL
         AND json_extract(data, '$.header.builder') IS NOT NULL
         AND TRIM(json_extract(data, '$.header.builder')) != ''
       ORDER BY b COLLATE NOCASE ASC`,
    )
    .all();
  return rows.map((r) => r.b);
}

export function getBuilderRollup(): BuilderRollup {
  const rows = db
    .prepare<[], Row>("SELECT id, data, updated_at FROM cutsheets WHERE deleted_at IS NULL")
    .all();

  const map = new Map<string, Agg>();

  for (const r of rows) {
    let parsed: { name?: string; header?: Header } = {};
    try {
      parsed = JSON.parse(r.data) as typeof parsed;
    } catch {
      // Unparseable rows still count toward the unfiled bucket.
    }
    const h = parsed.header ?? {};
    const builder = (h.builder ?? "").trim();
    const unfiled = builder === "";
    const key = unfiled ? " unfiled" : builder.toLowerCase();

    let a = map.get(key);
    if (!a) {
      a = {
        name: unfiled ? "Unfiled" : builder,
        unfiled,
        lots: new Set(),
        updatedAt: r.updated_at,
        sheets: [],
      };
      map.set(key, a);
    }

    const lot = (h.lot ?? "").trim();
    if (lot) a.lots.add(lot.toLowerCase());
    if (r.updated_at > a.updatedAt) a.updatedAt = r.updated_at;
    a.sheets.push({
      id: r.id,
      title: deriveTitle(parsed.name ?? "", h, r.id),
      lot,
      deliveryDate: (h.deliveryDate ?? "").trim(),
      updatedAt: r.updated_at,
    });
  }

  const builders: BuilderRow[] = [...map.values()].map((a) => ({
    name: a.name,
    unfiled: a.unfiled,
    cutsheets: a.sheets.length,
    activeLots: a.lots.size,
    updatedAt: a.updatedAt,
    // Most recently touched sheet first within each builder.
    sheets: a.sheets.sort((x, y) => (x.updatedAt < y.updatedAt ? 1 : -1)),
  }));

  // Alphabetical by builder; the unfiled bucket always sinks to the bottom.
  builders.sort((x, y) => {
    if (x.unfiled !== y.unfiled) return x.unfiled ? 1 : -1;
    return x.name.localeCompare(y.name);
  });

  const filed = builders.filter((b) => !b.unfiled);
  return {
    builders,
    totalBuilders: filed.length,
    totalCutsheets: rows.length,
  };
}
