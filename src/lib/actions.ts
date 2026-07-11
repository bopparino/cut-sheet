"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { imageToPdf } from "@/lib/pdf";
import { FITTING_MAP } from "@/lib/fittings";
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
  FittingRowSchema,
  TRIM_FANS,
  TRIM_FLOOR_REG,
  TRIM_GRILL,
  TRIM_REGISTERS,
  emptyCutsheet,
  type Cutsheet,
  type CutsheetHeader,
  type TrimExtraRow,
  type TrimRow,
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
    // No coercion to "none" - an unselected plenum stays "" (blank) so a new
    // cutsheet doesn't auto-pick None.
    plenumPackage: str("plenumPackage") as CutsheetHeader["plenumPackage"],
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

function readTrimMap<T extends string>(
  formData: FormData,
  prefix: string,
  items: readonly T[],
): Record<T, TrimRow> {
  const result = {} as Record<T, TrimRow>;
  for (const item of items) {
    result[item] = {
      zone1: readSingleNumber(formData, `${prefix}.${item}.zone1`),
      zone2: readSingleNumber(formData, `${prefix}.${item}.zone2`),
      zone3: readSingleNumber(formData, `${prefix}.${item}.zone3`),
      base: readSingleNumber(formData, `${prefix}.${item}.base`),
    };
  }
  return result;
}

// Extra trim rows: blank labels are dropped (they're just unused blank lines).
function readTrimExtras(formData: FormData, prefix: string): TrimExtraRow[] {
  const out: TrimExtraRow[] = [];
  for (let i = 0; formData.has(`${prefix}.${i}.label`); i++) {
    const label = String(formData.get(`${prefix}.${i}.label`) ?? "").trim();
    if (!label) continue;
    out.push({
      label,
      zone1: readSingleNumber(formData, `${prefix}.${i}.zone1`),
      zone2: readSingleNumber(formData, `${prefix}.${i}.zone2`),
      zone3: readSingleNumber(formData, `${prefix}.${i}.zone3`),
      base: readSingleNumber(formData, `${prefix}.${i}.base`),
    });
  }
  return out;
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
  const me = await getCurrentUser();
  const result = db
    .prepare("INSERT INTO cutsheets (data, created_by, updated_by) VALUES (?, ?, ?)")
    .run(JSON.stringify(parsed), me?.id ?? null, me?.id ?? null);
  revalidatePath("/search");
  redirect(`/form/${Number(result.lastInsertRowid)}`);
}

// Cookie-cutter houses: clone an existing cutsheet's data into a new row.
// Photos / documents stay on the original - the user is duplicating the
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

  const me = await getCurrentUser();
  const result = db
    .prepare("INSERT INTO cutsheets (data, created_by, updated_by) VALUES (?, ?, ?)")
    .run(JSON.stringify(parsed), me?.id ?? null, me?.id ?? null);
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
  const me = await getCurrentUser();
  db.prepare(
    "UPDATE cutsheets SET data = ?, folder_id = ?, updated_at = datetime('now'), updated_by = ? WHERE id = ?",
  ).run(JSON.stringify(parsed), folderId, me?.id ?? null, id);
  revalidatePath(`/form/${id}`);
  revalidatePath("/search");
  revalidatePath("/browse");
  if (folderId != null) revalidatePath(`/browse/${folderId}`);
}

