import { notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { HeaderFields } from "@/components/cutsheet/HeaderFields";
import { PlenumPackageCard } from "@/components/cutsheet/PlenumPackageCard";
import { QtyGridCard } from "@/components/cutsheet/QtyGrid";
import { WHRowsCard } from "@/components/cutsheet/WHRowsCard";
import { CustomDuctRowsCard } from "@/components/cutsheet/CustomDuctRowsCard";
import { MiscRowsCard } from "@/components/cutsheet/MiscRowsCard";
import { PhotosCard } from "@/components/cutsheet/PhotosCard";
import { DocumentsCard } from "@/components/cutsheet/DocumentsCard";
import { DeleteCutsheetButton } from "@/components/cutsheet/DeleteCutsheetButton";
import { CloneCutsheetButton } from "@/components/cutsheet/CloneCutsheetButton";
import { CutsheetForm } from "@/components/cutsheet/CutsheetForm";
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
} from "@/lib/schema";
import { updateCutsheet } from "@/lib/actions";

type CutsheetRow = { id: number; data: string; updated_at: string };

const FORM_ID = "cutsheet-form";

const duct60Label = (s: string) => (s.startsWith("3.25") ? `3 1/4 x ${s.slice(5)}` : s);
const bootLabel = (s: string) => s.replace("3.25", "3 1/4");
const quote = (s: string) => `${s}"`;

// Friendly labels for object-key maps where the schema key isn't UI-friendly.
const SD_MISC_LABELS: Record<(typeof SD_MISC_KEYS)[number], string> = {
  drive24: '24" Drive',
  slips26: '26" Slips',
  mastic: "Mastic",
  brushes: "Brushes",
};
const SD_MISC_EXTRAS_LABELS: Record<(typeof SD_MISC_EXTRAS_KEYS)[number], string> = {
  angles: "Angles",
  bubbleWrap: "Bubble Wrap",
  foilIns: "Foil Ins",
};
const FILTER_RACKS_LABELS: Record<(typeof FILTER_RACKS_KEYS)[number], string> = {
  "16x25": "16x25",
  "20x25": "20x25",
  lBox: "L-Box",
};
const RETURN_PLENUM_LABELS: Record<(typeof RETURN_PLENUM_KEYS)[number], string> = {
  "14x24SL": "14x24 S.L.",
  "18x24SL": "18x24 S.L.",
  furnaceFeet: "Furnace Feet",
};
const SIMPSON_STP_LABELS: Record<(typeof SIMPSON_STP_KEYS)[number], string> = {
  stp18: 'Simpson STP 18"',
  stp24: 'Simpson STP 24"',
};
const MID_ATLANTIC_LABELS: Record<(typeof MID_ATLANTIC_KEYS)[number], string> = {
  buildersEdgeMetal4: '4" Metal',
  buildersEdgeMetal6: '6" Metal',
  buildersEdgeScreen4: '4" Screen',
  buildersEdgeScreen6: '6" Screen',
};
const METAL_SCREEN_LABELS: Record<(typeof METAL_SCREEN_KEYS)[number], string> = {
  metal6: '6" Metal',
  metal8: '8" Metal',
  metal10: '10" Metal',
  metal10x3_25: '10 x 3 1/4 Metal',
  screen6: '6" Screen',
  screen8: '8" Screen',
  screen10: '10" Screen',
  screen10x3_25: '10 x 3 1/4 Screen',
};
const DRYER_BOX_LABELS: Record<(typeof DRYER_BOX_KEYS)[number], string> = {
  metal6: '6" Metal',
  plastic6: '6" Plastic',
};
const BLUE_FLASHING_LABELS: Record<(typeof BLUE_FLASHING_KEYS)[number], string> = {
  p400: 'P400 (4")',
  p600: "P600",
  p800: "P800",
  p1000: "P1000",
};
const FANS_LABELS: Record<(typeof FANS_KEYS)[number], string> = {
  AE80_4: 'AE 80 4" FAN',
  "744": "744 FAN",
  SLM70: "SLM 70 FAN",
  SIG80_110: "SIG 80-110 FAN",
  PTE511: "PTE 511 FAN",
  PTEL511: "PTEL 511 FAN",
  gNeckSilv4: '4" G-NECK SILV',
  gNeckBlk4: '4" G-NECK BLK',
  gNeck116_6: '6" G-NECK 116',
  roofCap634_6: '6" 634 ROOF CAP',
  roofJ6: 'ROOF J 6"',
  roofJ8: 'ROOF J 8"',
  roofJ10: 'ROOF J 10"',
};
const B_VENT_LABELS: Record<(typeof B_VENT_KEYS)[number], string> = {
  pc5: "5' PC",
  pc3: "3' PC",
  pc2: "2' PC",
  pc1: "1' PC",
  deg60: "60 Deg",
  deg90: "90 Deg",
  tee: "Tee",
  ccf: "C-C-F",
};
const FLEX_B_VENT_LABELS: Record<(typeof FLEX_B_VENT_KEYS)[number], string> = {
  "4x36": '4" x 36"',
  "4x60": '4" x 60"',
};

