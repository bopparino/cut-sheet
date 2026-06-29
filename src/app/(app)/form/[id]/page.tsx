import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SectionRail, type RailItem } from "@/components/cutsheet/SectionRail";
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
import { withPaths } from "@/lib/folders";

type CutsheetRow = { id: number; data: string; updated_at: string; folder_id: number | null };
type FolderOption = { id: number; path: string };

const FORM_ID = "cutsheet-form";

const duct60Label = (s: string) => (s.startsWith("3.25") ? `3 1/4 x ${s.slice(5)}` : s);
const bootLabel = (s: string) => s.replace("3.25", "3 1/4");
const quote = (s: string) => `${s}"`;

const SD_MISC_LABELS: Record<(typeof SD_MISC_KEYS)[number], string> = {
  drive24: '24" Drive', slips26: '26" Slips', mastic: "Mastic", brushes: "Brushes",
};
const SD_MISC_EXTRAS_LABELS: Record<(typeof SD_MISC_EXTRAS_KEYS)[number], string> = {
  angles: "Angles", bubbleWrap: "Bubble Wrap", foilIns: "Foil Ins",
};
const FILTER_RACKS_LABELS: Record<(typeof FILTER_RACKS_KEYS)[number], string> = {
  "16x25": "16x25", "20x25": "20x25", lBox: "L-Box",
};
const RETURN_PLENUM_LABELS: Record<(typeof RETURN_PLENUM_KEYS)[number], string> = {
  "14x24SL": "14x24 S.L.", "18x24SL": "18x24 S.L.", furnaceFeet: "Furnace Feet",
};
const SIMPSON_STP_LABELS: Record<(typeof SIMPSON_STP_KEYS)[number], string> = {
  stp18: 'Simpson STP 18"', stp24: 'Simpson STP 24"',
};
const MID_ATLANTIC_LABELS: Record<(typeof MID_ATLANTIC_KEYS)[number], string> = {
  buildersEdgeMetal4: '4" Metal', buildersEdgeMetal6: '6" Metal',
  buildersEdgeScreen4: '4" Screen', buildersEdgeScreen6: '6" Screen',
};
const METAL_SCREEN_LABELS: Record<(typeof METAL_SCREEN_KEYS)[number], string> = {
  metal6: '6" Metal', metal8: '8" Metal', metal10: '10" Metal', metal10x3_25: '10 x 3 1/4 Metal',
  screen6: '6" Screen', screen8: '8" Screen', screen10: '10" Screen', screen10x3_25: '10 x 3 1/4 Screen',
};
const DRYER_BOX_LABELS: Record<(typeof DRYER_BOX_KEYS)[number], string> = {
  metal6: '6" Metal', plastic6: '6" Plastic',
};
const BLUE_FLASHING_LABELS: Record<(typeof BLUE_FLASHING_KEYS)[number], string> = {
  p400: 'P400 (4")', p600: "P600", p800: "P800", p1000: "P1000",
};
const FANS_LABELS: Record<(typeof FANS_KEYS)[number], string> = {
  AE80_4: 'AE 80 4" FAN', "744": "744 FAN", SLM70: "SLM 70 FAN", SIG80_110: "SIG 80-110 FAN",
  PTE511: "PTE 511 FAN", PTEL511: "PTEL 511 FAN", gNeckSilv4: '4" G-NECK SILV', gNeckBlk4: '4" G-NECK BLK',
  gNeck116_6: '6" G-NECK 116', roofCap634_6: '6" 634 ROOF CAP', roofJ6: 'ROOF J 6"', roofJ8: 'ROOF J 8"', roofJ10: 'ROOF J 10"',
};
const B_VENT_LABELS: Record<(typeof B_VENT_KEYS)[number], string> = {
  pc5: "5' PC", pc3: "3' PC", pc2: "2' PC", pc1: "1' PC", deg60: "60 Deg", deg90: "90 Deg", tee: "Tee", ccf: "C-C-F",
};
const FLEX_B_VENT_LABELS: Record<(typeof FLEX_B_VENT_KEYS)[number], string> = {
  "4x36": '4" x 36"', "4x60": '4" x 60"',
};

const nz = (obj: Record<string, number>) => Object.values(obj).filter((v) => v > 0).length;
const nzRows = (arr: { qty: number }[]) => arr.filter((r) => r.qty > 0).length;

