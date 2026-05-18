"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import {
  CutsheetSchema,
  emptyCutsheet,
  type Cutsheet,
  type CutsheetHeader,
} from "@/lib/schema";

// FormData arrives with everything as string|File. Pull just the header
// fields out — qty/array sections will get their own extractors later.
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
  const next: Cutsheet = { ...current, header: readHeaderFromFormData(formData) };
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