export default async function EditCutsheetPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const numeric = Number(id);
  if (!Number.isInteger(numeric)) notFound();

  const row = db
    .prepare<[number], CutsheetRow>(
      "SELECT id, data, updated_at FROM cutsheets WHERE id = ? AND deleted_at IS NULL",
    )
    .get(numeric);
  if (!row) notFound();

  const parsed = CutsheetSchema.safeParse(JSON.parse(row.data));
  if (!parsed.success) notFound();

  const d = parsed.data;
  const update = updateCutsheet.bind(null, numeric);

  const photos = db
    .prepare<[number], { id: number; filename: string }>(
      `SELECT id, filename FROM attachments
       WHERE cutsheet_id = ? AND kind = 'image'
       ORDER BY created_at ASC, id ASC`,
    )
    .all(numeric);

  const documents = db
    .prepare<[number], { id: number; filename: string; size: number; mime: string }>(
      `SELECT id, filename, size, mime FROM attachments
       WHERE cutsheet_id = ? AND kind = 'document'
       ORDER BY created_at ASC, id ASC`,
    )
    .all(numeric);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <input
            type="text"
            name="name"
            form={FORM_ID}
            defaultValue={d.name}
            aria-label="Cutsheet name"
            placeholder={`Cutsheet #${row.id}`}
            className="-mx-1 w-full max-w-xl rounded bg-transparent text-2xl font-semibold tracking-tight outline-none placeholder:text-muted-foreground/60 focus-visible:bg-accent/50 px-1"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            #{row.id} · Updated {row.updated_at}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <PdfLink id={row.id} ticket="stock">Stock PDF</PdfLink>
          <PdfLink id={row.id} ticket="custom">Custom PDF</PdfLink>
          <PdfLink id={row.id} ticket="truck">Truck PDF</PdfLink>
          <Button type="submit" form={FORM_ID} size="sm">Save</Button>
          <CloneCutsheetButton cutsheetId={numeric} />
          <DeleteCutsheetButton cutsheetId={numeric} />
        </div>
      </div>

      <CutsheetForm formId={FORM_ID} action={update} className="space-y-10">
        <SectionGroup title="Project">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Header</CardTitle>
            </CardHeader>
            <CardContent>
              <HeaderFields initial={d.header} />
            </CardContent>
          </Card>
          <PlenumPackageCard value={d.header.plenumPackage} className="lg:col-span-2" />
        </SectionGroup>

        <SectionGroup title="Stock Duct (prints on Stock PDF)">
          <QtyGridCard className="lg:col-span-2" title='60" Duct' prefix="duct60" sizes={DUCT60_SIZES} values={d.stock.duct60} formatLabel={duct60Label} />
          <QtyGridCard title="S D / Misc" prefix="sdMisc" sizes={SD_MISC_KEYS} values={d.stock.sdMisc} formatLabel={(k) => SD_MISC_LABELS[k]} />
        </SectionGroup>

        <SectionGroup title="Custom Duct (prints on Custom PDF)">
          <WHRowsCard title="End Caps" prefix="endCaps" initial={d.custom.endCaps} />
          <WHRowsCard title="Volume Dampers" prefix="volumeDampers" initial={d.custom.volumeDampers} />
          <WHRowsCard title="Canvas Conn" prefix="canvasConn" initial={d.custom.canvasConn} />
          <CustomDuctRowsCard className="lg:col-span-2" prefix="customDuct" initial={d.custom.customDuct} />
          <MiscRowsCard title="Miscellaneous" prefix="miscellaneous" initial={d.custom.miscellaneous} />
          <QtyGridCard title="RND Collars" prefix="rndCollars" sizes={RND_SIZES} values={d.custom.rndCollars} formatLabel={quote} />
          <QtyGridCard title="Round Volume Dampers" prefix="roundVolumeDampers" sizes={RND_SIZES} values={d.custom.roundVolumeDampers} formatLabel={quote} />
        </SectionGroup>

        <SectionGroup title="Truck (prints on Truck PDF)">
          <QtyGridCard title="OV Pipe" prefix="ovPipe" sizes={OV_PIPE_SIZES} values={d.truck.ovPipe} formatLabel={quote} />
          <QtyGridCard title="RND Pipe" prefix="rndPipe" sizes={RND_PIPE_SIZES} values={d.truck.rndPipe} />
        </SectionGroup>

        <SectionGroup title="Plenum-Adjacent">
          <QtyGridCard title="Filter Racks" prefix="filterRacks" sizes={FILTER_RACKS_KEYS} values={d.formOnly.filterRacks} formatLabel={(k) => FILTER_RACKS_LABELS[k]} />
          <QtyGridCard title="Drain Pans" prefix="drainPans" sizes={DRAIN_PANS_KEYS} values={d.formOnly.drainPans} />
          <QtyGridCard title="Return Plenum" prefix="returnPlenum" sizes={RETURN_PLENUM_KEYS} values={d.formOnly.returnPlenum} formatLabel={(k) => RETURN_PLENUM_LABELS[k]} />
        </SectionGroup>

        <SectionGroup title="Boots & Boxes">
          <QtyGridCard title="Straight Boot Boxes" prefix="straightBootBoxes" sizes={STRAIGHT_BOOT_BOXES_SIZES} values={d.formOnly.straightBootBoxes} />
          <QtyGridCard title="Simpson STP" prefix="simpsonStp" sizes={SIMPSON_STP_KEYS} values={d.formOnly.simpsonStp} formatLabel={(k) => SIMPSON_STP_LABELS[k]} />
          <QtyGridCard title="Ell Boots" prefix="ellBoots" sizes={ELL_BOOTS_SIZES} values={d.formOnly.ellBoots} formatLabel={bootLabel} />
          <QtyGridCard title="End Boots" prefix="endBoots" sizes={END_BOOTS_SIZES} values={d.formOnly.endBoots} formatLabel={bootLabel} />
          <QtyGridCard title="STRT Boots" prefix="strtBoots" sizes={STRT_BOOTS_SIZES} values={d.formOnly.strtBoots} formatLabel={bootLabel} />
          <QtyGridCard title="TTO" prefix="tto" sizes={TTO_SIZES} values={d.formOnly.tto} />
        </SectionGroup>

        <SectionGroup title="Oval & Round">
          <QtyGridCard title="Oval Ells" prefix="ovalEll" sizes={OVAL_ELL_SIZES} values={d.formOnly.ovalEll} />
          <QtyGridCard title="Oval to Rnd" prefix="ovalToRnd" sizes={OVAL_TO_RND_SIZES} values={d.formOnly.ovalToRnd} />
          <QtyGridCard title="Oval S. Heads" prefix="ovalSHeads" sizes={OVAL_S_HEADS_SIZES} values={d.formOnly.ovalSHeads} />
          <QtyGridCard title="RND Ells" prefix="rndEll" sizes={RND_ELL_SIZES} values={d.formOnly.rndEll} formatLabel={quote} />
          <QtyGridCard title="Air Tights" prefix="airTights" sizes={FLEX_SIZES} values={d.formOnly.airTights} formatLabel={quote} />
          <QtyGridCard title="Saddle Tap" prefix="saddleTap" sizes={SADDLE_TAP_SIZES} values={d.formOnly.saddleTap} formatLabel={quote} />
        </SectionGroup>

        <SectionGroup title="Flex">
          <QtyGridCard title="Uninsulated Flex" prefix="uninsulatedFlex" sizes={FLEX_SIZES} values={d.formOnly.uninsulatedFlex} formatLabel={quote} />
          <QtyGridCard title="Insulated Flex R4" prefix="insulatedFlexR4" sizes={FLEX_SIZES} values={d.formOnly.insulatedFlexR4} formatLabel={quote} />
          <QtyGridCard title="Insulated Flex R8" prefix="insulatedFlexR8" sizes={FLEX_SIZES} values={d.formOnly.insulatedFlexR8} formatLabel={quote} />
        </SectionGroup>

        <SectionGroup title="Caps, Cages, Vents">
          <QtyGridCard title="Mid Atlantic Wall Caps (Builders Edge)" prefix="midAtlanticWallCaps" sizes={MID_ATLANTIC_KEYS} values={d.formOnly.midAtlanticWallCaps} formatLabel={(k) => MID_ATLANTIC_LABELS[k]} />
          <QtyGridCard title="Bird Cage" prefix="birdCage" sizes={BIRD_CAGE_SIZES} values={d.formOnly.birdCage} formatLabel={quote} />
          <QtyGridCard title="Metal / Screen" prefix="metalScreen" sizes={METAL_SCREEN_KEYS} values={d.formOnly.metalScreen} formatLabel={(k) => METAL_SCREEN_LABELS[k]} />
          <QtyGridCard title="Dryer Box" prefix="dryerBox" sizes={DRYER_BOX_KEYS} values={d.formOnly.dryerBox} formatLabel={(k) => DRYER_BOX_LABELS[k]} />
          <QtyGridCard title="B-Vent" prefix="bVent" sizes={B_VENT_KEYS} values={d.formOnly.bVent} formatLabel={(k) => B_VENT_LABELS[k]} />
          <QtyGridCard title="Flex B-Vent" prefix="flexBVent" sizes={FLEX_B_VENT_KEYS} values={d.formOnly.flexBVent} formatLabel={(k) => FLEX_B_VENT_LABELS[k]} />
          <QtyGridCard title="Blue Flashing" prefix="blueFlashing" sizes={BLUE_FLASHING_KEYS} values={d.formOnly.blueFlashing} formatLabel={(k) => BLUE_FLASHING_LABELS[k]} />
        </SectionGroup>

        <SectionGroup title="Fans / G-Necks / Roof">
          <QtyGridCard className="lg:col-span-2" title="Fans / G-Necks / Roof" prefix="fans" sizes={FANS_KEYS} values={d.formOnly.fans} formatLabel={(k) => FANS_LABELS[k]} />
        </SectionGroup>

        <SectionGroup title="Misc / Extras">
          <QtyGridCard title="Fresh Air Dampers" prefix="freshAirDampers" sizes={FRESH_AIR_DAMPER_SIZES} values={d.formOnly.freshAirDampers} />
          <QtyGridCard title="Gal Redr" prefix="galRedr" sizes={GAL_REDR_SIZES} values={d.formOnly.galRedr} />
          <QtyGridCard title="S D / Misc Extras" prefix="sdMiscExtras" sizes={SD_MISC_EXTRAS_KEYS} values={d.formOnly.sdMiscExtras} formatLabel={(k) => SD_MISC_EXTRAS_LABELS[k]} />
          <PanningCondCard panning={d.formOnly.panningMetal36x36} cond={d.formOnly.condRegs8x6} />
        </SectionGroup>

        <SectionGroup title="Registers & Grills">
          <MiscRowsCard title="Wall Regs" prefix="wallRegs" initial={d.formOnly.wallRegs} baseline={5} />
          <MiscRowsCard title="Grills" prefix="grills" initial={d.formOnly.grills} baseline={5} />
          <MiscRowsCard title="Filter Grills" prefix="filterGrills" initial={d.formOnly.filterGrills} baseline={5} />
          <MiscRowsCard title="Floor Regs" prefix="floorRegs" initial={d.formOnly.floorRegs} baseline={5} />
        </SectionGroup>

        <SectionGroup title="Documentation">
          <PhotosCard cutsheetId={numeric} photos={photos} />
          <DocumentsCard cutsheetId={numeric} documents={documents} />
        </SectionGroup>
      </CutsheetForm>
    </div>
  );
}

