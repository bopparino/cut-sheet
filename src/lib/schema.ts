import { z } from "zod";

const qty = z.number().int().min(0).default(0);
const text = z.string().default("");

// ---------- Stock PDF items ----------
export const DUCT60_SIZES = [
  "8x6", "8x8", "8x10", "8x12", "8x14", "8x16", "8x18", "8x20", "8x22", "8x24",
  "10x10", "10x12", "10x14", "10x16", "10x18", "10x20", "10x22", "10x24",
  "12x12", "12x14", "12x16", "12x18", "12x20", "12x22", "12x24",
  "14x14", "14x16", "14x18", "14x20",
  "3.25x10", "3.25x12", "3.25x14",
] as const;
export type Duct60Size = (typeof DUCT60_SIZES)[number];

const Duct60Schema = z.object(
  Object.fromEntries(DUCT60_SIZES.map((s) => [s, qty])) as Record<Duct60Size, typeof qty>,
);

const SdMiscSchema = z.object({
  drive24: qty,
  slips26: qty,
  mastic: qty,
  brushes: qty,
});

const StockSchema = z.object({
  duct60: Duct60Schema,
  sdMisc: SdMiscSchema,
});

// ---------- Custom PDF items ----------
const WHRow = z.object({ qty, w: text, h: text });
const CustomDuctRow = z.object({
  qty,
  w: text,
  h: text,
  l: text,
  sl: z.enum(["Y", "N"]).default("N"),
});

export const RND_SIZES = ["4", "5", "6", "7", "8", "10", "12", "14", "16"] as const;
export type RndSize = (typeof RND_SIZES)[number];

const RndQtyMap = z.object(
  Object.fromEntries(RND_SIZES.map((s) => [s, qty])) as Record<RndSize, typeof qty>,
);

const CustomSchema = z.object({
  endCaps: z.array(WHRow).default([]),
  volumeDampers: z.array(WHRow).default([]),
  canvasConn: z.array(WHRow).default([]),
  customDuct: z.array(CustomDuctRow).default([]),
  miscellaneous: z.array(z.string()).default([]),
  rndCollars: RndQtyMap,
  roundVolumeDampers: RndQtyMap,
});

// ---------- Truck Driver PDF items ----------
export const OV_PIPE_SIZES = ["5", "6", "7", "8"] as const;
export type OvPipeSize = (typeof OV_PIPE_SIZES)[number];

export const RND_PIPE_SIZES = [
  "4x10", "5x10", "6x10", "7x10",
  "8x5", "10x5", "12x5", "14x5", "16x5",
] as const;
export type RndPipeSize = (typeof RND_PIPE_SIZES)[number];

const TruckSchema = z.object({
  ovPipe: z.object(
    Object.fromEntries(OV_PIPE_SIZES.map((s) => [s, qty])) as Record<OvPipeSize, typeof qty>,
  ),
  rndPipe: z.object(
    Object.fromEntries(RND_PIPE_SIZES.map((s) => [s, qty])) as Record<RndPipeSize, typeof qty>,
  ),
});

// ---------- Header ----------
const HeaderSchema = z.object({
  builder: text,
  project: text,
  houseType: text,
  lot: text,
  block: text,
  section: text,
  foreman: text,
  region: z.enum(["MD", "VA", "WV", ""]).default(""),
  date: text,
  deliveryDate: text,
  projectCode: text,
  option: text,
  propNumber: text,
  zone: text,
  eqTo: z.enum(["Job", "Whs", "Hold", ""]).default(""),
  // "" is the unset state (nothing chosen yet) so a blank cutsheet shows no
  // plenum selection. "none" is a deliberate "no plenum package" choice.
  plenumPackage: z.enum(["small", "large", "none", ""]).default(""),
});

