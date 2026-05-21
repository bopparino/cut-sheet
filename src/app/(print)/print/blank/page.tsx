import {
  BIRD_CAGE_SIZES,
  BLUE_FLASHING_KEYS,
  B_VENT_KEYS,
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

// Blank pad template targeting 8.5" × 14" Legal — fits the entire schema on
// one page by matching the v1 paper layout's tricks: 5-up grid with variable
// widths, WH tables 2-up to halve their vertical, ~5pt labels, no inter-
// section gaps, and a vertically-tall drawing area centered in the page.

const duct60Label = (s: string) => (s.startsWith("3.25") ? `3¼x${s.slice(5)}` : s);
const bootLabel = (s: string) => s.replace("3.25", "3¼");

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
  metal10x3_25: "10x3¼ Metal",
  screen6: '6" Screen',
  screen8: '8" Screen',
  screen10: '10" Screen',
  screen10x3_25: "10x3¼ Screen",
};
const DRYER_BOX_LABELS: Record<(typeof DRYER_BOX_KEYS)[number], string> = {
  metal6: '6" Metal',
  plastic6: '6" Plastic',
};
const BLUE_FLASHING_LABELS: Record<(typeof BLUE_FLASHING_KEYS)[number], string> = {
  p400: "P400",
  p600: "P600",
  p800: "P800",
  p1000: "P1000",
};
const FANS_LABELS: Record<(typeof FANS_KEYS)[number], string> = {
  AE80_4: 'AE 80 4"',
  "744": "744 FAN",
  SLM70: "SLM 70",
  SIG80_110: "SIG 80-110",
  PTE511: "PTE 511",
  PTEL511: "PTEL 511",
  gNeckSilv4: '4" G-N Silv',
  gNeckBlk4: '4" G-N Blk',
  gNeck116_6: '6" G-N 116',
  roofCap634_6: '6" 634 Cap',
  roofJ6: 'Roof J 6"',
  roofJ8: 'Roof J 8"',
  roofJ10: 'Roof J 10"',
};
const B_VENT_LABELS: Record<(typeof B_VENT_KEYS)[number], string> = {
  pc5: "5' PC",
  pc3: "3' PC",
  pc2: "2' PC",
  pc1: "1' PC",
  deg60: "60°",
  deg90: "90°",
  tee: "Tee",
  ccf: "C-C-F",
};
const FLEX_B_VENT_LABELS: Record<(typeof FLEX_B_VENT_KEYS)[number], string> = {
  "4x36": '4"x36"',
  "4x60": '4"x60"',
};

export default function BlankPrintPage() {
  return (
    <div className="mx-auto w-[8in] bg-white p-0 font-sans text-[5.5pt] leading-[1.05] text-black">
      <PageHeader />
      <div
        className="grid"
        style={{ gridTemplateColumns: "1.8in 1.5in 0.95in 1.45in 1.85in" }}
      >
        <LeftCol />
        <CenterCol />
        <Duct60Col />
        <OvalCol />
        <RightCol />
      </div>
      <BottomStrip />
      <Footer />
    </div>
  );
}

// ---------- Header -----------------------------------------------------------

function PageHeader() {
  return (
    <header className="border border-black">
      <div className="flex items-center justify-between border-b border-black px-1 py-0.5">
        <span className="text-[10pt] font-bold uppercase tracking-wide">Cut Sheet</span>
        <span className="text-[6pt]">Pad #__________</span>
      </div>
      <HRow>
        <HF label="Builder" flex={3} />
        <HF label="Date" flex={1} />
        <HF label="Delivery Date" flex={1} />
        <HF label="Foreman" flex={1.4} />
      </HRow>
      <HRow>
        <HF label="Project" flex={3} />
        <HF label="Project Code" flex={1.2} />
        <HF label="Option" flex={0.9} />
        <HF label="House Type" flex={1.3} />
      </HRow>
      <HRow last>
        <HF label="Lot" flex={0.7} />
        <HF label="Block" flex={0.7} />
        <HF label="Section" flex={0.7} />
        <HF label="Prop #" flex={0.9} />
        <HF label="Zone" flex={0.7} />
        <HF label="Region (MD/VA/WV)" flex={1.5} />
        <HF label="Eq To (Job/Whs/Hold)" flex={1.5} />
      </HRow>
    </header>
  );
}