// Replica save - the full two-page Cut Sheet replica (pages 1 + 2). Writes
// every field the new sheet surfaces. A few legacy schema fields aren't on the
// new design (tto, plenumContents, sdMiscExtras.angles, and Flex R4 outside
// 4/6/8) - those are preserved from `current` so the replica never silently
// zeroes data it doesn't show.
export async function updateCutSheetReplica(id: number, formData: FormData) {
  const row = db
    .prepare<[number], { data: string }>(
      "SELECT data FROM cutsheets WHERE id = ? AND deleted_at IS NULL",
    )
    .get(id);
  if (!row) throw new Error(`Cutsheet ${id} not found`);

  const current = CutsheetSchema.parse(JSON.parse(row.data));

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
      midAtlanticWallCaps: readNumberMap(formData, "midAtlanticWallCaps", MID_ATLANTIC_KEYS),
      birdCage: readNumberMap(formData, "birdCage", BIRD_CAGE_SIZES),
      metalScreen: readNumberMap(formData, "metalScreen", METAL_SCREEN_KEYS),
      dryerBox: readNumberMap(formData, "dryerBox", DRYER_BOX_KEYS),
      rndEll: readNumberMap(formData, "rndEll", RND_ELL_SIZES),
      blueFlashing: readNumberMap(formData, "blueFlashing", BLUE_FLASHING_KEYS),
      freshAirDampers: readNumberMap(formData, "freshAirDampers", FRESH_AIR_DAMPER_SIZES),
      galRedr: readNumberMap(formData, "galRedr", GAL_REDR_SIZES),
      fans: readNumberMap(formData, "fans", FANS_KEYS),
      straightBootBoxes: readNumberMap(formData, "straightBootBoxes", STRAIGHT_BOOT_BOXES_SIZES),
      simpsonStp: readNumberMap(formData, "simpsonStp", SIMPSON_STP_KEYS),
      // angles isn't on the new sheet - keep it; bubbleWrap/foilIns are.
      sdMiscExtras: {
        ...current.formOnly.sdMiscExtras,
        bubbleWrap: readSingleNumber(formData, "sdMiscExtras.bubbleWrap"),
        foilIns: readSingleNumber(formData, "sdMiscExtras.foilIns"),
      },
      uninsulatedFlex: readNumberMap(formData, "uninsulatedFlex", FLEX_SIZES),
      // Flex R4 is now fillable in every size on the sheet, so read all of them.
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
      // tto + plenumContents aren't on the new sheet - preserved via spread.
    },
    trimPull: {
      registers: readTrimMap(formData, "trim.registers", TRIM_REGISTERS),
      registersExtra: readTrimExtras(formData, "trim.registersExtra"),
      grill: readTrimMap(formData, "trim.grill", TRIM_GRILL),
      grillExtra: readTrimExtras(formData, "trim.grillExtra"),
      floorReg: readTrimMap(formData, "trim.floorReg", TRIM_FLOOR_REG),
      floorRegExtra: readTrimExtras(formData, "trim.floorRegExtra"),
      fans: readTrimMap(formData, "trim.fans", TRIM_FANS),
      fansExtra: readTrimExtras(formData, "trim.fansExtra"),
    },
  };
  const parsed = CutsheetSchema.parse(next);
  const me = await getCurrentUser();
  // Folder is managed on the card form, not here - leave folder_id untouched so
  // a replica save never unfiles the cutsheet (the replica has no folder input).
  db.prepare(
    "UPDATE cutsheets SET data = ?, updated_at = datetime('now'), updated_by = ? WHERE id = ?",
  ).run(JSON.stringify(parsed), me?.id ?? null, id);
  revalidatePath(`/form/${id}`);
  revalidatePath(`/form/${id}/replica`);
  revalidatePath("/search");
}