// Bento layout: cards tile two-per-row on lg+ and stack on small screens.
// Cards with too much internal content (Header, 60" Duct, Custom Duct rows,
// Fans, etc.) opt into a full-width row via className="lg:col-span-2".
function SectionGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </h2>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">{children}</div>
    </section>
  );
}

function PanningCondCard({ panning, cond }: { panning: number; cond: number }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Panning / Cond Regs</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <SingletonField
            label="Panning Metal (36x36)"
            name="panningMetal36x36"
            defaultValue={panning}
          />
          <SingletonField label="Cond Regs (8x6)" name="condRegs8x6" defaultValue={cond} />
        </div>
      </CardContent>
    </Card>
  );
}

function SingletonField({
  label,
  name,
  defaultValue,
}: {
  label: string;
  name: string;
  defaultValue: number;
}) {
  return (
    <div className="flex items-center gap-2">
      <Label htmlFor={name} className="flex-1 text-xs font-normal text-muted-foreground">
        {label}
      </Label>
      <Input
        id={name}
        name={name}
        type="number"
        inputMode="numeric"
        min={0}
        step={1}
        defaultValue={defaultValue === 0 ? "" : defaultValue}
        placeholder="0"
        className="h-8 w-20 text-right"
      />
    </div>
  );
}

function PdfLink({
  id,
  ticket,
  children,
}: {
  id: number;
  ticket: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={`/api/pdf/${id}/${ticket}`}
      target="_blank"
      className="text-sm text-muted-foreground underline-offset-4 hover:underline"
    >
      {children}
    </Link>
  );
}