export default async function EditCutsheetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const numeric = Number(id);
  if (!Number.isInteger(numeric)) notFound();

  const row = db
    .prepare<[number], CutsheetRow>(
      "SELECT id, data, updated_at, folder_id FROM cutsheets WHERE id = ? AND deleted_at IS NULL",
    )
    .get(numeric);
  if (!row) notFound();

  const folderRows = db
    .prepare<[], { id: number; name: string; parent_id: number | null }>(
      "SELECT id, name, parent_id FROM folders ORDER BY name COLLATE NOCASE ASC",
    )
    .all();
  const folders: FolderOption[] = withPaths(folderRows)
    .map((f) => ({ id: f.id, path: f.path }))
    .sort((a, b) => a.path.localeCompare(b.path));

  const parsed = CutsheetSchema.safeParse(JSON.parse(row.data));
  if (!parsed.success) notFound();
  const d = parsed.data;
  const update = updateCutsheet.bind(null, numeric);

  const photos = db
    .prepare<[number], { id: number; filename: string }>(
      `SELECT id, filename FROM attachments WHERE cutsheet_id = ? AND kind = 'image'
       ORDER BY created_at ASC, id ASC`,
    )
    .all(numeric);
  const documents = db
    .prepare<[number], { id: number; filename: string; size: number; mime: string }>(
      `SELECT id, filename, size, mime FROM attachments WHERE cutsheet_id = ? AND kind = 'document'
       ORDER BY created_at ASC, id ASC`,
    )
    .all(numeric);

  const houseSiblingCount =
    d.header.propNumber && d.header.lot
      ? db
          .prepare<[string, string], { n: number }>(
            `SELECT COUNT(*) AS n FROM cutsheets WHERE deleted_at IS NULL
               AND json_extract(data, '$.header.propNumber') = ?
               AND json_extract(data, '$.header.lot') = ?`,
          )
          .get(d.header.propNumber, d.header.lot)?.n ?? 0
      : 0;
  const isHouse = houseSiblingCount > 1;

  const stockCount = nz(d.stock.duct60) + nz(d.stock.sdMisc);
  const customCount =
    nzRows(d.custom.endCaps) + nzRows(d.custom.volumeDampers) + nzRows(d.custom.canvasConn) +
    nzRows(d.custom.customDuct) + d.custom.miscellaneous.filter(Boolean).length +
    nz(d.custom.rndCollars) + nz(d.custom.roundVolumeDampers);
  const truckCount = nz(d.truck.ovPipe) + nz(d.truck.rndPipe);

  const rail: RailItem[] = [
    { id: "g-header", label: "Header" },
    { id: "g-stock", label: "Stock duct", badge: stockCount },
    { id: "g-custom", label: "Custom", badge: customCount },
    { id: "g-truck", label: "Truck", badge: truckCount },
    { id: "g-racks", label: "Racks & plenum" },
    { id: "g-boots", label: "Boots & boxes" },
    { id: "g-oval", label: "Oval & round" },
    { id: "g-flex", label: "Flex" },
    { id: "g-caps", label: "Caps & vents" },
    { id: "g-fans", label: "Fans" },
    { id: "g-misc", label: "Misc & extras" },
    { id: "g-registers", label: "Registers" },
    { id: "g-docs", label: "Documents" },
  ];

  const title = (d.name || "").trim() || `Cutsheet #${row.id}`;

  return (
    <div key={row.id}>
      {/* Sticky action bar */}
      <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-6 py-3">
          <Link
            href="/browse"
            className="flex items-center gap-1 rounded-sm px-2 py-1.5 text-[13px] text-[var(--text-2)] hover:bg-accent hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4" /> Browse
          </Link>
          <div className="min-w-0 flex-1">
            <input
              type="text"
              name="name"
              form={FORM_ID}
              defaultValue={d.name}
              aria-label="Cutsheet name"
              placeholder={title}
              className="-mx-1 w-full max-w-md truncate rounded-sm bg-transparent px-1 text-[16px] font-bold tracking-[-0.01em] outline-none focus-visible:bg-accent"
            />
            <p className="font-mono-data mt-0.5 px-0.5 text-[11px] text-[var(--text-3)]">
              #{row.id}
              {d.header.lot ? ` · Lot ${d.header.lot}` : ""}
              {d.header.builder ? ` · ${d.header.builder}` : ""}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <FolderSelect form={FORM_ID} folders={folders} value={row.folder_id} />
            <CloneCutsheetButton cutsheetId={numeric} />
            <DeleteCutsheetButton cutsheetId={numeric} />
            <button
              type="submit"
              form={FORM_ID}
              className="btn-glow inline-flex h-9 items-center rounded-sm border border-primary bg-primary px-4 text-[13px] font-semibold text-primary-foreground"
            >
              Save
            </button>
          </div>
        </div>

        {/* OPEN AS — segmented control */}
        <div className="flex items-center gap-3 px-6 pb-3">
          <span className="label-caps">Open as</span>
          <div className="inline-flex overflow-hidden rounded-sm border border-input">
            <span className="flex h-[34px] items-center border-r border-input bg-primary px-[13px] font-mono-data text-[11px] font-semibold uppercase tracking-[0.04em] text-primary-foreground">
              Card
            </span>
            <Segment href={`/form/${row.id}/replica`}>Replica</Segment>
            <Segment href={`/api/pdf/${row.id}/filled`} external>Filled PDF</Segment>
            {(["stock", "custom", "truck"] as const).map((t) => (
              <Segment
                key={t}
                external
                href={
                  isHouse
                    ? `/api/pdf/house/${encodeURIComponent(d.header.propNumber)}/${encodeURIComponent(d.header.lot)}/${t}`
                    : `/api/pdf/${row.id}/${t}`
                }
              >
                {t === "stock" ? "Stock" : t === "custom" ? "Custom" : "Truck"}
              </Segment>
            ))}
          </div>
        </div>
      </header>

      <div className="flex gap-7 px-6 py-7">
        <SectionRail items={rail} />
        <CutsheetForm formId={FORM_ID} action={update} className="min-w-0 flex-1 space-y-9">
          <Group id="g-header" title="Header">
            <Card className="xl:col-span-2">
              <CardHeader>
                <CardTitle>Header</CardTitle>
              </CardHeader>
              <CardContent>
                <HeaderFields initial={d.header} />
              </CardContent>
            </Card>
            <PlenumPackageCard value={d.header.plenumPackage} className="xl:col-span-2" />
          </Group>

          <Group id="g-stock" title="Stock duct" pdf="Stock PDF">
            <QtyGridCard className="xl:col-span-2" title='60" Duct' prefix="duct60" sizes={DUCT60_SIZES} values={d.stock.duct60} formatLabel={duct60Label} />
            <QtyGridCard title="S D / Misc" prefix="sdMisc" sizes={SD_MISC_KEYS} values={d.stock.sdMisc} formatLabel={(k) => SD_MISC_LABELS[k]} />
          </Group>

          <Group id="g-custom" title="Custom" pdf="Custom PDF">
            <WHRowsCard title="End Caps" prefix="endCaps" initial={d.custom.endCaps} />
            <WHRowsCard title="Volume Dampers" prefix="volumeDampers" initial={d.custom.volumeDampers} />
            <WHRowsCard title="Canvas Conn" prefix="canvasConn" initial={d.custom.canvasConn} />
            <CustomDuctRowsCard className="xl:col-span-2" prefix="customDuct" initial={d.custom.customDuct} />
            <MiscRowsCard title="Miscellaneous" prefix="miscellaneous" initial={d.custom.miscellaneous} />
            <QtyGridCard title="RND Collars" prefix="rndCollars" sizes={RND_SIZES} values={d.custom.rndCollars} formatLabel={quote} />
            <QtyGridCard title="Round Volume Dampers" prefix="roundVolumeDampers" sizes={RND_SIZES} values={d.custom.roundVolumeDampers} formatLabel={quote} />
          </Group>

          <Group id="g-truck" title="Truck" pdf="Truck PDF">
            <QtyGridCard title="OV Pipe" prefix="ovPipe" sizes={OV_PIPE_SIZES} values={d.truck.ovPipe} formatLabel={quote} />
            <QtyGridCard title="RND Pipe" prefix="rndPipe" sizes={RND_PIPE_SIZES} values={d.truck.rndPipe} />
          </Group>

          <Group id="g-racks" title="Racks & plenum">
            <QtyGridCard title="Filter Racks" prefix="filterRacks" sizes={FILTER_RACKS_KEYS} values={d.formOnly.filterRacks} formatLabel={(k) => FILTER_RACKS_LABELS[k]} />
            <QtyGridCard title="Drain Pans" prefix="drainPans" sizes={DRAIN_PANS_KEYS} values={d.formOnly.drainPans} />
            <QtyGridCard title="Return Plenum" prefix="returnPlenum" sizes={RETURN_PLENUM_KEYS} values={d.formOnly.returnPlenum} formatLabel={(k) => RETURN_PLENUM_LABELS[k]} />
          </Group>

          <Group id="g-boots" title="Boots & boxes">
            <QtyGridCard title="Straight Boot Boxes" prefix="straightBootBoxes" sizes={STRAIGHT_BOOT_BOXES_SIZES} values={d.formOnly.straightBootBoxes} />
            <QtyGridCard title="Simpson STP" prefix="simpsonStp" sizes={SIMPSON_STP_KEYS} values={d.formOnly.simpsonStp} formatLabel={(k) => SIMPSON_STP_LABELS[k]} />
            <QtyGridCard title="Ell Boots" prefix="ellBoots" sizes={ELL_BOOTS_SIZES} values={d.formOnly.ellBoots} formatLabel={bootLabel} />
            <QtyGridCard title="End Boots" prefix="endBoots" sizes={END_BOOTS_SIZES} values={d.formOnly.endBoots} formatLabel={bootLabel} />
            <QtyGridCard title="STRT Boots" prefix="strtBoots" sizes={STRT_BOOTS_SIZES} values={d.formOnly.strtBoots} formatLabel={bootLabel} />
            <QtyGridCard title="TTO" prefix="tto" sizes={TTO_SIZES} values={d.formOnly.tto} />
          </Group>

          <Group id="g-oval" title="Oval & round">
            <QtyGridCard title="Oval Ells" prefix="ovalEll" sizes={OVAL_ELL_SIZES} values={d.formOnly.ovalEll} />
            <QtyGridCard title="Oval to Rnd" prefix="ovalToRnd" sizes={OVAL_TO_RND_SIZES} values={d.formOnly.ovalToRnd} />
            <QtyGridCard title="Oval S. Heads" prefix="ovalSHeads" sizes={OVAL_S_HEADS_SIZES} values={d.formOnly.ovalSHeads} />
            <QtyGridCard title="RND Ells" prefix="rndEll" sizes={RND_ELL_SIZES} values={d.formOnly.rndEll} formatLabel={quote} />
            <QtyGridCard title="Air Tights" prefix="airTights" sizes={FLEX_SIZES} values={d.formOnly.airTights} formatLabel={quote} />
            <QtyGridCard title="Saddle Tap" prefix="saddleTap" sizes={SADDLE_TAP_SIZES} values={d.formOnly.saddleTap} formatLabel={quote} />
          </Group>

          <Group id="g-flex" title="Flex">
            <QtyGridCard title="Uninsulated Flex" prefix="uninsulatedFlex" sizes={FLEX_SIZES} values={d.formOnly.uninsulatedFlex} formatLabel={quote} />
            <QtyGridCard title="Insulated Flex R4" prefix="insulatedFlexR4" sizes={FLEX_SIZES} values={d.formOnly.insulatedFlexR4} formatLabel={quote} />
            <QtyGridCard title="Insulated Flex R8" prefix="insulatedFlexR8" sizes={FLEX_SIZES} values={d.formOnly.insulatedFlexR8} formatLabel={quote} />
          </Group>

          <Group id="g-caps" title="Caps & vents">
            <QtyGridCard title="Mid Atlantic Wall Caps" prefix="midAtlanticWallCaps" sizes={MID_ATLANTIC_KEYS} values={d.formOnly.midAtlanticWallCaps} formatLabel={(k) => MID_ATLANTIC_LABELS[k]} />
            <QtyGridCard title="Bird Cage" prefix="birdCage" sizes={BIRD_CAGE_SIZES} values={d.formOnly.birdCage} formatLabel={quote} />
            <QtyGridCard title="Metal / Screen" prefix="metalScreen" sizes={METAL_SCREEN_KEYS} values={d.formOnly.metalScreen} formatLabel={(k) => METAL_SCREEN_LABELS[k]} />
            <QtyGridCard title="Dryer Box" prefix="dryerBox" sizes={DRYER_BOX_KEYS} values={d.formOnly.dryerBox} formatLabel={(k) => DRYER_BOX_LABELS[k]} />
            <QtyGridCard title="B-Vent" prefix="bVent" sizes={B_VENT_KEYS} values={d.formOnly.bVent} formatLabel={(k) => B_VENT_LABELS[k]} />
            <QtyGridCard title="Flex B-Vent" prefix="flexBVent" sizes={FLEX_B_VENT_KEYS} values={d.formOnly.flexBVent} formatLabel={(k) => FLEX_B_VENT_LABELS[k]} />
            <QtyGridCard title="Blue Flashing" prefix="blueFlashing" sizes={BLUE_FLASHING_KEYS} values={d.formOnly.blueFlashing} formatLabel={(k) => BLUE_FLASHING_LABELS[k]} />
          </Group>

          <Group id="g-fans" title="Fans / G-Necks / Roof">
            <QtyGridCard className="xl:col-span-2" title="Fans / G-Necks / Roof" prefix="fans" sizes={FANS_KEYS} values={d.formOnly.fans} formatLabel={(k) => FANS_LABELS[k]} />
          </Group>

          <Group id="g-misc" title="Misc & extras">
            <QtyGridCard title="Fresh Air Dampers" prefix="freshAirDampers" sizes={FRESH_AIR_DAMPER_SIZES} values={d.formOnly.freshAirDampers} />
            <QtyGridCard title="Gal Redr" prefix="galRedr" sizes={GAL_REDR_SIZES} values={d.formOnly.galRedr} />
            <QtyGridCard title="S D / Misc Extras" prefix="sdMiscExtras" sizes={SD_MISC_EXTRAS_KEYS} values={d.formOnly.sdMiscExtras} formatLabel={(k) => SD_MISC_EXTRAS_LABELS[k]} />
            <PanningCondCard panning={d.formOnly.panningMetal36x36} cond={d.formOnly.condRegs8x6} />
          </Group>

          <Group id="g-registers" title="Registers & grills">
            <MiscRowsCard title="Wall Regs" prefix="wallRegs" initial={d.formOnly.wallRegs} baseline={5} />
            <MiscRowsCard title="Grills" prefix="grills" initial={d.formOnly.grills} baseline={5} />
            <MiscRowsCard title="Filter Grills" prefix="filterGrills" initial={d.formOnly.filterGrills} baseline={5} />
            <MiscRowsCard title="Floor Regs" prefix="floorRegs" initial={d.formOnly.floorRegs} baseline={5} />
          </Group>

          <Group id="g-docs" title="Documents">
            <PhotosCard cutsheetId={numeric} photos={photos} />
            <DocumentsCard cutsheetId={numeric} documents={documents} />
          </Group>
        </CutsheetForm>
      </div>
    </div>
  );
}