// Fittings save their own slice of the payload (the FittingsCard lives outside
// the big replica form, like Attachments/Plans), so a form save can never wipe
// them - both update actions preserve `fittings` via the `...current` spread.
export async function saveFittings(id: number, rows: unknown) {
  const fittings = z.array(FittingRowSchema).parse(rows);
  for (const f of fittings) {
    if (!FITTING_MAP.has(f.type)) throw new Error(`Unknown fitting type "${f.type}"`);
  }
  const row = db
    .prepare<[number], { data: string }>(
      "SELECT data FROM cutsheets WHERE id = ? AND deleted_at IS NULL",
    )
    .get(id);
  if (!row) throw new Error(`Cutsheet ${id} not found`);
  const current = CutsheetSchema.parse(JSON.parse(row.data));
  const next: Cutsheet = { ...current, fittings };
  const me = await getCurrentUser();
  db.prepare(
    "UPDATE cutsheets SET data = ?, updated_at = datetime('now'), updated_by = ? WHERE id = ?",
  ).run(JSON.stringify(next), me?.id ?? null, id);
  revalidatePath(`/form/${id}`);
  revalidatePath(`/form/${id}/replica`);
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

const MAX_ATTACHMENT_BYTES = 25 * 1024 * 1024;
const isImageMime = (m: string) => /^image\//.test(m);

function revalidateAttachments(cutsheetId: number) {
  revalidatePath(`/form/${cutsheetId}`);
  revalidatePath(`/form/${cutsheetId}/replica`);
  revalidatePath(`/form/${cutsheetId}/card`);
}

// One attachment upload for any file type. Images (used for the 15-20 fittings
// drawn per cutsheet) are stored with kind = 'image' so the fittings page can
// pick them up and tile them; everything else (PDF, Word, Excel, etc.) is
// stored as kind = 'document'. We don't enforce a MIME allowlist - browsers
// report Office docs inconsistently - and bound only by size.
export async function uploadAttachment(cutsheetId: number, formData: FormData) {
  const file = formData.get("file");
  if (!(file instanceof File)) throw new Error("No file provided");
  if (file.size > MAX_ATTACHMENT_BYTES) {
    throw new Error(
      `File too large - ${(file.size / 1024 / 1024).toFixed(1)} MB exceeds ${MAX_ATTACHMENT_BYTES / 1024 / 1024} MB limit`,
    );
  }

  const kind = isImageMime(file.type) ? "image" : "document";
  const buffer = Buffer.from(await file.arrayBuffer());
  db.prepare(
    `INSERT INTO attachments (cutsheet_id, kind, filename, mime, size, blob)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(
    cutsheetId,
    kind,
    file.name || "file",
    file.type || "application/octet-stream",
    file.size,
    buffer,
  );
  revalidateAttachments(cutsheetId);
}

const MAX_PLAN_BYTES = 50 * 1024 * 1024; // plans can be multi-page PDFs

// Image plans convert to a single-page PDF at upload time, so everything
// downstream - the packet merge, the 11x17 normalization, the attachment
// viewer - only ever sees plan PDFs. BMP is the format the shop actually
// produces; PNG/JPG ride along since the conversion path is identical.
const PLAN_IMAGE_MIMES: Record<string, string> = {
  ".bmp": "image/bmp",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
};

// House plans (1-8 pages each), stored as kind='plan'. They're normalized to
// 11x17 and appended to the print packet, and listed in their own Plans
// section separate from fitting/photo attachments.
export async function uploadPlan(cutsheetId: number, formData: FormData) {
  const file = formData.get("file");
  if (!(file instanceof File)) throw new Error("No file provided");
  const name = file.name.toLowerCase();
  const ext = name.slice(name.lastIndexOf("."));
  const isPdf = file.type === "application/pdf" || name.endsWith(".pdf");
  // Windows reports BMP as image/bmp or image/x-ms-bmp depending on the app
  // that produced it, so go by extension first and normalize the MIME.
  const imageMime =
    PLAN_IMAGE_MIMES[ext] ??
    (/^image\/(bmp|x-ms-bmp|png|jpeg)$/.test(file.type) ? file.type.replace("x-ms-bmp", "bmp") : null);
  if (!isPdf && !imageMime) throw new Error("Plans must be PDF, BMP, PNG, or JPG files");
  if (file.size > MAX_PLAN_BYTES) {
    throw new Error(
      `Plan too large - ${(file.size / 1024 / 1024).toFixed(1)} MB exceeds ${MAX_PLAN_BYTES / 1024 / 1024} MB limit`,
    );
  }

  let buffer: Buffer = Buffer.from(await file.arrayBuffer());
  let filename = file.name || "plan.pdf";
  if (!isPdf) {
    try {
      buffer = await imageToPdf(buffer, imageMime!);
    } catch {
      throw new Error(`${file.name} could not be read as an image - is the file corrupt?`);
    }
    filename = filename.replace(/\.[^.]+$/, "") + ".pdf";
  }
  db.prepare(
    `INSERT INTO attachments (cutsheet_id, kind, filename, mime, size, blob)
     VALUES (?, 'plan', ?, ?, ?, ?)`,
  ).run(cutsheetId, filename, "application/pdf", buffer.byteLength, buffer);
  revalidateAttachments(cutsheetId);
}

export async function deleteAttachment(cutsheetId: number, attachmentId: number) {
  db.prepare("DELETE FROM attachments WHERE id = ? AND cutsheet_id = ?").run(
    attachmentId,
    cutsheetId,
  );
  revalidateAttachments(cutsheetId);
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
// cutsheets - they revert to "unfiled" rather than being deleted.
export async function deleteFolder(id: number) {
  db.prepare("DELETE FROM folders WHERE id = ?").run(id);
  revalidatePath("/browse");
  redirect("/browse");
}
