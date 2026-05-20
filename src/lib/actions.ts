"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import {
  BIRD_CAGE_SIZES,
  BLUE_FLASHING_KEYS,
  B_VENT_KEYS,
  CutsheetSchema,
  DRAIN_PANS_KEYS,
  DRYER_BOX_KEYS,
  DUCT60_SIZES,
  ELL_BOOTS_SIZES,
  END_BOOTS_SIZES,
  FANS_KEYS,
  FILTER_RACKS_KEYS,
  FLEX_B_VENT_KEYS,
  FLEX_SIZES,
  FRESH_AIR_DAMPER_SIZES,
  GAL_REDR_SIZES,
  METAL_SCREEN_KEYS,
  MID_ATLANTIC_KEYS,
  OVAL_ELL_SIZES,
  OVAL_S_HEADS_SIZES,
  OVAL_TO_RND_SIZES,
  OV_PIPE_SIZES,
  RETURN_PLENUM_KEYS,
  RND_ELL_SIZES,
  RND_PIPE_SIZES,
  RND_SIZES,
  SADDLE_TAP_SIZES,
  SD_MISC_EXTRAS_KEYS,
  SD_MISC_KEYS,
  SIMPSON_STP_KEYS,
  STRAIGHT_BOOT_BOXES_SIZES,
  STRT_BOOTS_SIZES,
  TTO_SIZES,
  emptyCutsheet,
  type Cutsheet,
  type CutsheetHeader,
} from "@/lib/schema";

// ----- Generic FormData readers ----------------------------------------------

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

function readSingleNumber(formData: FormData, name: string): number {
  const raw = formData.get(name);
  return raw == null ? 0 : Math.max(0, Math.floor(Number(raw) || 0));
}

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
    const sl = (String(formData.get(`${prefix}.${i}.sl`) ?? "N") === "Y" ? "Y" : "N") as
      | "Y"
      | "N";
    if (qty === 0 && !w && !h && !l) continue;
    out.push({ qty, w, h, l, sl });
  }
  return out;
}

// ----- Actions ----------------------------------------------------------------

export async function createCutsheet(formData: FormData) {
  const next: Cutsheet = {
    ...emptyCutsheet(),
    name: String(formData.get("name") ?? "").trim(),
    header: readHeaderFromFormData(formData),
  };
  const parsed = CutsheetSchema.parse(next);
  const result = db
    .prepare("INSERT INTO cutsheets (data) VALUES (?)")
    .run(JSON.stringify(parsed));
  revalidatePath("/search");
  redirect(`/form/${Number(result.lastInsertRowid)}`);
}

// Cookie-cutter houses: clone an existing cutsheet's data into a new row.
// Photos / documents stay on the original — the user is duplicating the
// numeric data, not the attached evidence.
export async function cloneCutsheet(id: number) {
  const row = db
    .prepare<[number], { data: string }>(
      "SELECT data FROM cutsheets WHERE id = ? AND deleted_at IS NULL",
    )
    .get(id);
  if (!row) throw new Error(`Cutsheet ${id} not found`);

  const parsed = CutsheetSchema.parse(JSON.parse(row.data));
  if (parsed.name) parsed.name = `${parsed.name} (Copy)`;

  const result = db
    .prepare("INSERT INTO cutsheets (data) VALUES (?)")
    .run(JSON.stringify(parsed));
  revalidatePath("/search");
  redirect(`/form/${Number(result.lastInsertRowid)}`);
}

