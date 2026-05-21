import {
  BIRD_CAGE_SIZES,
  BLUE_FLASHING_KEYS,
  B_VENT_KEYS,
  DRAIN_PANS_KEYS,
  DRYER_BOX_KEYS,
  DUCT60_SIZES,
  ELL_BOOTS_SIZES,
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
  RND_PIPE_SIZES,
  RND_SIZES,
  SADDLE_TAP_SIZES,
  SD_MISC_EXTRAS_KEYS,
  SD_MISC_KEYS,
  SIMPSON_STP_KEYS,
  STRAIGHT_BOOT_BOXES_SIZES,
  TTO_SIZES,
} from "@/lib/schema";

// Two-page Tabloid 11x17 pad master:
//   Page 1 — blank cutsheet with header + 6 balanced qty/table columns +
//            anchored bottom strip (Wall/Grills/Filter/Floor Regs).
//   Page 2 — fittings selection grid (4x6 cells, each with SL? + QTY +
//            label + drawing placeholder).
//
// Drawing section is removed from page 1 per direction; the second page
// covers documentation. Metal/Screen sits with the "outside-of-house"
// wall-mounted boxes (Mid Atl Wall Caps, Bird Cage, Dryer Box) since
// they're functionally the same family.

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
    <>
      <style>{`@page { size: 11in 17in; margin: 0.25in; }`}</style>
      <Page1 />
      <div className="break-before-page" />
      <Page2 />
    </>
  );
}

// ============================================================================
// PAGE 1 — Cutsheet
// ============================================================================

function Page1() {
  return (
    <div className="mx-auto flex min-h-[16.5in] w-[10.5in] flex-col bg-white p-0 font-sans text-[8pt] leading-[1.1] text-black">
      <PageHeader />
      <div className="grid grid-cols-6">
        <Col1 />
        <Col2 />
        <Col3 />
        <Col4 />
        <Col5 />
        <Col6 />
      </div>
      <div className="flex-1" aria-hidden />
      <BottomStrip />
      <Footer />
    </div>
  );
}

// ---------- Header (taller field rows for handwriting room) -----------------