// ---------- Form-only items (persisted but not on any PDF) ----------
const FilterRacksSchema = z.object({ "16x25": qty, "20x25": qty, lBox: qty });
const DrainPansSchema = z.object({ "31x31": qty, "31x36": qty, "31x60": qty });
const ReturnPlenumSchema = z.object({
  "14x24SL": qty,
  "18x24SL": qty,
  furnaceFeet: qty,
});
const PlenumContentsSchema = z.object({
  small: z.object({ "18x22x18": qty, "18x22x24": qty, "18x22CC": qty }),
  large: z.object({ "24x22x18": qty, "24x22x24": qty, "24x22CC": qty }),
});

// Oval Ells: only the F (female) variants are actually used per the shop.
// The bare 5/6/7/8 sizes were a v1 paper-form holdover that crews never
// filled in.
export const OVAL_ELL_SIZES = ["5F", "6F", "7F"] as const;
const OvalEllsSchema = z.object(
  Object.fromEntries(OVAL_ELL_SIZES.map((s) => [s, qty])) as Record<
    (typeof OVAL_ELL_SIZES)[number],
    typeof qty
  >,
);

export const OVAL_TO_RND_SIZES = ["5x5", "6x6", "7x7", "8x8"] as const;
export const OVAL_S_HEADS_SIZES = ["8x6x4", "8x6x5", "10x6x6", "12x6x7", "14x6x8"] as const;
export const ELL_BOOTS_SIZES = [
  "10x3.25x6", "12x3.25x7", "14x3.25x8", "10x4x4", "10x4x5", "10x4x6",
  "10x6x6", "12x4x7", "12x6x7", "14x4x8",
] as const;
export const END_BOOTS_SIZES = ELL_BOOTS_SIZES;
export const STRT_BOOTS_SIZES = ELL_BOOTS_SIZES;

export const RND_ELL_SIZES = ["4", "5", "6", "7", "8", "10", "12", "14", "16"] as const;
export const FLEX_SIZES = ["4", "5", "6", "7", "8", "10", "12", "14", "16"] as const;
export const SADDLE_TAP_SIZES = ["4", "5", "6", "7", "8", "10", "12"] as const;
export const STRAIGHT_BOOT_BOXES_SIZES = ["8x6x4", "8x6x5", "10x6x6", "12x6x7", "12x8x8"] as const;
export const TTO_SIZES = ["4", "5", "6", "7"] as const;
export const BIRD_CAGE_SIZES = ["4", "6"] as const;
export const FRESH_AIR_DAMPER_SIZES = ["8126", "8145", "P-180", "HY8150", "B150E75NT", "VTYIK1"] as const;
export const GAL_REDR_SIZES = ["4x3", "5x4", "6x5", "7x6", "8x7", "6x4", "8x6", "10x8", "12x10", "14x12"] as const;
export const ROUND_END_CAPS_SIZES = ["8", "10", "12", "14", "16"] as const;

// Named-key maps (object keys, not size strings). Exported so the page and
// the FormData reader can both iterate them in a consistent order.
export const FILTER_RACKS_KEYS = ["16x25", "20x25", "lBox"] as const;
export const DRAIN_PANS_KEYS = ["31x31", "31x36", "31x60"] as const;
export const RETURN_PLENUM_KEYS = ["14x24SL", "18x24SL", "furnaceFeet"] as const;
export const SD_MISC_KEYS = ["drive24", "slips26", "mastic", "brushes"] as const;
// "angles" was dropped July 2026: it doesn't exist on the new cut sheet and
// the shop confirmed it's dead. Values on old rows are stripped on next parse.
export const SD_MISC_EXTRAS_KEYS = ["bubbleWrap", "foilIns"] as const;
export const SIMPSON_STP_KEYS = ["stp18", "stp24"] as const;
export const MID_ATLANTIC_KEYS = [
  "buildersEdgeMetal4", "buildersEdgeMetal6", "buildersEdgeScreen4", "buildersEdgeScreen6",
] as const;
export const METAL_SCREEN_KEYS = [
  "metal6", "metal8", "metal10", "metal10x3_25", "screen6", "screen8", "screen10", "screen10x3_25",
] as const;
export const DRYER_BOX_KEYS = ["metal6", "plastic6"] as const;
export const BLUE_FLASHING_KEYS = ["p400", "p600", "p800", "p1000"] as const;
export const FANS_KEYS = [
  "AE80_4", "744", "SLM70", "SIG80_110", "PTE511", "PTEL511",
  "gNeckSilv4", "gNeckBlk4", "gNeck116_6", "roofCap634_6",
  "roofJ6", "roofJ8", "roofJ10",
] as const;
export const B_VENT_KEYS = ["pc5", "pc3", "pc2", "pc1", "deg60", "deg90", "tee", "ccf"] as const;
export const FLEX_B_VENT_KEYS = ["4x36", "4x60"] as const;

