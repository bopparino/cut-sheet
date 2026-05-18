"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import {
  CutsheetSchema,
  DUCT60_SIZES,
  emptyCutsheet,
  type Cutsheet,
  type CutsheetHeader,
} from "@/lib/schema";

// FormData arrives with everything as string|File. Pull just the header
// fields out — qty/array sections have their own extractors below.
function readHeaderFromFormData(formData: FormData): CutsheetHeader {
  const str = (k: string) => String(formData.get(k) ?? "");
  return {
    builder: str("builder"),
    project: str("project"),
    houseType: str("houseType"),
    lot: str("lot"),
    block: str("block"),
    section: str("section"),
    foreman: str("foreman"),
    region: str("region") as CutsheetHeader["region"],
    date: str("date"),
    deliveryDate: str("deliveryDate"),
    projectCode: str("projectCode"),
    option: str("option"),
    propNumber: str("propNumber"),
    zone: str("zone"),
    eqTo: str("eqTo") as CutsheetHeader["eqTo"],
    plenumPackage: (str("plenumPackage") || "none") as CutsheetHeader["plenumPackage"],
  };
}

// Generic reader for any qty-map section. Input names follow `${prefix}.${size}`.
// Empty / non-numeric values become 0 — that matches the schema default and
// keeps the FormData payload from tripping zod validation on a blank input.
function readNumberMap<T extends string>(
  formData: FormData,
  prefix: string,
  sizes: readonly T[],
): Record<T, number> {
  const result = {} as Record<T, number>;
  for (const size of sizes) {
    const raw = formData.get(`${prefix}.${size}`);
    result[size] = raw == null ? 0 : Math.max(0, Math.floor(Number(raw) || 0));
  }
  return result;
}

// Dynamic-row readers walk `${prefix}.0`, `${prefix}.1`, ... until no more
// rows exist in the FormData. Empty rows are pruned so a row the user added
// but never filled doesn't bloat the saved cutsheet.
function readStringRows(formData: FormData, prefix: string): string[] {
  const out: string[] = [];
  for (let i = 0; formData.has(`${prefix}.${i}`); i++) {
    const v = String(formData.get(`${prefix}.${i}`) ?? "").trim();
    if (v) out.push(v);
  }
  return out;
}

function readWHRows(
  formData: FormData,
  prefix: string,
): { qty: number; w: string; h: string }[] {
  const out: { qty: number; w: string; h: string }[] = [];
  for (let i = 0; formData.has(`${prefix}.${i}.qty`); i++) {
    const qty = Math.max(0, Math.floor(Number(formData.get(`${prefix}.${i}.qty`)) || 0));
    const w = String(formData.get(`${prefix}.${i}.w`) ?? "").trim();
    const h = String(formData.get(`${prefix}.${i}.h`) ?? "").trim();
    if (qty === 0 && !w && !h) continue;
    out.push({ qty, w, h });
  }
  return out;
}

function readCustomDuctRows(
  formData: FormData,
  prefix: string,
): { qty: number; w: string; h: string; l: string; sl: "Y" | "N" }[] {
  const out: { qty: number; w: string; h: string; l: string; sl: "Y" | "N" }[] = [];
  for (let i = 0; formData.has(`${prefix}.${i}.qty`); i++) {
    const qty = Math.max(0, Math.floor(Number(formData.get(`${prefix}.${i}.qty`)) || 0));
    const w = String(formData.get(`${prefix}.${i}.w`) ?? "").trim();
    const h = String(formData.get(`${prefix}.${i}.h`) ?? "").trim();
    const l = String(formData.get(`${prefix}.${i}.l`) ?? "").trim();
    const sl = (String(formData.get(`${prefix}.${i}.sl`) ?? "N") === "Y" ? "Y" : "N") as "Y" | "N";
    if (qty === 0 && !w && !h && !l) continue;
    out.push({ qty, w, h, l, sl });
  }
  return out;
}

export async function createCutsheet(formData: FormData) {
  const next: Cutsheet = { ...emptyCutsheet(), header: readHeaderFromFormData(formData) };
  const parsed = CutsheetSchema.parse(next);
  const result = db
    .prepare("INSERT INTO cutsheets (data) VALUES (?)")
    .run(JSON.stringify(parsed));
  revalidatePath("/search");
  redirect(`/form/${Number(result.lastInsertRowid)}`);
}

export async function updateCutsheet(id: number, formData: FormData) {
  const row = db
    .prepare<[number], { data: string }>("SELECT data FROM cutsheets WHERE id = ?")
    .get(id);
  if (!row) throw new Error(`Cutsheet ${id} not found`);

  const current = CutsheetSchema.parse(JSON.parse(row.data));
  const next: Cutsheet = {
    ...current,
    header: readHeaderFromFormData(formData),
    stock: {
      ...current.stock,
      duct60: readNumberMap(formData, "duct60", DUCT60_SIZES),
    },
    custom: {
      ...current.custom,
      endCaps: readWHRows(formData, "endCaps"),
      customDuct: readCustomDuctRows(formData, "customDuct"),
      miscellaneous: readStringRows(formData, "miscellaneous"),
    },
  };
  const parsed = CutsheetSchema.parse(next);
  db.prepare(
    "UPDATE cutsheets SET data = ?, updated_at = datetime('now') WHERE id = ?",
  ).run(JSON.stringify(parsed), id);
  revalidatePath(`/form/${id}`);
  revalidatePath("/search");
}

export async function deleteCutsheet(id: number) {
  db.prepare("DELETE FROM cutsheets WHERE id = ?").run(id);
  revalidatePath("/search");
  redirect("/search");
}