function HRow({ children, last }: { children: React.ReactNode; last?: boolean }) {
  return (
    <div className={`flex items-stretch ${last ? "" : "border-b border-black"}`}>
      {children}
    </div>
  );
}

function HF({ label, flex }: { label: string; flex: number }) {
  return (
    <div
      className="flex items-baseline gap-1 border-r border-black px-1 py-0.5 last:border-r-0"
      style={{ flex }}
    >
      <span className="shrink-0 text-[5pt] font-medium uppercase tracking-wide text-neutral-700">
        {label}
      </span>
      <span className="flex-1 border-b border-black" />
    </div>
  );
}

// ---------- Section primitives ----------------------------------------------

function Section({
  title,
  children,
  className,
  style,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={`border border-black border-t-0 first:border-t ${className ?? ""}`}
      style={style}
    >
      <div className="border-b border-black px-1 py-px text-[6pt] font-bold uppercase tracking-wide">
        {title}
      </div>
      <div className="p-0.5">{children}</div>
    </div>
  );
}

// Two sections share a horizontal slice so the column doesn't have to
// stack their titles. Used at the start of LeftCol for Plenum+Filter Racks
// and other paired narrow sections.
function SideBySide({
  left,
  right,
  className,
}: {
  left: React.ReactNode;
  right: React.ReactNode;
  className?: string;
}) {
  return <div className={`grid grid-cols-2 ${className ?? ""}`}>{[left, right]}</div>;
}

function QtyRow({ label }: { label: string }) {
  return (
    <div className="flex items-baseline justify-between gap-0.5 py-px">
      <span className="truncate">{label}</span>
      <span className="h-2 w-4 shrink-0 border border-black" />
    </div>
  );
}

function QtyList({ items }: { items: readonly string[] }) {
  return (
    <div className="space-y-0">
      {items.map((label) => (
        <QtyRow key={label} label={label} />
      ))}
    </div>
  );
}

