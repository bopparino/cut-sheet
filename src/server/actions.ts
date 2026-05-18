"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { CutsheetSchema, emptyCutsheet, type Cutsheet } from "@/lib/schema";

export async function createCutsheet(data?: Cutsheet) {
  const parsed = CutsheetSchema.parse(data ?? emptyCutsheet());
  const result = db
    .prepare("INSERT INTO cutsheets (data) VALUES (?)")
    .run(JSON.stringify(parsed));
  const id = Number(result.lastInsertRowid);
  revalidatePath("/search");
  redirect(`/form/${id}`);
}

export async function updateCutsheet(id: number, data: Cutsheet) {
  const parsed = CutsheetSchema.parse(data);
  db.prepare(
    "UPDATE cutsheets SET data = ?, updated_at = datetime('now') WHERE id = ?",
  ).run(JSON.stringify(parsed), id);
  revalidatePath(`/form/${id}`);
  revalidatePath("/search");
}

export async function deleteCutsheet(id: number) {
  db.prepare("DELETE FROM cutsheets WHERE id = ?").run(id);
  revalidatePath("/search");
}