const mapOf = <T extends readonly string[]>(sizes: T) =>
  z.object(Object.fromEntries(sizes.map((s) => [s, qty])) as Record<T[number], typeof qty>);

const FormOnlySchema = z.object({
  filterRacks: FilterRacksSchema,
  drainPans: DrainPansSchema,
  returnPlenum: ReturnPlenumSchema,
  plenumContents: PlenumContentsSchema,
  ovalEll: OvalEllsSchema,
  ovalToRnd: mapOf(OVAL_TO_RND_SIZES),
  ovalSHeads: mapOf(OVAL_S_HEADS_SIZES),
  ellBoots: mapOf(ELL_BOOTS_SIZES),
  endBoots: mapOf(END_BOOTS_SIZES),
  strtBoots: mapOf(STRT_BOOTS_SIZES),
  tto: z.object({ "4": qty, "5": qty, "6": qty, "7": qty }),
  midAtlanticWallCaps: z.object({
    buildersEdgeMetal4: qty,
    buildersEdgeMetal6: qty,
    buildersEdgeScreen4: qty,
    buildersEdgeScreen6: qty,
  }),
  birdCage: z.object({ "4": qty, "6": qty }),
  metalScreen: z.object({
    metal6: qty,
    metal8: qty,
    metal10: qty,
    metal10x3_25: qty,
    screen6: qty,
    screen8: qty,
    screen10: qty,
    screen10x3_25: qty,
  }),
  dryerBox: z.object({ metal6: qty, plastic6: qty }),
  rndEll: mapOf(RND_ELL_SIZES),
  blueFlashing: z.object({ p400: qty, p600: qty, p800: qty, p1000: qty }),
  freshAirDampers: z.object({
    "8126": qty, "8145": qty, "P-180": qty, "HY8150": qty, "B150E75NT": qty, "VTYIK1": qty,
  }),
  galRedr: z.object({
    "4x3": qty, "5x4": qty, "6x5": qty, "7x6": qty, "8x7": qty,
    "6x4": qty, "8x6": qty, "10x8": qty, "12x10": qty, "14x12": qty,
  }),
  fans: z.object({
    AE80_4: qty, "744": qty, SLM70: qty, SIG80_110: qty, PTE511: qty, PTEL511: qty,
    gNeckSilv4: qty, gNeckBlk4: qty, gNeck116_6: qty, roofCap634_6: qty,
    roofJ6: qty, roofJ8: qty, roofJ10: qty,
  }),
  straightBootBoxes: mapOf(STRAIGHT_BOOT_BOXES_SIZES),
  simpsonStp: z.object({ stp18: qty, stp24: qty }),
  sdMiscExtras: z.object({
    bubbleWrap: qty,
    foilIns: qty,
  }),
  // Unmapped values carried from the Access import - stored, never printed.
  legacyNotes: z.array(z.string()).default([]),
  uninsulatedFlex: mapOf(FLEX_SIZES),
  insulatedFlexR4: mapOf(FLEX_SIZES),
  insulatedFlexR8: mapOf(FLEX_SIZES),
  saddleTap: mapOf(SADDLE_TAP_SIZES),
  airTights: mapOf(FLEX_SIZES),
  bVent: z.object({
    pc5: qty, pc3: qty, pc2: qty, pc1: qty,
    deg60: qty, deg90: qty, tee: qty, ccf: qty,
  }),
  flexBVent: z.object({ "4x36": qty, "4x60": qty }),
  panningMetal36x36: qty,
  condRegs8x6: qty,
  // Round End Caps + the Cut Sheet page's own Miscellaneous box (shop request,
  // July 2026 — they sit under Con Regs on page 2). Both self-default so every
  // sheet saved before the section existed still parses (same pattern as
  // trimMapOf: {} parses fine, TS just can't prove it for the mapped shape).
  roundEndCaps: mapOf(ROUND_END_CAPS_SIZES).default({} as never),
  cutSheetMisc: z.array(z.string()).default([]),
  wallRegs: z.array(z.string()).default([]),
  grills: z.array(z.string()).default([]),
  filterGrills: z.array(z.string()).default([]),
  floorRegs: z.array(z.string()).default([]),
});

