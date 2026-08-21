import "server-only";
import { timingSafeEqual, createHash } from "node:crypto";
import { db } from "@/lib/db";
import { CutsheetSchema, emptyCutsheet, type Cutsheet } from "@/lib/schema";

// Read-only query layer for Ariya (the org agent). Same dormant-by-default
// posture as the Salesforce integration: until ARIYA_API_TOKEN is set on the
// service, every /api/ariya endpoint answers 503 and nothing is reachable.
// The endpoints never write and never return attachment blobs — worst case a
// leaked token reads cut sheets, it cannot change or delete anything.

// ---------- auth ----------

export function ariyaAuthError(req: Request): Response | null {
  const token = process.env.ARIYA_API_TOKEN;
  if (!token) {
    return Response.json({ error: "Ariya API is not enabled" }, { status: 503 });
  }
  const header = req.headers.get("authorization") ?? "";
  const presented = header.startsWith("Bearer ") ? header.slice(7) : "";
  // Hash both sides so timingSafeEqual gets equal-length buffers regardless
  // of what the caller sent — comparing raw strings leaks length.
  const a = createHash("sha256").update(presented).digest();
  const b = createHash("sha256").update(token).digest();
  if (!timingSafeEqual(a, b)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

// ---------- filters ----------

export type AriyaFilters = {
  builder?: string;
  project?: string;
  projectCode?: string;
  propNumber?: string;
  lot?: string;
  region?: string;
  foreman?: string;
  createdFrom?: string; // ISO date, compares against cutsheets.created_at
  createdTo?: string;
  text?: string; // free-text match over name/header/misc/custom lines/legacy notes
  // The app's trash is Ariya's archive: the 2026-08-04 cleanup moved ~3600
  // legacy sheets (history back to 2005) to the trash to keep the working UI
  // lean. Ariya includes them by default — excluding them would blind the
  // agent to 97% of company history — and flags each result `archived`.
  excludeArchived?: boolean;
  // Delivery-date range (ISO). header.deliveryDate is free-typed, so this
  // filters on a best-effort parse; sheets whose date can't be parsed are
  // excluded when either bound is set.
  deliveryFrom?: string;
  deliveryTo?: string;
};

// Best-effort parse of the free-typed delivery/date headers. Handles the two
// families actually present in the data: ISO ("2026-08-27") and US slashed
// ("8/25/2026", "8/25/26", occasionally dashed). Anything else → null.
export function parseSheetDate(raw: string): string | null {
  const s = raw.trim();
  if (!s) return null;
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
  m = s.match(/^(\d{1,2})[/\-](\d{1,2})[/\-](\d{2,4})\b/);
  if (m) {
    const mo = Number(m[1]);
    const d = Number(m[2]);
    let y = Number(m[3]);
    if (y < 100) y += y < 50 ? 2000 : 1900;
    if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
    return `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  }
  return null;
}

type Row = {
  id: number;
  data: string;
  folder_id: number | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type ParsedSheet = {
  id: number;
  createdAt: string;
  updatedAt: string;
  folder: string;
  archived: boolean;
  data: Cutsheet;
};

const norm = (s: string | undefined | null) => (s ?? "").trim().toUpperCase().replace(/\s+/g, " ");

// Folder path cache: folders change rarely and there are few of them, so one
// full read per request is cheaper than being clever.
function folderPaths(): Map<number, string> {
  const rows = db
    .prepare<[], { id: number; name: string; parent_id: number | null }>(
      "SELECT id, name, parent_id FROM folders",
    )
    .all();
  const byId = new Map(rows.map((r) => [r.id, r]));
  const paths = new Map<number, string>();
  for (const row of rows) {
    const parts: string[] = [];
    let cur: typeof row | undefined = row;
    // Depth guard: a corrupt parent cycle should degrade, not hang a request.
    for (let i = 0; cur && i < 20; i++) {
      parts.unshift(cur.name);
      cur = cur.parent_id != null ? byId.get(cur.parent_id) : undefined;
    }
    paths.set(row.id, parts.join(" / "));
  }
  return paths;
}

export function loadSheets(filters: AriyaFilters): ParsedSheet[] {
  const where: string[] = filters.excludeArchived ? ["deleted_at IS NULL"] : ["1=1"];
  const params: unknown[] = [];

  const like = (path: string, value: string) => {
    where.push(`UPPER(json_extract(data, '${path}')) LIKE ?`);
    params.push(`%${norm(value)}%`);
  };
  const exact = (path: string, value: string) => {
    where.push(`UPPER(TRIM(json_extract(data, '${path}'))) = ?`);
    params.push(norm(value));
  };

  if (filters.builder) like("$.header.builder", filters.builder);
  if (filters.project) like("$.header.project", filters.project);
  if (filters.foreman) like("$.header.foreman", filters.foreman);
  if (filters.projectCode) exact("$.header.projectCode", filters.projectCode);
  if (filters.propNumber) exact("$.header.propNumber", filters.propNumber);
  if (filters.lot) exact("$.header.lot", filters.lot);
  if (filters.region) exact("$.header.region", filters.region);
  if (filters.createdFrom) {
    where.push("created_at >= ?");
    params.push(filters.createdFrom);
  }
  if (filters.createdTo) {
    // Callers pass dates; created_at is a datetime. <= 'YYYY-MM-DD' would
    // exclude that whole day, so pad to end-of-day when no time is given.
    where.push("created_at <= ?");
    params.push(filters.createdTo.length === 10 ? `${filters.createdTo} 23:59:59` : filters.createdTo);
  }

  const rows = db
    .prepare(
      `SELECT id, data, folder_id, created_at, updated_at, deleted_at FROM cutsheets
       WHERE ${where.join(" AND ")} ORDER BY updated_at DESC`,
    )
    .all(...params) as Row[];

  const folders = folderPaths();
  const out: ParsedSheet[] = [];
  for (const row of rows) {
    // Schema-invalid rows (if any survive elsewhere) are skipped, not fatal —
    // an agent query must never 500 because one legacy row went sideways.
    try {
      const data = CutsheetSchema.parse(JSON.parse(row.data));
      out.push({
        id: row.id,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        folder: row.folder_id != null ? (folders.get(row.folder_id) ?? "") : "",
        archived: row.deleted_at != null,
        data,
      });
    } catch {
      continue;
    }
  }

  if (filters.deliveryFrom || filters.deliveryTo) {
    return out.filter((sheet) => {
      const iso = parseSheetDate(sheet.data.header.deliveryDate);
      if (!iso) return false;
      if (filters.deliveryFrom && iso < filters.deliveryFrom) return false;
      if (filters.deliveryTo && iso > filters.deliveryTo) return false;
      return true;
    });
  }
  return out;
}

// ---------- search ----------

// The free-text haystack: everything a human might remember about a sheet
// that isn't a quantity. Quantities are the aggregate endpoint's job.
export function searchText(sheet: ParsedSheet): string {
  const d = sheet.data;
  const parts: string[] = [
    d.name,
    ...Object.values(d.header).map((v) => String(v ?? "")),
    ...d.custom.miscellaneous,
    ...d.customLines.map((l) => l.label),
    ...d.formOnly.legacyNotes,
    ...d.formOnly.cutSheetMisc,
    ...d.formOnly.wallRegs,
    ...d.formOnly.grills,
    ...d.formOnly.filterGrills,
    ...d.formOnly.floorRegs,
    ...d.fittings.map((f) => f.notes),
    sheet.folder,
  ];
  return parts.filter(Boolean).join(" \n ").toLowerCase();
}

export type SheetSummary = {
  id: number;
  archived: boolean;
  name: string;
  builder: string;
  project: string;
  projectCode: string;
  lot: string;
  block: string;
  section: string;
  propNumber: string;
  region: string;
  foreman: string;
  date: string;
  deliveryDate: string;
  deliveryDateISO: string | null;
  option: string;
  zone: string;
  plenumPackage: string;
  folder: string;
  createdAt: string;
  updatedAt: string;
};

export function summarize(sheet: ParsedSheet): SheetSummary {
  const h = sheet.data.header;
  return {
    id: sheet.id,
    archived: sheet.archived,
    name: sheet.data.name,
    builder: h.builder,
    project: h.project,
    projectCode: h.projectCode,
    lot: h.lot,
    block: h.block,
    section: h.section,
    propNumber: h.propNumber,
    region: h.region,
    foreman: h.foreman,
    date: h.date,
    deliveryDate: h.deliveryDate,
    deliveryDateISO: parseSheetDate(h.deliveryDate),
    option: h.option,
    zone: h.zone,
    plenumPackage: h.plenumPackage,
    folder: sheet.folder,
    createdAt: sheet.createdAt,
    updatedAt: sheet.updatedAt,
  };
}

export function textMatch(
  sheets: ParsedSheet[],
  query: string,
): Array<{ sheet: ParsedSheet; score: number; snippet: string }> {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return sheets.map((sheet) => ({ sheet, score: 0, snippet: "" }));

  const out: Array<{ sheet: ParsedSheet; score: number; snippet: string }> = [];
  for (const sheet of sheets) {
    const hay = searchText(sheet);
    let score = 0;
    let firstIdx = -1;
    for (const term of terms) {
      let idx = hay.indexOf(term);
      if (idx === -1) continue;
      if (firstIdx === -1) firstIdx = idx;
      while (idx !== -1) {
        score++;
        idx = hay.indexOf(term, idx + term.length);
      }
    }
    if (score === 0) continue;
    const start = Math.max(0, firstIdx - 60);
    const snippet = hay.slice(start, firstIdx + 90).replace(/\s+/g, " ").trim();
    out.push({ sheet, score, snippet });
  }
  out.sort((a, b) => b.score - a.score);
  return out;
}

// ---------- aggregate ----------

// Paths use "/" separators because size keys contain dots ("3.25x10").
// A path may land on: a number (summed), an object (numeric leaves summed
// per top-level key), or an array of rows with a qty field (qtys summed).
// matchedBuilders makes filter contamination visible: builder is a partial
// match, so "RYAN" pulls in both RYAN HOMES and DAN RYAN — an agent that can
// see whose sheets it just summed can notice and refine instead of presenting
// a silently polluted total as fact.
export type AggregateResult =
  | {
      kind: "total";
      matchedSheets: number;
      archivedSheets: number;
      matchedBuilders: string[];
      total: number;
    }
  | {
      kind: "perKey";
      matchedSheets: number;
      archivedSheets: number;
      matchedBuilders: string[];
      totals: Record<string, number>;
      grandTotal: number;
    };

function resolvePath(root: unknown, segments: string[]): unknown {
  let cur: unknown = root;
  for (const seg of segments) {
    if (cur == null || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[seg];
  }
  return cur;
}

function sumNumericLeaves(value: unknown): number {
  if (typeof value === "number") return value;
  if (Array.isArray(value)) {
    // Row arrays (endCaps, customDuct, customLines, fittings) all carry qty.
    return value.reduce<number>((acc, item) => {
      if (item && typeof item === "object" && typeof (item as { qty?: unknown }).qty === "number") {
        return acc + (item as { qty: number }).qty;
      }
      return acc;
    }, 0);
  }
  if (value && typeof value === "object") {
    return Object.values(value).reduce<number>((acc, v) => acc + sumNumericLeaves(v), 0);
  }
  return 0;
}

export function aggregate(path: string, filters: AriyaFilters): AggregateResult | { error: string } {
  const segments = path.split("/").map((s) => s.trim()).filter(Boolean);
  if (segments.length === 0) return { error: "path is required, e.g. stock/duct60/8x16" };

  // Validate against the schema's default object so typos come back as a
  // clear error instead of an all-zeros answer the agent would present as fact.
  const template = resolvePath(emptyCutsheet(), segments);
  if (template === undefined) {
    return { error: `Unknown path "${path}". Fetch /api/ariya/catalog for valid paths.` };
  }

  const sheets = loadSheets(filters);
  const matched = filters.text ? textMatch(sheets, filters.text).map((m) => m.sheet) : sheets;

  const builderSet = new Set<string>();
  let archivedSheets = 0;
  for (const sheet of matched) {
    builderSet.add(norm(sheet.data.header.builder) || "(blank)");
    if (sheet.archived) archivedSheets++;
  }
  const matchedBuilders = [...builderSet].sort().slice(0, 20);

  if (typeof template === "number" || Array.isArray(template)) {
    let total = 0;
    for (const sheet of matched) total += sumNumericLeaves(resolvePath(sheet.data, segments));
    return { kind: "total", matchedSheets: matched.length, archivedSheets, matchedBuilders, total };
  }

  // Object: report per-key so "how much duct60 did X take" answers itself
  // without a follow-up round trip per size.
  const totals: Record<string, number> = {};
  for (const key of Object.keys(template as Record<string, unknown>)) totals[key] = 0;
  for (const sheet of matched) {
    const value = resolvePath(sheet.data, segments);
    if (value == null || typeof value !== "object") continue;
    for (const key of Object.keys(totals)) {
      totals[key] += sumNumericLeaves((value as Record<string, unknown>)[key]);
    }
  }
  const grandTotal = Object.values(totals).reduce((a, b) => a + b, 0);
  return { kind: "perKey", matchedSheets: matched.length, archivedSheets, matchedBuilders, totals, grandTotal };
}

// ---------- catalog ----------

// Walk the schema's default object and list every aggregatable path with its
// keys. Derived, not hand-maintained: when the form gains a section, the
// catalog gains it on the next request with zero Ariya-side changes.
export type Catalog = {
  quantityMaps: Record<string, string[]>;
  rowArrays: string[];
  textFields: string[];
};

// String arrays are searchable text, not qty rows — keep them out of the
// aggregatable list so the agent doesn't sum prose.
const TEXT_ARRAYS = new Set([
  "custom/miscellaneous", "formOnly/legacyNotes", "formOnly/cutSheetMisc",
  "formOnly/wallRegs", "formOnly/grills", "formOnly/filterGrills", "formOnly/floorRegs",
]);

export function buildCatalog(): Catalog {
  const empty = emptyCutsheet();
  const quantityMaps: Record<string, string[]> = {};
  const rowArrays: string[] = [];

  const walk = (value: unknown, path: string[]) => {
    if (Array.isArray(value)) {
      const joined = path.join("/");
      if (!TEXT_ARRAYS.has(joined)) rowArrays.push(joined);
      return;
    }
    if (value == null || typeof value !== "object") return;
    const entries = Object.entries(value as Record<string, unknown>);
    const numericKeys = entries.filter(([, v]) => typeof v === "number").map(([k]) => k);
    if (numericKeys.length > 0 && numericKeys.length === entries.length) {
      quantityMaps[path.join("/")] = numericKeys;
      return;
    }
    for (const [key, v] of entries) {
      if (typeof v === "number") {
        quantityMaps[[...path, key].join("/")] = [];
        continue;
      }
      if (typeof v === "string") continue;
      walk(v, [...path, key]);
    }
  };

  walk(empty.stock, ["stock"]);
  walk(empty.custom, ["custom"]);
  walk(empty.truck, ["truck"]);
  walk(empty.formOnly, ["formOnly"]);
  rowArrays.push("customLines", "fittings");

  return {
    quantityMaps,
    rowArrays,
    textFields: [
      "name", "header.*", "custom/miscellaneous", "formOnly/legacyNotes",
      "formOnly/cutSheetMisc", "formOnly/wallRegs", "formOnly/grills",
      "formOnly/filterGrills", "formOnly/floorRegs", "fittings[].notes",
    ],
  };
}

// ---------- house report ----------

// Everything behind one property number: the sheets, whether they truly form
// one house (same test as src/lib/house.ts: every sheet agrees on builder and
// a non-empty lot), and the combined quantities across all of them. Zero
// quantities are stripped so the report reads as "what was ordered".

function sumInto(target: Record<string, unknown>, value: unknown): void {
  if (value == null || typeof value !== "object" || Array.isArray(value)) return;
  for (const [k, v] of Object.entries(value)) {
    if (typeof v === "number") {
      target[k] = ((target[k] as number) ?? 0) + v;
    } else if (v && typeof v === "object" && !Array.isArray(v)) {
      if (target[k] == null) target[k] = {};
      sumInto(target[k] as Record<string, unknown>, v);
    }
  }
}

function stripZeros(value: unknown): unknown {
  if (typeof value === "number") return value !== 0 ? value : undefined;
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      const s = stripZeros(v);
      if (s !== undefined) out[k] = s;
    }
    return Object.keys(out).length > 0 ? out : undefined;
  }
  return undefined;
}

export function houseReport(propNumber: string): Record<string, unknown> | { error: string } {
  const prop = propNumber.trim();
  if (!prop) return { error: "propNumber is required" };
  if (prop === "999999999") {
    return { error: "999999999 is the legacy import placeholder — it spans unrelated sheets, not one house." };
  }

  const sheets = loadSheets({ propNumber: prop });
  if (sheets.length === 0) return { error: `No sheets found for prop ${prop}` };

  const builders = new Set(sheets.map((s) => norm(s.data.header.builder)));
  const lots = new Set(sheets.map((s) => norm(s.data.header.lot)));
  const isOneHouse = builders.size === 1 && lots.size === 1 && ([...lots][0] ?? "") !== "";

  const combined: Record<string, unknown> = {};
  const customLines: Array<{ ticket: string; label: string; qty: number; sheetId: number }> = [];
  const miscellaneous: Array<{ text: string; sheetId: number }> = [];
  const fittings: Array<{ type: string; qty: number; sl: boolean; notes: string; sheetId: number }> = [];

  for (const sheet of sheets) {
    sumInto(combined, {
      stock: sheet.data.stock,
      custom: { rndCollars: sheet.data.custom.rndCollars, roundVolumeDampers: sheet.data.custom.roundVolumeDampers },
      truck: sheet.data.truck,
      formOnly: sheet.data.formOnly,
    });
    for (const l of sheet.data.customLines) customLines.push({ ...l, sheetId: sheet.id });
    for (const t of sheet.data.custom.miscellaneous) miscellaneous.push({ text: t, sheetId: sheet.id });
    for (const f of sheet.data.fittings) {
      fittings.push({ type: f.type, qty: f.qty, sl: f.sl, notes: f.notes, sheetId: sheet.id });
    }
  }

  return {
    propNumber: prop,
    isOneHouse,
    builders: [...builders],
    lots: [...lots].filter(Boolean),
    sheetCount: sheets.length,
    archivedSheets: sheets.filter((s) => s.archived).length,
    sheets: sheets.map(summarize),
    combinedQuantities: stripZeros(combined) ?? {},
    customLines,
    miscellaneous,
    fittings,
  };
}

// ---------- stats ----------

export type StatsGroupBy = "builder" | "project" | "region" | "foreman" | "year";

// Grouped counts for "how many / who's biggest / per year" questions.
// `houses` counts distinct real prop numbers (blank and the 999999999
// placeholder excluded) — the closest thing the data has to "jobs".
export function stats(groupBy: StatsGroupBy, filters: AriyaFilters): Record<string, unknown> {
  const sheets = loadSheets(filters);
  const matched = filters.text ? textMatch(sheets, filters.text).map((m) => m.sheet) : sheets;

  const keyOf = (s: ParsedSheet): string => {
    if (groupBy === "year") return s.createdAt.slice(0, 4);
    const h = s.data.header;
    const raw = groupBy === "builder" ? h.builder : groupBy === "project" ? h.project : groupBy === "region" ? h.region : h.foreman;
    return norm(raw) || "(blank)";
  };

  const groups = new Map<string, { sheets: number; archived: number; props: Set<string> }>();
  const allProps = new Set<string>();
  for (const s of matched) {
    const key = keyOf(s);
    const g = groups.get(key) ?? { sheets: 0, archived: 0, props: new Set<string>() };
    g.sheets++;
    if (s.archived) g.archived++;
    const prop = s.data.header.propNumber.trim();
    if (prop && prop !== "999999999") {
      g.props.add(prop);
      allProps.add(prop);
    }
    groups.set(key, g);
  }

  const rows = [...groups.entries()]
    .map(([key, g]) => ({ key, sheets: g.sheets, houses: g.props.size, archivedSheets: g.archived }))
    .sort((a, b) => b.sheets - a.sheets);

  return {
    groupBy,
    totalSheets: matched.length,
    totalHouses: allProps.size,
    groupCount: rows.length,
    groups: rows.slice(0, 50),
    truncated: rows.length > 50,
  };
}