function PageHeader() {
  return (
    <header className="border-2 border-black">
      <div className="flex items-center justify-between border-b border-black px-2 py-1">
        <span className="text-[14pt] font-bold uppercase tracking-wide">Cut Sheet</span>
        <span className="text-[9pt]">Pad #_____________________</span>
      </div>
      <HRow>
        <HF label="Builder" flex={4} />
        <HF label="Date" flex={1.3} />
        <HF label="Delivery Date" flex={1.5} />
      </HRow>
      <HRow>
        <HF label="Project" flex={4} />
        <HF label="Project Code" flex={1.5} />
        <HF label="Option" flex={1.3} />
      </HRow>
      <HRow>
        <HF label="House Type" flex={2.2} />
        <HF label="Foreman" flex={1.8} />
        <HF label="Region (MD/VA/WV)" flex={1.7} />
        <HF label="Eq To (Job/Whs/Hold)" flex={1.7} />
      </HRow>
      <HRow last>
        <HF label="Lot" flex={1} />
        <HF label="Block" flex={1} />
        <HF label="Section" flex={1} />
        <HF label="Prop #" flex={1.4} />
        <HF label="Zone" flex={1} />
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

// items-end + tall padding-top gives generous handwriting room above the
// underline. min-h locks the cell height so all rows look uniform.
function HF({ label, flex }: { label: string; flex: number }) {
  return (
    <div
      className="flex min-h-[32pt] items-end gap-1 border-r border-black px-2 pb-1 pt-3 last:border-r-0"
      style={{ flex }}
    >
      <span className="shrink-0 text-[7pt] font-medium uppercase tracking-wide text-neutral-700">
        {label}
      </span>
      <span className="flex-1 border-b border-black" />
    </div>
  );
}

// ---------- Primitives ------------------------------------------------------

function Section({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`border border-black border-t-0 first:border-t ${className ?? ""}`}>
      <div className="border-b border-black px-1.5 py-0.5 text-[8.5pt] font-bold uppercase tracking-wide">
        {title}
      </div>
      <div className="p-0.5">{children}</div>
    </div>
  );
}

function QtyRow({ label }: { label: string }) {
  return (
    <div className="flex items-baseline justify-between gap-1">
      <span className="truncate leading-[1.3]">{label}</span>
      <span className="h-[10pt] w-[18pt] shrink-0 border border-black" />
    </div>
  );
}

function QtyList({ items }: { items: readonly string[] }) {
  return (
    <div className="space-y-px">
      {items.map((label) => (
        <QtyRow key={label} label={label} />
      ))}
    </div>
  );
}

function MultiQtyTable({ cols, rows }: { cols: string[]; rows: string[] }) {
  return (
    <table className="w-full border-collapse">
      <thead>
        <tr>
          <th className="bg-neutral-200 px-0.5 py-0 text-left text-[7pt] font-bold uppercase">
            Size
          </th>
          {cols.map((c, i) => (
            <th
              key={i}
              className="bg-neutral-200 px-0.5 py-0 text-center text-[7pt] font-bold uppercase"
              style={{ width: "20pt" }}
            >
              {c}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((size) => (
          <tr key={size}>
            <td className="px-0.5 py-0 text-[8pt] leading-[1.3]">{size}</td>
            {cols.map((_, i) => (
              <td key={i} className="px-0 py-px">
                <span className="block h-[10pt] w-[18pt] border border-black" />
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
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
              className="border border-black bg-neutral-200 px-1 py-0 text-center text-[7pt] font-bold uppercase"
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
              <td key={j} className="h-[13pt] border border-black p-0" />
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function PlenumBlock() {
  return (
    <div className="space-y-0.5 text-[7.5pt]">
      <CheckLine>
        <span className="font-bold">Small</span>
        <span className="ml-1">· 18x22x18 · 18x22x24 · 18x22 C.C.</span>
      </CheckLine>
      <CheckLine>
        <span className="font-bold">Large</span>
        <span className="ml-1">· 24x22x18 · 24x22x24 · 24x22 C.C.</span>
      </CheckLine>
      <CheckLine>
        <span className="font-bold">None</span>
      </CheckLine>
    </div>
  );
}

function CheckLine({ children }: { children: React.ReactNode }) {
  return (
    <label className="flex items-baseline gap-1.5">
      <span className="mt-px inline-block h-2.5 w-2.5 shrink-0 border border-black" />
      <span className="leading-[1.2]">{children}</span>
    </label>
  );
}

// ---------- Columns (rebalanced, drawing removed) ---------------------------
//
// Equal 6-col grid via Tailwind grid-cols-6 → each col = 10.5in / 6 = 1.75in.
// Right edge of last column lines up perfectly with right edge of container.
// Sections re-grouped so Metal/Screen lives with the other "outside-of-
// house" wall-mounted boxes (Mid Atl, Bird Cage, Dryer Box) in Col 5.

function Col1() {
  return (
    <div>
      <Section title="Plenum Package">
        <PlenumBlock />
      </Section>
      <Section title="Return Plenum">
        <QtyList items={RETURN_PLENUM_KEYS.map((k) => RETURN_PLENUM_LABELS[k])} />
      </Section>
      <Section title="Filter Racks">
        <QtyList items={FILTER_RACKS_KEYS.map((k) => FILTER_RACKS_LABELS[k])} />
      </Section>
      <Section title="Drain Pans">
        <QtyList items={[...DRAIN_PANS_KEYS]} />
      </Section>
      <Section title="Panning / Cond Regs">
        <QtyList items={["Panning Metal (36x36)", "Cond Regs (8x6)"]} />
      </Section>
      <Section title="End Caps">
        <WHTable rows={6} />
      </Section>
      <Section title="Volume Dampers">
        <WHTable rows={6} />
      </Section>
      <Section title="Canvas Conn">
        <WHTable rows={5} />
      </Section>
      <Section title="Gal Redr">
        <QtyList items={[...GAL_REDR_SIZES]} />
      </Section>
    </div>
  );
}

function Col2() {
  return (
    <div>
      <Section title="Custom Duct">
        <WHTable rows={10} withL />
      </Section>
      <Section title="Miscellaneous">
        <WHTable rows={8} />
      </Section>
      <Section title="Straight Boot Boxes">
        <QtyList items={[...STRAIGHT_BOOT_BOXES_SIZES]} />
      </Section>
      <Section title="Simpson STP">
        <QtyList items={SIMPSON_STP_KEYS.map((k) => SIMPSON_STP_LABELS[k])} />
      </Section>
      <Section title="S D / Misc">
        <QtyList
          items={[
            ...SD_MISC_KEYS.map((k) => SD_MISC_LABELS[k]),
            ...SD_MISC_EXTRAS_KEYS.map((k) => SD_MISC_EXTRAS_LABELS[k]),
          ]}
        />
      </Section>
      <Section title="Fresh Air Dampers">
        <QtyList items={[...FRESH_AIR_DAMPER_SIZES]} />
      </Section>
    </div>
  );
}

function Col3() {
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

function Col4() {
  return (
    <div>
      <Section title="OV Pipe">
        <QtyList items={OV_PIPE_SIZES.map((s) => `${s}"`)} />
      </Section>
      <Section title="Oval Ells">
        <QtyList items={OVAL_ELL_SIZES.map((s) => s.replace("F", '" F'))} />
      </Section>
      <Section title="Oval to Rnd">
        <QtyList items={[...OVAL_TO_RND_SIZES]} />
      </Section>
      <Section title="Oval S. Heads">
        <QtyList items={[...OVAL_S_HEADS_SIZES]} />
      </Section>
      {/* Boots family combined: Ell, End, STRT share the same 10 sizes. */}
      <Section title="Boots (Ell / End / STRT)">
        <MultiQtyTable
          cols={["Ell", "End", "STRT"]}
          rows={ELL_BOOTS_SIZES.map(bootLabel)}
        />
      </Section>
      <Section title="TTO">
        <QtyList items={[...TTO_SIZES]} />
      </Section>
    </div>
  );
}

// Col 5: the "outside-of-house" wall-mounted box family is grouped together
// at the top — Mid Atl Wall Caps, Bird Cage, Metal/Screen, Dryer Box —
// followed by RND stock. Matches the shop's mental model of these items.
function Col5() {
  return (
    <div>
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
      <Section title="RND Pipe">
        <QtyList items={[...RND_PIPE_SIZES]} />
      </Section>
      <Section title="RND Ells / Collars / Vol Dmprs">
        <MultiQtyTable cols={["Ell", "Coll", "VD"]} rows={RND_SIZES.map((s) => `${s}"`)} />
      </Section>
    </div>
  );
}

function Col6() {
  return (
    <div>
      <Section title="Air Tights">
        <QtyList items={FLEX_SIZES.map((s) => `${s}"`)} />
      </Section>
      <Section title="Saddle Tap">
        <QtyList items={SADDLE_TAP_SIZES.map((s) => `${s}"`)} />
      </Section>
      <Section title="Flex (Un / R4 / R8)">
        <MultiQtyTable cols={["Un", "R4", "R8"]} rows={FLEX_SIZES.map((s) => `${s}"`)} />
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
    </div>
  );
}

// ---------- Bottom strip + footer (anchored to page bottom) -----------------

function BottomStrip() {
  return (
    <div className="grid grid-cols-4 border border-black border-t-0">
      <OpenBox title="Wall Regs" />
      <OpenBox title="Grills" />
      <OpenBox title="Filter Grills" />
      <OpenBox title="Floor Regs" />
    </div>
  );
}

function OpenBox({ title }: { title: string }) {
  return (
    <div className="border-l border-black first:border-l-0">
      <div className="border-b border-black px-1.5 py-0.5 text-[9pt] font-bold uppercase tracking-wide">
        {title}
      </div>
      <div className="h-[2.2in]" />
    </div>
  );
}

function Footer() {
  return (
    <footer
      className="grid border border-black border-t-0 text-[8pt]"
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
    <div className="border-l border-black px-2 py-1.5 first:border-l-0">
      <div className="text-[7pt] font-bold uppercase tracking-wide text-neutral-700">
        {title}
      </div>
      <div className="mt-2 border-b border-black" />
    </div>
  );
}

// ============================================================================
// PAGE 2 — Fittings selection grid
// ============================================================================
//
// 4-col × 6-row grid of fitting cells. Each cell has:
//   - SL? toggle (small N / Y boxes) at top-left
//   - QTY field with a small box at top-right
//   - A dashed drawing area in the middle (placeholder for the fitting
//     illustration — the shop's existing fittings template artwork goes
//     here when sent to the print company)
//   - A label slot at the bottom for the fitting name
//
// The cell list below is intentionally generic ("Fitting 01", "Fitting 02"…)
// until the shop confirms the exact set of fittings to include and provides
// each illustration. Renaming any cell is a one-line edit below.

// All 27 fittings from the shop's existing pad template, ordered to match
// the v1 sheet row-by-row so crews can pattern-match against their muscle
// memory. Each entry is rendered with a small SVG approximating the
// fitting's geometry; the goal is recognition at a glance, not pixel-
// perfect artwork.

type FittingCell = {
  Drawing: React.ComponentType;
  label: string;
  // SL? options visible on the printed cell. "both" prints two checkboxes
  // (N and Y); "N" or "Y" prints just that one. Defaults to "both".
  sl?: "N" | "Y" | "both";
};

function FSvg({ children }: { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 100 60"
      className="h-full w-full"
      preserveAspectRatio="xMidYMid meet"
      stroke="black"
      fill="none"
      strokeWidth={2}
      strokeLinejoin="round"
      strokeLinecap="round"
    >
      {children}
    </svg>
  );
}

function FLabel({ x, y, text, size = 8 }: { x: number; y: number; text: string; size?: number }) {
  return (
    <text
      x={x}
      y={y}
      textAnchor="middle"
      fontSize={size}
      fontWeight="bold"
      fill="black"
      stroke="none"
    >
      {text}
    </text>
  );
}

// Row 1 ----------------------------------------------------------------------
function DamperBoxTop() {
  return (
    <FSvg>
      <polygon points="30,12 70,12 78,42 22,42" />
      <line x1="25" y1="27" x2="75" y2="27" />
      <FLabel x={50} y={37} text="DB" size={10} />
    </FSvg>
  );
}
function RightAngleBend() {
  return (
    <FSvg>
      <path d="M 22 14 L 78 14 L 78 50 L 38 50 L 38 28 L 22 28 Z" />
      <FLabel x={31} y={42} text="4" />
      <FLabel x={58} y={56} text="2" />
    </FSvg>
  );
}
function PentagonOffset() {
  return (
    <FSvg>
      <polygon points="22,46 38,18 70,30 78,46" />
      <FLabel x={36} y={32} text="4" />
      <FLabel x={56} y={56} text="2" />
    </FSvg>
  );
}
function CASBox() {
  return (
    <FSvg>
      <rect x={32} y={14} width={36} height={32} />
      <FLabel x={50} y={36} text="CAS" size={11} />
    </FSvg>
  );
}
function CASBoxLCut() {
  return (
    <FSvg>
      <path d="M 28 14 L 68 14 L 68 22 L 74 22 L 74 38 L 68 38 L 68 46 L 28 46 Z" />
      <FLabel x={48} y={34} text="CAS" size={11} />
    </FSvg>
  );
}

// Row 2 ----------------------------------------------------------------------
function DamperBoxTriangle() {
  return (
    <FSvg>
      <polygon points="50,10 25,44 75,44" />
      <FLabel x={50} y={38} text="DB" size={10} />
    </FSvg>
  );
}
function GableThreePeak() {
  return (
    <FSvg>
      {/* Twin peaks with central V notch */}
      <path d="M 14 46 L 14 30 L 30 18 L 42 30 L 50 24 L 58 30 L 70 18 L 86 30 L 86 46 Z" />
      <FLabel x={26} y={42} text="4" />
      <FLabel x={74} y={42} text="4" />
    </FSvg>
  );
}
function TrapezoidOffset() {
  return (
    <FSvg>
      <polygon points="22,18 70,18 78,46 22,46" />
    </FSvg>
  );
}
function RoundDiffuser() {
  return (
    <FSvg>
      <ellipse cx={50} cy={26} rx={28} ry={6} />
      <path d="M 22 26 L 30 50 L 70 50 L 78 26" />
      {/* Radial spokes suggesting a diffuser */}
      <line x1={30} y1={50} x2={42} y2={28} />
      <line x1={50} y1={50} x2={50} y2={28} />
      <line x1={70} y1={50} x2={58} y2={28} />
    </FSvg>
  );
}
function TransferGrill() {
  return (
    <FSvg>
      <rect x={20} y={18} width={22} height={28} />
      <rect x={62} y={18} width={22} height={28} />
      <FLabel x={53} y={34} text="3.5" size={9} />
      <text
        x={50}
        y={56}
        textAnchor="middle"
        fontSize={7}
        fontWeight="normal"
        fill="black"
        stroke="none"
      >
        Transfer Grill
      </text>
    </FSvg>
  );
}

// Row 3 ----------------------------------------------------------------------
function VolumeDamper() {
  return (
    <FSvg>
      <circle cx={50} cy={28} r={18} />
      <line x1={68} y1={28} x2={82} y2={20} />
      <circle cx={82} cy={20} r={2} fill="black" />
      <FLabel x={50} y={32} text="V D" size={9} />
    </FSvg>
  );
}
function ZigzagTransition() {
  return (
    <FSvg>
      <path d="M 18 18 L 50 18 L 50 30 L 82 30 L 82 46 L 50 46 L 50 34 L 18 34 Z" />
    </FSvg>
  );
}
function SteppedOffsetThreeHalf() {
  return (
    <FSvg>
      <path d="M 18 30 L 60 30 L 60 18 L 82 18 L 82 46" />
      <FLabel x={70} y={14} text="3-½" size={7} />
      <FLabel x={88} y={42} text="2" />
    </FSvg>
  );
}
function PortalHalf() {
  return (
    <FSvg>
      <path d="M 22 50 L 22 22 L 78 22 L 78 46" />
      <line x1={78} y1={46} x2={84} y2={52} />
      <FLabel x={88} y={36} text="½" size={7} />
    </FSvg>
  );
}
function LongCurve() {
  return (
    <FSvg>
      <path d="M 14 46 Q 50 8 86 46" />
    </FSvg>
  );
}

// Row 4 ----------------------------------------------------------------------
function EndCapPair() {
  return (
    <FSvg>
      <rect x={26} y={18} width={48} height={4} />
      <rect x={30} y={40} width={40} height={4} />
    </FSvg>
  );
}
function OpenSquare() {
  return (
    <FSvg>
      <rect x={30} y={14} width={40} height={36} />
    </FSvg>
  );
}
function StepNotchBox() {
  return (
    <FSvg>
      <path d="M 22 50 L 22 22 L 36 22 L 36 14 L 64 14 L 64 22 L 78 22 L 78 50 Z" />
    </FSvg>
  );
}
function VNotchBox() {
  return (
    <FSvg>
      <path d="M 28 50 L 28 18 L 42 18 L 50 28 L 58 18 L 72 18 L 72 50 Z" />
    </FSvg>
  );
}
function BentHalf() {
  return (
    <FSvg>
      <path d="M 18 16 L 60 16 L 60 38 L 80 38 L 80 50" />
      <FLabel x={88} y={26} text="½" size={7} />
    </FSvg>
  );
}

// Row 5 ----------------------------------------------------------------------
function CustomLBox() {
  return (
    <FSvg>
      <path d="M 18 12 L 52 12 L 52 30 L 82 30 L 82 50 L 18 50 Z" />
      <FLabel x={28} y={20} text="4" size={6} />
      <FLabel x={48} y={25} text="18" size={6} />
      <FLabel x={64} y={28} text="22" size={6} />
      <FLabel x={84} y={42} text="10" size={6} />
      <FLabel x={50} y={58} text="26 W" size={6} />
    </FSvg>
  );
}
function HookedBox() {
  return (
    <FSvg>
      <rect x={26} y={22} width={48} height={28} />
      <circle cx={32} cy={18} r={4} />
      <circle cx={68} cy={18} r={4} />
    </FSvg>
  );
}
function TrapezoidC() {
  return (
    <FSvg>
      <polygon points="28,46 36,18 64,18 72,46" />
      <line x1={50} y1={18} x2={50} y2={46} strokeDasharray="3 2" />
      <FLabel x={54} y={36} text="₵" size={9} />
    </FSvg>
  );
}
function CubeBox() {
  return (
    <FSvg>
      <rect x={22} y={22} width={50} height={26} />
      <line x1={22} y1={22} x2={32} y2={12} />
      <line x1={72} y1={22} x2={82} y2={12} />
      <line x1={72} y1={48} x2={82} y2={38} />
      <line x1={32} y1={12} x2={82} y2={12} />
      <line x1={82} y1={12} x2={82} y2={38} />
    </FSvg>
  );
}
function WideTrapezoidC() {
  return (
    <FSvg>
      <polygon points="14,46 34,18 66,18 86,46" />
      <line x1={50} y1={18} x2={50} y2={46} strokeDasharray="3 2" />
      <FLabel x={54} y={36} text="₵" size={9} />
    </FSvg>
  );
}

// Row 6 ----------------------------------------------------------------------
function SquareWithDiagonal() {
  return (
    <FSvg>
      <rect x={26} y={14} width={48} height={36} />
      <line x1={64} y1={14} x2={74} y2={26} />
    </FSvg>
  );
}
function AngledBars() {
  return (
    <FSvg>
      <line x1={20} y1={48} x2={48} y2={14} />
      <line x1={52} y1={14} x2={80} y2={48} />
    </FSvg>
  );
}

const FITTING_CELLS: FittingCell[] = [
  // Row 1
  { Drawing: DamperBoxTop, label: "Damper Box (DB)", sl: "both" },
  { Drawing: RightAngleBend, label: "Right-Angle Bend", sl: "N" },
  { Drawing: PentagonOffset, label: "Pentagon Offset", sl: "N" },
  { Drawing: CASBox, label: "Stock CAS", sl: "both" },
  { Drawing: CASBoxLCut, label: "Stock CAS L-Cut", sl: "Y" },
  // Row 2
  { Drawing: DamperBoxTriangle, label: "DB Triangle" },
  { Drawing: GableThreePeak, label: "Gable / 3-Peak", sl: "N" },
  { Drawing: TrapezoidOffset, label: "Trapezoid Offset", sl: "N" },
  { Drawing: RoundDiffuser, label: "Round Diffuser", sl: "N" },
  { Drawing: TransferGrill, label: "Transfer Grill", sl: "N" },
  // Row 3
  { Drawing: VolumeDamper, label: "Volume Damper (VD)" },
  { Drawing: ZigzagTransition, label: "Zigzag Transition", sl: "N" },
  { Drawing: SteppedOffsetThreeHalf, label: "Stepped Offset", sl: "N" },
  { Drawing: PortalHalf, label: "Portal (½)", sl: "N" },
  { Drawing: LongCurve, label: "Long Curve", sl: "N" },
  // Row 4
  { Drawing: EndCapPair, label: "End Caps", sl: "both" },
  { Drawing: OpenSquare, label: "Open Square", sl: "both" },
  { Drawing: StepNotchBox, label: "Step-Notch Box", sl: "N" },
  { Drawing: VNotchBox, label: "V-Notch Box", sl: "N" },
  { Drawing: BentHalf, label: "Bent (½)", sl: "both" },
  // Row 5
  { Drawing: CustomLBox, label: "Custom L Box" },
  { Drawing: HookedBox, label: "Hooked Box", sl: "N" },
  { Drawing: TrapezoidC, label: "Trapezoid (₵)", sl: "N" },
  { Drawing: CubeBox, label: "Cube Box", sl: "N" },
  { Drawing: WideTrapezoidC, label: "Wide Trapezoid (₵)", sl: "N" },
  // Row 6 (2 fittings + 1 write-in)
  { Drawing: SquareWithDiagonal, label: "Square w/ Diagonal", sl: "N" },
  { Drawing: AngledBars, label: "Angled Bars", sl: "N" },
];

function Page2() {
  // 27 fittings rendered in a 4-col grid → 7 rows with the last row holding
  // 3 fittings + 1 blank "write-in" cell. min-h locks the page to Tabloid
  // content height so the footer sticks to the page edge.
  return (
    <div className="mx-auto flex min-h-[16.5in] w-[10.5in] flex-col bg-white p-0 font-sans text-[8pt] leading-[1.1] text-black">
      <Page2Header />
      <div className="grid flex-1 grid-cols-4">
        {FITTING_CELLS.map((cell, i) => (
          <FittingTile key={i} cell={cell} />
        ))}
        {/* One blank write-in cell so crews can flag a custom fitting that
            isn't on the standard sheet. */}
        <WriteInTile />
      </div>
      <Page2Footer />
    </div>
  );
}

function WriteInTile() {
  return (
    <div className="flex flex-col border border-black border-l-0 border-t-0 first:border-l">
      <div className="flex items-center justify-between gap-1 border-b border-black px-1.5 py-0.5">
        <SLToggle mode="both" />
        <div className="flex items-baseline gap-1 text-[7.5pt] font-medium uppercase tracking-wide">
          <span>Qty</span>
          <span className="inline-block h-[10pt] w-[24pt] border border-black" />
        </div>
      </div>
      <div className="flex flex-1 items-center justify-center p-1">
        <div className="flex h-full min-h-[1.3in] w-full items-center justify-center border border-dashed border-neutral-400 text-[7pt] uppercase tracking-wide text-neutral-400">
          custom — sketch + describe
        </div>
      </div>
      <div className="border-t border-black bg-neutral-100 px-1.5 py-0.5 text-center text-[8pt] font-medium">
        Other / Write-In
      </div>
    </div>
  );
}

function Page2Header() {
  return (
    <header className="border-2 border-black">
      <div className="flex items-center justify-between px-2 py-1">
        <span className="text-[14pt] font-bold uppercase tracking-wide">Fittings</span>
        <span className="text-[8pt]">Cutsheet Pad #_____________________</span>
      </div>
    </header>
  );
}

function FittingTile({ cell }: { cell: FittingCell }) {
  const sl = cell.sl ?? "both";
  const { Drawing } = cell;
  return (
    <div className="flex flex-col border border-black border-l-0 border-t-0 first:border-l">
      <div className="flex items-center justify-between gap-1 border-b border-black px-1.5 py-0.5">
        <SLToggle mode={sl} />
        <div className="flex items-baseline gap-1 text-[7.5pt] font-medium uppercase tracking-wide">
          <span>Qty</span>
          <span className="inline-block h-[10pt] w-[24pt] border border-black" />
        </div>
      </div>
      <div className="flex flex-1 items-center justify-center p-2">
        <div className="h-full min-h-[1.3in] w-full">
          <Drawing />
        </div>
      </div>
      <div className="border-t border-black bg-neutral-100 px-1.5 py-0.5 text-center text-[8pt] font-medium">
        {cell.label}
      </div>
    </div>
  );
}

function SLToggle({ mode }: { mode: "N" | "Y" | "both" }) {
  const showN = mode === "N" || mode === "both";
  const showY = mode === "Y" || mode === "both";
  return (
    <div className="flex items-center gap-1.5 text-[7.5pt] font-medium uppercase tracking-wide">
      <span>SL?</span>
      {showN && (
        <label className="flex items-center gap-0.5">
          <span className="inline-block h-2 w-2 border border-black" />
          <span>N</span>
        </label>
      )}
      {showY && (
        <label className="flex items-center gap-0.5">
          <span className="inline-block h-2 w-2 border border-black" />
          <span>Y</span>
        </label>
      )}
    </div>
  );
}

function Page2Footer() {
  return (
    <footer
      className="grid border border-black border-t-0 text-[8pt]"
      style={{ gridTemplateColumns: "1fr 1fr 2fr" }}
    >
      <FootCell title="Builder / Lot" />
      <FootCell title="Date" />
      <FootCell title="Notes" />
    </footer>
  );
}

export const dynamic = "force-dynamic";