export async function updateCutsheet(id: number, formData: FormData) {
  const row = db
    .prepare<[number], { data: string }>(
      "SELECT data FROM cutsheets WHERE id = ? AND deleted_at IS NULL",
    )
    .get(id);
  if (!row) throw new Error(`Cutsheet ${id} not found`);

  const current = CutsheetSchema.parse(JSON.parse(row.data));
  const folderRaw = String(formData.get("folder_id") ?? "");
  const folderId =
    folderRaw === "" || folderRaw === "null" ? null : Number(folderRaw);
  const next: Cutsheet = {
    ...current,
    name: String(formData.get("name") ?? "").trim(),
    header: readHeaderFromFormData(formData),
    stock: {
      duct60: readNumberMap(formData, "duct60", DUCT60_SIZES),
      sdMisc: readNumberMap(formData, "sdMisc", SD_MISC_KEYS),
    },
    custom: {
      endCaps: readWHRows(formData, "endCaps"),
      volumeDampers: readWHRows(formData, "volumeDampers"),
      canvasConn: readWHRows(formData, "canvasConn"),
      customDuct: readCustomDuctRows(formData, "customDuct"),
      miscellaneous: readStringRows(formData, "miscellaneous"),
      rndCollars: readNumberMap(formData, "rndCollars", RND_SIZES),
      roundVolumeDampers: readNumberMap(formData, "roundVolumeDampers", RND_SIZES),
    },
    truck: {
      ovPipe: readNumberMap(formData, "ovPipe", OV_PIPE_SIZES),
      rndPipe: readNumberMap(formData, "rndPipe", RND_PIPE_SIZES),
    },
    formOnly: {
      ...current.formOnly,
      filterRacks: readNumberMap(formData, "filterRacks", FILTER_RACKS_KEYS),
      drainPans: readNumberMap(formData, "drainPans", DRAIN_PANS_KEYS),
      returnPlenum: readNumberMap(formData, "returnPlenum", RETURN_PLENUM_KEYS),
      ovalEll: readNumberMap(formData, "ovalEll", OVAL_ELL_SIZES),
      ovalToRnd: readNumberMap(formData, "ovalToRnd", OVAL_TO_RND_SIZES),
      ovalSHeads: readNumberMap(formData, "ovalSHeads", OVAL_S_HEADS_SIZES),
      ellBoots: readNumberMap(formData, "ellBoots", ELL_BOOTS_SIZES),
      endBoots: readNumberMap(formData, "endBoots", END_BOOTS_SIZES),
      strtBoots: readNumberMap(formData, "strtBoots", STRT_BOOTS_SIZES),
      tto: readNumberMap(formData, "tto", TTO_SIZES),
      midAtlanticWallCaps: readNumberMap(formData, "midAtlanticWallCaps", MID_ATLANTIC_KEYS),
      birdCage: readNumberMap(formData, "birdCage", BIRD_CAGE_SIZES),
      metalScreen: readNumberMap(formData, "metalScreen", METAL_SCREEN_KEYS),
      dryerBox: readNumberMap(formData, "dryerBox", DRYER_BOX_KEYS),
      rndEll: readNumberMap(formData, "rndEll", RND_ELL_SIZES),
      blueFlashing: readNumberMap(formData, "blueFlashing", BLUE_FLASHING_KEYS),
      freshAirDampers: readNumberMap(formData, "freshAirDampers", FRESH_AIR_DAMPER_SIZES),
      galRedr: readNumberMap(formData, "galRedr", GAL_REDR_SIZES),
      fans: readNumberMap(formData, "fans", FANS_KEYS),
      straightBootBoxes: readNumberMap(
        formData,
        "straightBootBoxes",
        STRAIGHT_BOOT_BOXES_SIZES,
      ),
      simpsonStp: readNumberMap(formData, "simpsonStp", SIMPSON_STP_KEYS),
      sdMiscExtras: readNumberMap(formData, "sdMiscExtras", SD_MISC_EXTRAS_KEYS),
      uninsulatedFlex: readNumberMap(formData, "uninsulatedFlex", FLEX_SIZES),
      insulatedFlexR4: readNumberMap(formData, "insulatedFlexR4", FLEX_SIZES),
      insulatedFlexR8: readNumberMap(formData, "insulatedFlexR8", FLEX_SIZES),
      saddleTap: readNumberMap(formData, "saddleTap", SADDLE_TAP_SIZES),
      airTights: readNumberMap(formData, "airTights", FLEX_SIZES),
      bVent: readNumberMap(formData, "bVent", B_VENT_KEYS),
      flexBVent: readNumberMap(formData, "flexBVent", FLEX_B_VENT_KEYS),
      panningMetal36x36: readSingleNumber(formData, "panningMetal36x36"),
      condRegs8x6: readSingleNumber(formData, "condRegs8x6"),
      wallRegs: readStringRows(formData, "wallRegs"),
      grills: readStringRows(formData, "grills"),
      filterGrills: readStringRows(formData, "filterGrills"),
      floorRegs: readStringRows(formData, "floorRegs"),
    },
  };
  const parsed = CutsheetSchema.parse(next);
  db.prepare(
    "UPDATE cutsheets SET data = ?, folder_id = ?, updated_at = datetime('now') WHERE id = ?",
  ).run(JSON.stringify(parsed), folderId, id);
  revalidatePath(`/form/${id}`);
  revalidatePath("/search");
  revalidatePath("/browse");
  if (folderId != null) revalidatePath(`/browse/${folderId}`);
}

// Soft-delete: cutsheet stays in the DB with deleted_at set, so /admin/trash
// can resurrect it. Looks irreversible to the user; isn't.
export async function deleteCutsheet(id: number) {
  db.prepare(
    "UPDATE cutsheets SET deleted_at = datetime('now') WHERE id = ? AND deleted_at IS NULL",
  ).run(id);
  revalidatePath("/search");
  revalidatePath("/admin/trash");
  redirect("/search");
}

