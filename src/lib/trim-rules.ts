import type { Cutsheet, TrimPull, TrimRow, TrimExtraRow } from "./schema";
import { TRIM_REGISTERS, TRIM_GRILL, TRIM_FLOOR_REG, TRIM_FANS } from "./schema";

// Consolidate the trim pull across a whole house. Unlike the pick ticket (one
// flat list), the trim sheet keeps its Zone 1 / 2 / 3 / Base columns - each of
// the house's cutsheets already carries its trim in the right column, so we
// sum the matrices element-wise: cell [item][zone] = the sum of that cell over
// every sheet sharing the property number. Kimmy's hand-added items ride along
// as the per-sheet "extra" rows, which are merged by label the same way.

const zero = (): TrimRow => ({ zone1: 0, zone2: 0, zone3: 0, base: 0 });

const addInto = (acc: TrimRow, r: TrimRow | undefined) => {
  if (!r) return acc;
  acc.zone1 += r.zone1;
  acc.zone2 += r.zone2;
  acc.zone3 += r.zone3;
  acc.base += r.base;
  return acc;
};

function sumMap<T extends string>(items: readonly T[], maps: Record<T, TrimRow>[]): Record<T, TrimRow> {
  const out = {} as Record<T, TrimRow>;
  for (const item of items) {
    const acc = zero();
    for (const m of maps) addInto(acc, m[item]);
    out[item] = acc;
  }
  return out;
}

// Merge free "extra" rows by label (first-seen order), summing each zone.
function sumExtras(lists: TrimExtraRow[][]): TrimExtraRow[] {
  const order: string[] = [];
  const acc = new Map<string, TrimExtraRow>();
  for (const list of lists) {
    for (const x of list) {
      const label = x.label.trim();
      if (!label) continue;
      let e = acc.get(label);
      if (!e) {
        e = { label, zone1: 0, zone2: 0, zone3: 0, base: 0 };
        acc.set(label, e);
        order.push(label);
      }
      addInto(e, x);
    }
  }
  return order.map((l) => acc.get(l)!);
}

export function consolidateTrimPull(sheets: Cutsheet[]): TrimPull {
  const t = sheets.map((s) => s.trimPull);
  return {
    registers: sumMap(TRIM_REGISTERS, t.map((x) => x.registers)),
    registersExtra: sumExtras(t.map((x) => x.registersExtra)),
    grill: sumMap(TRIM_GRILL, t.map((x) => x.grill)),
    grillExtra: sumExtras(t.map((x) => x.grillExtra)),
    floorReg: sumMap(TRIM_FLOOR_REG, t.map((x) => x.floorReg)),
    floorRegExtra: sumExtras(t.map((x) => x.floorRegExtra)),
    fans: sumMap(TRIM_FANS, t.map((x) => x.fans)),
    fansExtra: sumExtras(t.map((x) => x.fansExtra)),
  };
}
