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

// ---------------------------------------------------------------------------
// Field-derived browse hierarchy: Builder -> Subdivision (header.project) ->
// House type (header.houseType) -> the cutsheets themselves. Kimmy navigates
// by these three, not by folders, so each level is a live GROUP BY over the
// header fields - nothing to keep in sync, and it always reflects the data.
// Empty values bucket to a labeled "(none)" group that sorts last.
// ---------------------------------------------------------------------------

export type BrowseLevelRow = {
  value: string; // raw grouping value ("" when the field is blank)
  label: string; // display label (value, or a "(none)" placeholder)
  cutsheets: number; // sheets under this node (whole subtree)
  children: number; // count of next-level groups (0 at the house-type level)
  updatedAt: string; // most recently touched sheet in the subtree
  // House-type rows that resolve to exactly one sheet carry its id so the row
  // opens the sheet directly instead of a one-item list (the common case,
  // since the house-type name bakes in option + revision so it's ~unique).
  soleSheetId?: number;
};

const B = "COALESCE(TRIM(json_extract(data,'$.header.builder')),'')";
const P = "COALESCE(TRIM(json_extract(data,'$.header.project')),'')";
const HT = "COALESCE(TRIM(json_extract(data,'$.header.houseType')),'')";

type LevelQueryRow = { value: string; cutsheets: number; children: number; updatedAt: string };

const withLabel = (rows: LevelQueryRow[], emptyLabel: string): BrowseLevelRow[] =>
  rows.map((r) => ({ ...r, label: r.value === "" ? emptyLabel : r.value }));

// Level 1: builders, each carrying its subdivision + sheet counts.
export function getBuilderLevel(): BrowseLevelRow[] {
  const rows = db
    .prepare<[], LevelQueryRow>(
      `SELECT ${B} AS value, COUNT(*) AS cutsheets,
              COUNT(DISTINCT ${P}) AS children, MAX(updated_at) AS updatedAt
       FROM cutsheets WHERE deleted_at IS NULL
       GROUP BY value ORDER BY (value = ''), value COLLATE NOCASE ASC`,
    )
    .all();
  return withLabel(rows, "Unfiled");
}

// Level 2: subdivisions under one builder, each carrying its house-type count.
export function getSubdivisionLevel(builder: string): BrowseLevelRow[] {
  const rows = db
    .prepare<[string], LevelQueryRow>(
      `SELECT ${P} AS value, COUNT(*) AS cutsheets,
              COUNT(DISTINCT ${HT}) AS children, MAX(updated_at) AS updatedAt
       FROM cutsheets WHERE deleted_at IS NULL AND ${B} = ?
       GROUP BY value ORDER BY (value = ''), value COLLATE NOCASE ASC`,
    )
    .all(builder);
  return withLabel(rows, "(No subdivision)");
}

// Level 3: house types under one builder + subdivision. children = 0 (the
// next level is the sheets themselves), so cutsheets is the meaningful count.
// soleSheetId is set when the house type is a single sheet, so its row opens
// that sheet directly.
export function getHouseTypeLevel(builder: string, subdivision: string): BrowseLevelRow[] {
  const rows = db
    .prepare<[string, string], LevelQueryRow & { soleSheetId: number | null }>(
      `SELECT ${HT} AS value, COUNT(*) AS cutsheets, 0 AS children, MAX(updated_at) AS updatedAt,
              CASE WHEN COUNT(*) = 1 THEN MIN(id) END AS soleSheetId
       FROM cutsheets WHERE deleted_at IS NULL AND ${B} = ? AND ${P} = ?
       GROUP BY value ORDER BY (value = ''), value COLLATE NOCASE ASC`,
    )
    .all(builder, subdivision);
  return rows.map((r) => ({
    value: r.value,
    label: r.value === "" ? "(No house type)" : r.value,
    cutsheets: r.cutsheets,
    children: r.children,
    updatedAt: r.updatedAt,
    soleSheetId: r.soleSheetId ?? undefined,
  }));
}

// Level 4 (leaves): the cutsheets for one builder + subdivision + house type.
export function getHouseTypeSheets(
  builder: string,
  subdivision: string,
  houseType: string,
): CutsheetLeaf[] {
  const rows = db
    .prepare<[string, string, string], Row>(
      `SELECT id, data, updated_at FROM cutsheets
       WHERE deleted_at IS NULL AND ${B} = ? AND ${P} = ? AND ${HT} = ?
       ORDER BY updated_at DESC`,
    )
    .all(builder, subdivision, houseType);
  return rows.map((r) => {
    let parsed: { name?: string; header?: Header } = {};
    try {
      parsed = JSON.parse(r.data) as typeof parsed;
    } catch {
      /* leave blank */
    }
    const h = parsed.header ?? {};
    return {
      id: r.id,
      title: deriveTitle(parsed.name ?? "", h, r.id),
      lot: (h.lot ?? "").trim(),
      deliveryDate: (h.deliveryDate ?? "").trim(),
      updatedAt: r.updated_at,
    };
  });
}

// Header counts for the Browse title bar.
export function getBrowseTotals(): { builders: number; subdivisions: number; cutsheets: number } {
  const r = db
    .prepare<[], { builders: number; subdivisions: number; cutsheets: number }>(
      `SELECT COUNT(DISTINCT ${B}) AS builders,
              COUNT(DISTINCT ${B} || '|' || ${P}) AS subdivisions,
              COUNT(*) AS cutsheets
       FROM cutsheets WHERE deleted_at IS NULL AND ${B} != ''`,
    )
    .get();
  return r ?? { builders: 0, subdivisions: 0, cutsheets: 0 };
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
