import { db } from "@/lib/db";
import { CutsheetSchema, type Cutsheet } from "@/lib/schema";

// The "whole house" behind a property number - IF the sheets sharing that
// number actually form one house. Kimmy's rule (one cut sheet per zone, same
// property number on each) holds for sheets made in the app, but the imported
// Access library reuses property numbers in ways that must never be summed:
//   - option/revision variants of one plan ("*HADLEY - BASEMENT BATHROOM",
//     "*HADLEY - ON BASEMENT REV 2/3/2026", ...) all carry the plan's number;
//   - placeholder numbers (999999999) sit on dozens of unrelated sheets
//     across different builders.
// So a set of sheets consolidates only when it looks like one real house:
// same builder, same lot, and no two sheets claiming the same zone. Anything
// else returns null and callers fall back to the per-sheet documents - the
// exact output the shop got before consolidation existed.

export type HouseSheet = { id: number; data: Cutsheet };

const norm = (s: string | undefined | null) => (s ?? "").trim().toUpperCase().replace(/\s+/g, " ");

export function houseSheets(propNumber: string): HouseSheet[] | null {
  const prop = propNumber.trim();
  if (!prop) return null;

  const rows = db
    .prepare<[string], { id: number; data: string }>(
      `SELECT id, data FROM cutsheets
       WHERE deleted_at IS NULL
         AND TRIM(json_extract(data, '$.header.propNumber')) = ?
       ORDER BY
         CAST(json_extract(data, '$.header.zone') AS INTEGER) ASC,
         json_extract(data, '$.header.zone') ASC,
         id ASC`,
    )
    .all(prop);

  const sheets: HouseSheet[] = rows
    .map((r) => {
      const parsed = CutsheetSchema.safeParse(JSON.parse(r.data));
      return parsed.success ? { id: r.id, data: parsed.data } : null;
    })
    .filter((x): x is HouseSheet => x !== null);

  if (sheets.length === 0) return null;
  if (sheets.length === 1) return sheets;

  const builders = new Set(sheets.map((s) => norm(s.data.header.builder)));
  const lots = new Set(sheets.map((s) => norm(s.data.header.lot)));
  const zones = sheets.map((s) => norm(s.data.header.zone));
  const zonesDistinct = new Set(zones).size === zones.length;

  return builders.size === 1 && lots.size === 1 && zonesDistinct ? sheets : null;
}