// ---------- Trim Pull Sheet ----------
// Kimmie's trim pull sheet: per-item quantities split across three zones plus
// basement, with a computed TOTAL on the printed page. Item keys mirror the
// paper sheet's labels. Each section also carries free "extra" rows for
// anything not pre-printed on the sheet.
export const TRIM_REGISTERS = [
  "8x6 WALL", "10x6 WALL", "12x6 WALL", "12x8 WALL", "12x4 WALL", "10x4 WALL",
] as const;
export const TRIM_GRILL = [
  "12x6 RAG", "8x12 RAG", "12x12 RAG", "14x14 RAG", "16x16 RAG", "18x18 RAG",
  "20x20 RAG", "24x24 RAG", "12x12 FG", "14x14 FG", "16x16 FG", "18x18 FG",
  "20x20 FG", "12x24 FG", "12x2 TOEKICK",
] as const;
export const TRIM_FLOOR_REG = ["10x4", "12x4", "14x4"] as const;
export const TRIM_FANS = ["AE80", "744", "PTE511RK", "PTEL511RK", "PANASONIC"] as const;

const TrimRowSchema = z
  .object({ zone1: qty, zone2: qty, zone3: qty, base: qty })
  .default({});
const trimMapOf = <T extends string>(items: readonly T[]) =>
  z
    .object(Object.fromEntries(items.map((i) => [i, TrimRowSchema])) as Record<T, typeof TrimRowSchema>)
    // {} parses fine (every row self-defaults); TS just can't prove it for the
    // generic mapped shape, hence the cast.
    .default({} as never);
const TrimExtraRowSchema = z.object({
  label: z.string().min(1),
  zone1: qty,
  zone2: qty,
  zone3: qty,
  base: qty,
});

export const TrimPullSchema = z
  .object({
    registers: trimMapOf(TRIM_REGISTERS),
    registersExtra: z.array(TrimExtraRowSchema).default([]),
    grill: trimMapOf(TRIM_GRILL),
    grillExtra: z.array(TrimExtraRowSchema).default([]),
    floorReg: trimMapOf(TRIM_FLOOR_REG),
    floorRegExtra: z.array(TrimExtraRowSchema).default([]),
    fans: trimMapOf(TRIM_FANS),
    fansExtra: z.array(TrimExtraRowSchema).default([]),
  })
  .default({});
export type TrimPull = z.infer<typeof TrimPullSchema>;
export type TrimRow = z.infer<typeof TrimRowSchema>;
export type TrimExtraRow = z.infer<typeof TrimExtraRowSchema>;

// ---------- Custom add-lines (per PDF) ----------
const CustomLineSchema = z.object({
  ticket: z.enum(["stock", "custom", "truck"]),
  label: z.string().min(1),
  qty: z.number().int().min(0).default(1),
});

