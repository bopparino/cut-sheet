import { db } from "@/lib/db";
import { CutsheetSchema, type Cutsheet } from "@/lib/schema";

// The "whole house" behind a property number - IF the sheets sharing that
// number actually form one house. A property number is the Salesforce lot
// record, so one physical house legitimately spans several sheets: its zones
// AND its option sheets (basement rec room / bathroom / bedroom, all "Zone 1")
// - the old Access shop package summed exactly that set, verified against a
// printed 2026 packet for prop 219786. What must NEVER be summed is the
// import's placeholder numbers (999999999 sits on 63 unrelated sheets across
// different builders) and template sheets filed without a job. One physical
// house = one builder + one lot, so that's the test: every sheet agrees on
// builder and on a non-empty lot. Anything else returns null and callers fall
// back to the per-sheet documents - the exact output the shop got before
// consolidation existed.

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
  const [lot] = lots;

  return builders.size === 1 && lots.size === 1 && lot !== "" ? sheets : null;
}
