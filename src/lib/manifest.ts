/**
 * Build a truck packing manifest from sheets matching filters.
 * Aggregates every non-zero component across matched sheets,
 * grouped by category for the shop foreman.
 */

import type { AriyaFilters } from "./ariya";
import { loadSheets, textMatch } from "./ariya";

export type ManifestItem = {
  category: string;
  name: string;
  size?: string;
  totalQty: number;
  sheets: number; // how many sheets this item appears in
};

export type ManifestResult = {
  deliveryDateFrom: string | null;
  deliveryDateTo: string | null;
  builderFilter: string | null;
  totalSheets: number;
  items: ManifestItem[];
};

export function buildManifest(filters: AriyaFilters): ManifestResult {
  const sheets = loadSheets(filters);
  const matched = filters.text ? textMatch(sheets, filters.text).map((m: { sheet: typeof sheets[number] }) => m.sheet) : sheets;

  // Accumulate items by (category, name, size) key
  const acc = new Map<string, { category: string; name: string; size?: string; totalQty: number; sheets: number }>();
  const key = (category: string, name: string, size?: string) =>
    size ? `${category}::${name}::${size}` : `${category}::${name}`;

  const add = (category: string, name: string, qty: number, size?: string) => {
    if (qty <= 0) return;
    const k = key(category, name, size);
    const existing = acc.get(k);
    if (existing) {
      existing.totalQty += qty;
      existing.sheets += 1;
    } else {
      acc.set(k, { category, name, size, totalQty: qty, sheets: 1 });
    }
  };

  for (const sheet of matched) {
    const d = sheet.data;

    // Stock duct60
    for (const [size, qty] of Object.entries(d.stock.duct60)) {
      if ((qty as number) > 0) add("Stock Duct (60)", `Duct ${size}`, qty as number, size);
    }

    // SD Misc
    if (d.stock.sdMisc.drive24 > 0) add("SD Misc", "Drive 24", d.stock.sdMisc.drive24);
    if (d.stock.sdMisc.slips26 > 0) add("SD Misc", "Slips 26", d.stock.sdMisc.slips26);
    if (d.stock.sdMisc.mastic > 0) add("SD Misc", "Mastic", d.stock.sdMisc.mastic);
    if (d.stock.sdMisc.brushes > 0) add("SD Misc", "Brushes", d.stock.sdMisc.brushes);

    // Custom end caps
    for (const row of d.custom.endCaps) {
      if (row.qty > 0) add("Custom", "End Cap", row.qty, `${row.w}×${row.h}`);
    }

    // Custom volume dampers
    for (const row of d.custom.volumeDampers) {
      if (row.qty > 0) add("Custom", "Volume Damper", row.qty, `${row.w}×${row.h}`);
    }

    // Custom canvas connectors
    for (const row of d.custom.canvasConn) {
      if (row.qty > 0) add("Custom", "Canvas Connector", row.qty, `${row.w}×${row.h}`);
    }

    // Custom duct
    for (const row of d.custom.customDuct) {
      if (row.qty > 0) add("Custom", "Custom Duct", row.qty, `${row.w}×${row.h}×${row.l}`);
    }

    // Custom miscellaneous (text-only, no qty — skip for manifest)
    // Round collars
    for (const [size, qty] of Object.entries(d.custom.rndCollars)) {
      if ((qty as number) > 0) add("Custom", "Round Collar", qty as number, `${size}"`);
    }

    // Round volume dampers
    for (const [size, qty] of Object.entries(d.custom.roundVolumeDampers)) {
      if ((qty as number) > 0) add("Custom", "Round Volume Damper", qty as number, `${size}"`);
    }

    // Custom lines
    for (const row of d.customLines) {
      if (row.qty > 0) add("Custom Lines", row.label || "Custom Item", row.qty);
    }

    // Fittings
    for (const row of d.fittings) {
      if (row.qty > 0) add("Fittings", row.type || "Fitting", row.qty);
    }

    // Truck
    for (const [size, qty] of Object.entries(d.truck.ovPipe)) {
      if ((qty as number) > 0) add("Truck", "Oval Pipe", qty as number, size);
    }
    for (const [size, qty] of Object.entries(d.truck.rndPipe)) {
      if ((qty as number) > 0) add("Truck", "Round Pipe", qty as number, size);
    }
  }

  // Sort: category first, then by name, then by size
  const items = [...acc.values()].sort((a, b) => {
    if (a.category !== b.category) return a.category.localeCompare(b.category);
    if (a.name !== b.name) return a.name.localeCompare(b.name);
    return (a.size ?? "").localeCompare(b.size ?? "");
  });

  return {
    deliveryDateFrom: filters.deliveryFrom ?? null,
    deliveryDateTo: filters.deliveryTo ?? null,
    builderFilter: filters.builder ?? null,
    totalSheets: matched.length,
    items,
  };
}
