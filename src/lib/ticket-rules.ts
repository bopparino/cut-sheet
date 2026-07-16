import type { Cutsheet, TicketKind } from "./schema";
import {
  DUCT60_SIZES,
  RND_SIZES,
  OV_PIPE_SIZES,
  RND_PIPE_SIZES,
  DRAIN_PANS_KEYS,
} from "./schema";

export type TicketRow = { label: string; qty: number | string };

const labelDuct60 = (size: string) => {
  if (size.startsWith("3.25")) {
    const rest = size.slice(5);
    return `3 1/4 x ${rest} Duct`;
  }
  return `${size}x60 Duct`;
};

export function buildTicketSections(form: Cutsheet, ticket: TicketKind): TicketRow[] {
  const rows: TicketRow[] = [];

  if (ticket === "stock") {
    const { sdMisc, duct60 } = form.stock;
    if (sdMisc.mastic > 0) rows.push({ label: "Mastic", qty: sdMisc.mastic });
    if (sdMisc.brushes > 0) rows.push({ label: "Brushes", qty: sdMisc.brushes });
    for (const size of DUCT60_SIZES) {
      const q = duct60[size];
      if (q > 0) rows.push({ label: labelDuct60(size), qty: q });
    }
    if (sdMisc.drive24 > 0) rows.push({ label: "24 Inch Drives", qty: sdMisc.drive24 });
    if (sdMisc.slips26 > 0) rows.push({ label: "26 Inch Slips", qty: sdMisc.slips26 });
  }

  if (ticket === "custom") {
    const c = form.custom;
    for (const r of c.miscellaneous) {
      const v = r.trim();
      if (v) rows.push({ label: v, qty: "" });
    }
    for (const r of c.endCaps) {
      if (r.qty > 0) rows.push({ label: `EC ${r.w} W X ${r.h} H`, qty: r.qty });
    }
    for (const r of c.volumeDampers) {
      if (r.qty > 0) rows.push({ label: `VD ${r.w} W X ${r.h} H`, qty: r.qty });
    }
    for (const r of c.canvasConn) {
      if (r.qty > 0) rows.push({ label: `CC ${r.w} W X ${r.h} H`, qty: r.qty });
    }
    for (const r of c.customDuct) {
      if (r.qty > 0) {
        rows.push({ label: `CD ${r.w} W X ${r.h} H X ${r.l}L SL = ${r.sl}`, qty: r.qty });
      }
    }
    // Drain pans live in formOnly but ride the custom pick ticket (the old
    // system listed them as "DP31X31" here), so the shop pulls them with the
    // rest of the custom fab.
    for (const s of DRAIN_PANS_KEYS) {
      const q = form.formOnly.drainPans[s];
      if (q > 0) rows.push({ label: `DP${s.toUpperCase()}`, qty: q });
    }
    for (const s of RND_SIZES) {
      const q = c.rndCollars[s];
      if (q > 0) rows.push({ label: `${s}" Round Collar`, qty: q });
    }
    for (const s of RND_SIZES) {
      const q = c.roundVolumeDampers[s];
      if (q > 0) rows.push({ label: `${s}" Round Volume Damper`, qty: q });
    }
  }

  if (ticket === "truck") {
    for (const s of OV_PIPE_SIZES) {
      const q = form.truck.ovPipe[s];
      if (q > 0) rows.push({ label: `${s}" OV Pipe`, qty: q });
    }
    for (const s of RND_PIPE_SIZES) {
      const q = form.truck.rndPipe[s];
      if (q > 0) rows.push({ label: `${s} Round`, qty: q });
    }
  }

  for (const line of form.customLines) {
    if (line.ticket === ticket && line.label.trim()) {
      rows.push({ label: line.label.trim(), qty: line.qty });
    }
  }

  return rows;
}

// A house is split into several cutsheets (one per zone, and per option), all
// sharing a property number. The pick ticket has to cover the WHOLE house, so
// this sums the per-sheet ticket rows across every sheet, merging by label:
// two sheets each needing "8x8x60 Duct" become one line with the combined qty.
// Options are additive (confirmed against the shop's old consolidated tickets),
// so a plain sum is correct.
//
// Quantity merging: numeric qtys add. A blank qty ("" - a free-text
// Miscellaneous line, which is one physical item) counts as 1, so the same
// note on N sheets totals N. A non-numeric text qty (rare, from customLines)
// is kept as text when nothing numeric merged into that label.
export function buildConsolidatedTicket(sheets: Cutsheet[], ticket: TicketKind): TicketRow[] {
  const order: string[] = [];
  const acc = new Map<string, { num: number; hasNum: boolean; text: string }>();

  for (const sheet of sheets) {
    for (const r of buildTicketSections(sheet, ticket)) {
      let e = acc.get(r.label);
      if (!e) {
        e = { num: 0, hasNum: false, text: "" };
        acc.set(r.label, e);
        order.push(r.label);
      }
      if (typeof r.qty === "number") {
        e.num += r.qty;
        e.hasNum = true;
      } else if (r.qty === "") {
        e.num += 1; // presence line = one item
        e.hasNum = true;
      } else {
        const n = Number(r.qty);
        if (Number.isFinite(n)) {
          e.num += n;
          e.hasNum = true;
        } else if (!e.text) {
          e.text = r.qty;
        }
      }
    }
  }

  return order.map((label) => {
    const e = acc.get(label)!;
    return { label, qty: e.hasNum ? e.num : e.text };
  });
}
