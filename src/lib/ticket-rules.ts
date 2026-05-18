import type { Cutsheet, TicketKind } from "./schema";
import { DUCT60_SIZES, RND_SIZES, OV_PIPE_SIZES, RND_PIPE_SIZES } from "./schema";

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