function WHTable({ rows, withL = false }: { rows: number; withL?: boolean }) {
  const cols = withL ? ["Qty", "W", "H", "L", "S/L"] : ["Qty", "W", "H"];
  return (
    <table className="w-full border-collapse">
      <thead>
        <tr>
          {cols.map((h, i) => (
            <th
              key={i}
              className="border border-black bg-neutral-200 px-0.5 py-0 text-center text-[5pt] font-bold uppercase"
            >
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {Array.from({ length: rows }).map((_, i) => (
          <tr key={i}>
            {cols.map((_, j) => (
              <td key={j} className="h-[10pt] border border-black p-0" />
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// Two WH tables side-by-side — matches the v1 layout where End Caps,
// Volume Dampers, and Canvas Conn each get a paired pair so a single
// section row holds 8-10 entries instead of 4-5.
function WHTable2Up({ rows }: { rows: number }) {
  return (
    <div className="grid grid-cols-2 gap-0.5">
      <WHTable rows={rows} />
      <WHTable rows={rows} />
    </div>
  );
}

function PlenumBlock() {
  return (
    <div className="space-y-0.5 text-[5.5pt]">
      <CheckLine>
        <span className="font-bold">Small</span> · 18x22x18 · 18x22x24 · 18x22 C.C.
      </CheckLine>
      <CheckLine>
        <span className="font-bold">Large</span> · 24x22x18 · 24x22x24 · 24x22 C.C.
      </CheckLine>
      <CheckLine>
        <span className="font-bold">None</span>
      </CheckLine>
    </div>
  );
}

function CheckLine({ children }: { children: React.ReactNode }) {
  return (
    <label className="flex items-baseline gap-1">
      <span className="mt-px inline-block h-1.5 w-1.5 shrink-0 border border-black" />
      <span className="text-[5.5pt] leading-tight">{children}</span>
    </label>
  );
}

// ---------- Columns ---------------------------------------------------------

function LeftCol() {
  return (
    <div>
      <Section title="Plenum Package">
        <PlenumBlock />
      </Section>
      <Section title="Return Plenum">
        <QtyList items={RETURN_PLENUM_KEYS.map((k) => RETURN_PLENUM_LABELS[k])} />
      </Section>
      <Section title="End Caps">
        <WHTable2Up rows={5} />
      </Section>
      <Section title="Volume Dampers">
        <WHTable2Up rows={5} />
      </Section>
      <Section title="Canvas Conn">
        <WHTable2Up rows={3} />
      </Section>
      <Section title="Custom Duct">
        <WHTable rows={9} withL />
      </Section>
      <Section title="Miscellaneous">
        <WHTable rows={6} />
      </Section>
      <Section title="Straight Boot Boxes">
        <QtyList
          items={[
            ...STRAIGHT_BOOT_BOXES_SIZES,
            ...SIMPSON_STP_KEYS.map((k) => SIMPSON_STP_LABELS[k]),
          ]}
        />
      </Section>
      <Section title="S D / Misc">
        <QtyList
          items={[
            ...SD_MISC_KEYS.map((k) => SD_MISC_LABELS[k]),
            ...SD_MISC_EXTRAS_KEYS.map((k) => SD_MISC_EXTRAS_LABELS[k]),
          ]}
        />
      </Section>
    </div>
  );
}

// Center column hosts the drawing plus the small qty sections above it.
function CenterCol() {
  return (
    <div>
      <Section title="Filter Racks">
        <QtyList items={FILTER_RACKS_KEYS.map((k) => FILTER_RACKS_LABELS[k])} />
      </Section>
      <Section title="Drain Pans">
        <QtyList items={[...DRAIN_PANS_KEYS]} />
      </Section>
      <Section title="Drawing">
        <div className="h-[4.6in] border border-dashed border-neutral-400" />
      </Section>
      <Section title="Fresh Air Dampers">
        <QtyList items={[...FRESH_AIR_DAMPER_SIZES]} />
      </Section>
      <Section title="Gal Redr">
        <QtyList items={[...GAL_REDR_SIZES]} />
      </Section>
    </div>
  );
}

function Duct60Col() {
  return (
    <div>
      <Section title='60" Duct'>
        <QtyList items={DUCT60_SIZES.map(duct60Label)} />
      </Section>
      <Section title="Fans / G-Necks / Roof">
        <QtyList items={FANS_KEYS.map((k) => FANS_LABELS[k])} />
      </Section>
    </div>
  );
}

function OvalCol() {
  return (
    <div>
      <Section title="OV Pipe">
        <QtyList items={OV_PIPE_SIZES.map((s) => `${s}"`)} />
      </Section>
      <Section title="Oval Ells">
        <QtyList items={[...OVAL_ELL_SIZES]} />
      </Section>
      <Section title="Oval to Rnd">
        <QtyList items={[...OVAL_TO_RND_SIZES]} />
      </Section>
      <Section title="Oval S. Heads">
        <QtyList items={[...OVAL_S_HEADS_SIZES]} />
      </Section>
      <Section title="Ell Boots">
        <QtyList items={ELL_BOOTS_SIZES.map(bootLabel)} />
      </Section>
      <Section title="End Boots">
        <QtyList items={END_BOOTS_SIZES.map(bootLabel)} />
      </Section>
      <Section title="STRT Boots">
        <QtyList items={STRT_BOOTS_SIZES.map(bootLabel)} />
      </Section>
      <Section title="TTO">
        <QtyList items={[...TTO_SIZES]} />
      </Section>
      <Section title="Mid Atl. Wall Caps">
        <QtyList items={MID_ATLANTIC_KEYS.map((k) => MID_ATLANTIC_LABELS[k])} />
      </Section>
      <Section title="Bird Cage">
        <QtyList items={BIRD_CAGE_SIZES.map((s) => `${s}"`)} />
      </Section>
      <Section title="Metal / Screen">
        <QtyList items={METAL_SCREEN_KEYS.map((k) => METAL_SCREEN_LABELS[k])} />
      </Section>
      <Section title="Dryer Box">
        <QtyList items={DRYER_BOX_KEYS.map((k) => DRYER_BOX_LABELS[k])} />
      </Section>
    </div>
  );
}

function RightCol() {
  return (
    <div>
      <Section title="RND Pipe">
        <QtyList items={[...RND_PIPE_SIZES]} />
      </Section>
      <Section title="RND Ells">
        <QtyList items={RND_ELL_SIZES.map((s) => `${s}"`)} />
      </Section>
      <Section title="Air Tights">
        <QtyList items={FLEX_SIZES.map((s) => `${s}"`)} />
      </Section>
      <Section title="Saddle Tap">
        <QtyList items={SADDLE_TAP_SIZES.map((s) => `${s}"`)} />
      </Section>
      <Section title="Uninsulated / Insulated Flex (R4 / R8)">
        <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-1 text-[5pt]">
          <div className="font-bold uppercase">Size</div>
          <div className="font-bold uppercase">Un</div>
          <div className="font-bold uppercase">R4</div>
          <div className="font-bold uppercase">R8</div>
          {FLEX_SIZES.map((s) => (
            <FlexRow key={s} size={`${s}"`} />
          ))}
        </div>
      </Section>
      <Section title="B-Vent">
        <QtyList items={B_VENT_KEYS.map((k) => B_VENT_LABELS[k])} />
      </Section>
      <Section title="Flex B-Vent">
        <QtyList items={FLEX_B_VENT_KEYS.map((k) => FLEX_B_VENT_LABELS[k])} />
      </Section>
      <Section title="Blue Flashing">
        <QtyList items={BLUE_FLASHING_KEYS.map((k) => BLUE_FLASHING_LABELS[k])} />
      </Section>
      <Section title="RND Collars / Round Vol Dampers">
        <div className="grid grid-cols-[1fr_auto_auto] gap-x-1 text-[5pt]">
          <div className="font-bold uppercase">Size</div>
          <div className="font-bold uppercase">Col</div>
          <div className="font-bold uppercase">VD</div>
          {RND_SIZES.map((s) => (
            <CollarRow key={s} size={`${s}"`} />
          ))}
        </div>
      </Section>
    </div>
  );
}

function FlexRow({ size }: { size: string }) {
  return (
    <>
      <div className="truncate">{size}</div>
      <span className="h-2 w-4 border border-black" />
      <span className="h-2 w-4 border border-black" />
      <span className="h-2 w-4 border border-black" />
    </>
  );
}

function CollarRow({ size }: { size: string }) {
  return (
    <>
      <div className="truncate">{size}</div>
      <span className="h-2 w-4 border border-black" />
      <span className="h-2 w-4 border border-black" />
    </>
  );
}

// ---------- Bottom strip ----------------------------------------------------

function BottomStrip() {
  return (
    <div
      className="mt-0 grid border border-black border-t-0"
      style={{ gridTemplateColumns: "1fr 1fr 1fr 1fr 1.4fr" }}
    >
      <OpenBox title="Wall Regs" />
      <OpenBox title="Grills" />
      <OpenBox title="Filter Grills" />
      <OpenBox title="Floor Regs" />
      <div className="border-l border-black">
        <div className="border-b border-black px-1 py-px text-[6pt] font-bold uppercase tracking-wide">
          Panning / Cond Regs
        </div>
        <div className="p-0.5">
          <QtyList items={["Panning Metal (36x36)", "Cond Regs (8x6)"]} />
        </div>
      </div>
    </div>
  );
}

function OpenBox({ title }: { title: string }) {
  return (
    <div className="border-l border-black first:border-l-0">
      <div className="border-b border-black px-1 py-px text-[6pt] font-bold uppercase tracking-wide">
        {title}
      </div>
      <div className="h-[0.55in]" />
    </div>
  );
}

// ---------- Footer ----------------------------------------------------------

function Footer() {
  return (
    <footer
      className="mt-0 grid border border-black border-t-0 text-[6pt]"
      style={{ gridTemplateColumns: "1fr 1fr 2fr" }}
    >
      <FootCell title="Cut By" />
      <FootCell title="Date Cut" />
      <FootCell title="Notes" />
    </footer>
  );
}

function FootCell({ title }: { title: string }) {
  return (
    <div className="border-l border-black px-1 py-1 first:border-l-0">
      <div className="text-[5pt] font-bold uppercase tracking-wide text-neutral-700">
        {title}
      </div>
      <div className="mt-2 border-b border-black" />
    </div>
  );
}

export const dynamic = "force-dynamic";