export async function restoreCutsheet(id: number) {
  db.prepare(
    "UPDATE cutsheets SET deleted_at = NULL WHERE id = ? AND deleted_at IS NOT NULL",
  ).run(id);
  revalidatePath("/search");
  revalidatePath("/admin/trash");
}

// Hard delete from the trash. Attachments cascade via the FK constraint.
export async function permanentlyDeleteCutsheet(id: number) {
  db.prepare("DELETE FROM cutsheets WHERE id = ?").run(id);
  revalidatePath("/admin/trash");
  revalidatePath("/search");
}

// ----- Attachments ------------------------------------------------------------

const MAX_ATTACHMENT_BYTES = 8 * 1024 * 1024;
const MAX_DOCUMENT_BYTES = 25 * 1024 * 1024;
const ALLOWED_IMAGE_MIMES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
]);

export async function uploadAttachment(cutsheetId: number, formData: FormData) {
  const file = formData.get("file");
  if (!(file instanceof File)) throw new Error("No file provided");
  if (!ALLOWED_IMAGE_MIMES.has(file.type)) {
    throw new Error(`Unsupported file type: ${file.type || "unknown"}`);
  }
  if (file.size > MAX_ATTACHMENT_BYTES) {
    throw new Error(
      `File too large — ${(file.size / 1024 / 1024).toFixed(1)} MB exceeds ${MAX_ATTACHMENT_BYTES / 1024 / 1024} MB limit`,
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  db.prepare(
    `INSERT INTO attachments (cutsheet_id, kind, filename, mime, size, blob)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(cutsheetId, "image", file.name, file.type, file.size, buffer);
  revalidatePath(`/form/${cutsheetId}`);
}

// Documents are anything that isn't an image — PDF / Word / Excel / etc.
// We don't enforce a strict MIME allowlist because browsers report Office
// docs inconsistently; instead we reject only image MIMEs (those belong in
// PhotosCard) and bound by size.
export async function uploadDocument(cutsheetId: number, formData: FormData) {
  const file = formData.get("file");
  if (!(file instanceof File)) throw new Error("No document provided");
  if (ALLOWED_IMAGE_MIMES.has(file.type)) {
    throw new Error("Use the Photos section for image uploads");
  }
  if (file.size > MAX_DOCUMENT_BYTES) {
    throw new Error(
      `Document too large — ${(file.size / 1024 / 1024).toFixed(1)} MB exceeds ${MAX_DOCUMENT_BYTES / 1024 / 1024} MB limit`,
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  db.prepare(
    `INSERT INTO attachments (cutsheet_id, kind, filename, mime, size, blob)
     VALUES (?, 'document', ?, ?, ?, ?)`,
  ).run(
    cutsheetId,
    file.name || "document",
    file.type || "application/octet-stream",
    file.size,
    buffer,
  );
  revalidatePath(`/form/${cutsheetId}`);
}

export async function deleteAttachment(cutsheetId: number, attachmentId: number) {
  db.prepare("DELETE FROM attachments WHERE id = ? AND cutsheet_id = ?").run(
    attachmentId,
    cutsheetId,
  );
  revalidatePath(`/form/${cutsheetId}`);
}

// ----- Folders ----------------------------------------------------------------

export async function createFolder(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("Folder name is required");
  const parentRaw = String(formData.get("parent_id") ?? "");
  const parentId =
    parentRaw === "" || parentRaw === "null" ? null : Number(parentRaw);
  if (parentId != null && !Number.isInteger(parentId)) {
    throw new Error("Invalid parent folder");
  }
  db.prepare("INSERT INTO folders (name, parent_id) VALUES (?, ?)").run(
    name,
    parentId,
  );
  revalidatePath("/browse");
  if (parentId != null) revalidatePath(`/browse/${parentId}`);
}

// Move a folder to a new parent. Cycle prevention: target must not be the
// folder itself or any descendant of it, otherwise we'd create a loop the
// ON DELETE CASCADE couldn't safely walk.
export async function moveFolder(id: number, formData: FormData) {
  const targetRaw = String(formData.get("parent_id") ?? "");
  const targetId =
    targetRaw === "" || targetRaw === "null" ? null : Number(targetRaw);
  if (targetId != null && !Number.isInteger(targetId)) {
    throw new Error("Invalid target folder");
  }

  if (targetId != null) {
    const all = db
      .prepare<[], { id: number; name: string; parent_id: number | null }>(
        "SELECT id, name, parent_id FROM folders",
      )
      .all();
    const { isDescendantOrSelf } = await import("@/lib/folders");
    if (isDescendantOrSelf(all, targetId, id)) {
      throw new Error("Can't move a folder into itself or its own subtree");
    }
  }

  db.prepare("UPDATE folders SET parent_id = ? WHERE id = ?").run(targetId, id);
  revalidatePath("/browse");
  revalidatePath(`/browse/${id}`);
  if (targetId != null) revalidatePath(`/browse/${targetId}`);
}

export async function renameFolder(id: number, formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("Folder name is required");
  db.prepare("UPDATE folders SET name = ? WHERE id = ?").run(name, id);
  revalidatePath("/browse");
  revalidatePath(`/browse/${id}`);
}

// Bulk move: shift any number of folders and/or cutsheets to a target
// folder (parent_id for folders, folder_id for cutsheets). FormData uses
// repeated `folder_id` / `cutsheet_id` keys plus a single `parent_id` for
// the destination.
export async function bulkMove(formData: FormData) {
  const targetRaw = String(formData.get("parent_id") ?? "");
  const targetId =
    targetRaw === "" || targetRaw === "null" ? null : Number(targetRaw);
  if (targetId != null && !Number.isInteger(targetId)) {
    throw new Error("Invalid target folder");
  }

  const folderIds = formData
    .getAll("folder_id")
    .map((v) => Number(v))
    .filter((n) => Number.isInteger(n));
  const cutsheetIds = formData
    .getAll("cutsheet_id")
    .map((v) => Number(v))
    .filter((n) => Number.isInteger(n));

  if (folderIds.length === 0 && cutsheetIds.length === 0) return;

  // Cycle guard: every selected folder must not be moved into itself or one
  // of its own descendants. Check before any write so we either move all or
  // none.
  if (targetId != null && folderIds.length > 0) {
    const allFolders = db
      .prepare<[], { id: number; name: string; parent_id: number | null }>(
        "SELECT id, name, parent_id FROM folders",
      )
      .all();
    const { isDescendantOrSelf } = await import("@/lib/folders");
    for (const sourceId of folderIds) {
      if (isDescendantOrSelf(allFolders, targetId, sourceId)) {
        throw new Error("Can't move a folder into itself or its own subtree");
      }
    }
  }

  const tx = db.transaction(() => {
    if (folderIds.length > 0) {
      const placeholders = folderIds.map(() => "?").join(",");
      db.prepare(
        `UPDATE folders SET parent_id = ? WHERE id IN (${placeholders})`,
      ).run(targetId, ...folderIds);
    }
    if (cutsheetIds.length > 0) {
      const placeholders = cutsheetIds.map(() => "?").join(",");
      db.prepare(
        `UPDATE cutsheets
         SET folder_id = ?, updated_at = datetime('now')
         WHERE id IN (${placeholders}) AND deleted_at IS NULL`,
      ).run(targetId, ...cutsheetIds);
    }
  });
  tx();

  revalidatePath("/browse");
  if (targetId != null) revalidatePath(`/browse/${targetId}`);
}

// Bulk delete: soft-delete every selected cutsheet (they land in /admin/trash)
// and hard-delete every selected folder (subfolders cascade, cutsheets at any
// depth revert to unfiled via the existing FKs). One transaction so the user
// either sees the whole batch removed or nothing.
export async function bulkDelete(formData: FormData) {
  const folderIds = formData
    .getAll("folder_id")
    .map((v) => Number(v))
    .filter((n) => Number.isInteger(n));
  const cutsheetIds = formData
    .getAll("cutsheet_id")
    .map((v) => Number(v))
    .filter((n) => Number.isInteger(n));

  if (folderIds.length === 0 && cutsheetIds.length === 0) return;

  const tx = db.transaction(() => {
    if (cutsheetIds.length > 0) {
      const placeholders = cutsheetIds.map(() => "?").join(",");
      db.prepare(
        `UPDATE cutsheets SET deleted_at = datetime('now')
         WHERE id IN (${placeholders}) AND deleted_at IS NULL`,
      ).run(...cutsheetIds);
    }
    if (folderIds.length > 0) {
      const placeholders = folderIds.map(() => "?").join(",");
      db.prepare(`DELETE FROM folders WHERE id IN (${placeholders})`).run(
        ...folderIds,
      );
    }
  });
  tx();

  revalidatePath("/browse");
  revalidatePath("/admin/trash");
}

// FK ON DELETE SET NULL on cutsheets.folder_id detaches the contained
// cutsheets — they revert to "unfiled" rather than being deleted.
export async function deleteFolder(id: number) {
  db.prepare("DELETE FROM folders WHERE id = ?").run(id);
  revalidatePath("/browse");
  redirect("/browse");
}