const SECTION_ORDER = [
  "g-header", "g-stock", "g-custom", "g-truck", "g-racks", "g-boots", "g-oval",
  "g-flex", "g-caps", "g-fans", "g-misc", "g-registers", "g-docs",
];

function Group({
  id,
  title,
  pdf,
  children,
}: {
  id: string;
  title: string;
  pdf?: string;
  children: React.ReactNode;
}) {
  const idx = SECTION_ORDER.indexOf(id);
  const num = idx >= 0 ? String(idx + 1).padStart(2, "0") : "";
  return (
    <section id={id} className="scroll-mt-32 space-y-3">
      <div className="flex items-baseline gap-2.5 border-b border-border pb-2.5">
        <span className="font-mono-data text-[12px] font-semibold text-[var(--text-ghost)]">{num}</span>
        <h2 className="text-[15px] font-bold tracking-[-0.01em] text-foreground">{title}</h2>
        {pdf && (
          <span className="font-mono-data text-[10px] uppercase tracking-[0.08em] text-[var(--text-3)]">
            · prints {pdf}
          </span>
        )}
      </div>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">{children}</div>
    </section>
  );
}

function Segment({
  href,
  external,
  children,
}: {
  href: string;
  external?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      {...(external ? { target: "_blank" } : {})}
      className="flex h-[34px] items-center border-r border-input bg-card px-[13px] font-mono-data text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--text-2)] transition-colors last:border-r-0 hover:bg-accent hover:text-foreground"
    >
      {children}
    </Link>
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
          <SingletonField label="Panning Metal (36x36)" name="panningMetal36x36" defaultValue={panning} />
          <SingletonField label="Cond Regs (8x6)" name="condRegs8x6" defaultValue={cond} />
        </div>
      </CardContent>
    </Card>
  );
}

function SingletonField({ label, name, defaultValue }: { label: string; name: string; defaultValue: number }) {
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
        className="font-mono-data h-8 w-20 text-right [&:not(:placeholder-shown)]:border-[var(--ink)] [&:not(:placeholder-shown)]:bg-[var(--fill)] [&:not(:placeholder-shown)]:font-semibold [&:not(:placeholder-shown)]:text-foreground"
      />
    </div>
  );
}

function FolderSelect({ form, folders, value }: { form: string; folders: FolderOption[]; value: number | null }) {
  return (
    <select
      name="folder_id"
      form={form}
      defaultValue={value == null ? "" : String(value)}
      aria-label="Filed under"
      className="h-9 rounded-sm border border-input bg-card px-2 text-[12px] text-foreground outline-none"
    >
      <option value="">Unfiled</option>
      {folders.map((f) => (
        <option key={f.id} value={f.id}>
          {f.path}
        </option>
      ))}
    </select>
  );
}

export const dynamic = "force-dynamic";