// ---------- Fittings (picked from the catalog in src/lib/fittings.ts) ----------
// Replaces the MS Paint copy/paste ritual: `type` is a catalog id, `labels`
// are the measurements, each click-placed at a position ON the drawing (x/y
// are fractions of the drawing box) - the position is the information: it says
// WHICH side the number belongs to, like Kimmie's Paint text tool did. Rows
// print on the fittings sheet; qty 0 rows still print.
export const FittingLabelSchema = z.object({
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
  text: z.string(),
});
export type FittingLabel = z.infer<typeof FittingLabelSchema>;

export const FittingRowSchema = z.object({
  type: z.string().min(1),
  qty: z.number().int().min(0).default(1),
  // Sound-lined: prints as "SL YES/NO" beside the fitting name so the shop
  // knows at a glance without reading notes. Defaulted so pre-SL rows parse.
  sl: z.boolean().default(false),
  labels: z.array(FittingLabelSchema).default([]),
  notes: text,
});
export type FittingRow = z.infer<typeof FittingRowSchema>;

// ---------- Attachments (drawings + image uploads) ----------
// The DB table is the source of truth for blobs (server/src/routes/attachments.ts);
// this array on the cutsheet is a metadata cache so the UI can render thumbnails
// without a second fetch. FormPage reconciles against the server list on load.
export const AttachmentSchema = z.object({
  id: z.number().int(),
  cutsheetId: z.number().int(),
  kind: z.enum(["drawing", "image"]),
  filename: z.string(),
  mime: z.string(),
  size: z.number().int(),
  createdAt: z.string(),
  url: z.string(),
});
export type Attachment = z.infer<typeof AttachmentSchema>;

// ---------- Top-level ----------
export const CutsheetSchema = z.object({
  // User-supplied display name. Empty → fall back to "Cutsheet #id" in the UI.
  name: text,
  header: HeaderSchema,
  stock: StockSchema,
  custom: CustomSchema,
  truck: TruckSchema,
  formOnly: FormOnlySchema,
  customLines: z.array(CustomLineSchema).default([]),
  fittings: z.array(FittingRowSchema).default([]),
  trimPull: TrimPullSchema,
  attachments: z.array(AttachmentSchema).default([]),
});

export type Cutsheet = z.infer<typeof CutsheetSchema>;
export type CutsheetHeader = z.infer<typeof HeaderSchema>;
export type CustomLine = z.infer<typeof CustomLineSchema>;
export type TicketKind = "stock" | "custom" | "truck";

export const CutsheetRecordSchema = z.object({
  id: z.number().int(),
  createdAt: z.string(),
  updatedAt: z.string(),
  data: CutsheetSchema,
});
export type CutsheetRecord = z.infer<typeof CutsheetRecordSchema>;

export function emptyCutsheet(): Cutsheet {
  return CutsheetSchema.parse({
    header: {},
    stock: { duct60: {}, sdMisc: {} },
    custom: {
      endCaps: [],
      volumeDampers: [],
      canvasConn: [],
      customDuct: [],
      miscellaneous: [],
      rndCollars: {},
      roundVolumeDampers: {},
    },
    truck: { ovPipe: {}, rndPipe: {} },
    formOnly: {
      filterRacks: {},
      drainPans: {},
      returnPlenum: {},
      plenumContents: { small: {}, large: {} },
      ovalEll: {},
      ovalToRnd: {},
      ovalSHeads: {},
      ellBoots: {},
      endBoots: {},
      strtBoots: {},
      tto: {},
      midAtlanticWallCaps: {},
      birdCage: {},
      metalScreen: {},
      dryerBox: {},
      rndEll: {},
      blueFlashing: {},
      freshAirDampers: {},
      galRedr: {},
      fans: {},
      straightBootBoxes: {},
      simpsonStp: {},
      sdMiscExtras: {},
      roundEndCaps: {},
      uninsulatedFlex: {},
      insulatedFlexR4: {},
      insulatedFlexR8: {},
      saddleTap: {},
      airTights: {},
      bVent: {},
      flexBVent: {},
    },
    customLines: [],
    fittings: [],
    attachments: [],
  });
}
