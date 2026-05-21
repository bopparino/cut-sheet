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

// Blank pad template rendered at 8.5" × 14" (Legal). Built so the print
// shop can turn it into duplicate-padded sheets — every label that exists
// in the digital cutsheet has a corresponding blank line/box here, plus
// the Drawing section the crews use by hand.

const duct60Label = (s: string) => (s.startsWith("3.25") ? `3 1/4x${s.slice(5)}` : s);
const bootLabel = (s: string) => s.replace("3.25", "3 1/4");

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
  gNeckSilv4: '4" G-N SILV',
  gNeckBlk4: '4" G-N BLK',
  gNeck116_6: '6" G-N 116',
  roofCap634_6: '6" 634 CAP',
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
    <div className="mx-auto w-[8in] bg-white p-0 font-sans text-[7pt] leading-tight text-black">
      <PageHeader />
      <div className="mt-1 grid grid-cols-5 gap-1">
        <Col1 />
        <CenterCol />
        <Duct60Col />
        <OvalCol />
        <RightCol />
      </div>
      <Footer />
    </div>
  );
}

function PageHeader() {
  return (
    <header className="border-2 border-black">
      <div className="grid grid-cols-[1fr_auto] items-center border-b border-black px-1 py-0.5">
        <span className="text-[10pt] font-bold uppercase tracking-wide">Cut Sheet</span>
        <span className="text-[7pt]">Pad #__________</span>
      </div>
      <HeaderRow>
        <HeaderField label="Builder" w="2.5in" />
        <HeaderField label="Date" w="1in" />
        <HeaderField label="Delivery Date" w="1in" />
        <HeaderField label="Foreman" w="1.4in" />
      </HeaderRow>
      <HeaderRow>
        <HeaderField label="Project" w="2.5in" />
        <HeaderField label="Project Code" w="1in" />
        <HeaderField label="Option" w="0.9in" />
        <HeaderField label="House Type" w="1.5in" />
      </HeaderRow>
      <HeaderRow>
        <HeaderField label="Lot" w="0.7in" />
        <HeaderField label="Block" w="0.7in" />
        <HeaderField label="Section" w="0.7in" />
        <HeaderField label="Prop #" w="0.9in" />
        <HeaderField label="Zone" w="0.7in" />
        <HeaderField label="Region (MD/VA/WV)" w="1.2in" />
        <HeaderField label="Eq To (Job/Whs/Hold)" w="1.2in" />
      </HeaderRow>
    </header>
  );
}

function HeaderRow({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-stretch border-b border-black last:border-b-0">
      {children}
    </div>
  );
}

function HeaderField({ label, w }: { label: string; w: string }) {
  return (
    <div className="flex flex-1 items-baseline gap-1 border-r border-black px-1 py-1 last:border-r-0" style={{ minWidth: w }}>
      <span className="shrink-0 text-[6.5pt] font-medium uppercase tracking-wide text-neutral-700">
        {label}
      </span>
      <span className="flex-1 border-b border-black" />
    </div>
  );
}

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
    <div className={`border border-black ${className ?? ""}`}>
      <div className="border-b border-black bg-neutral-100 px-1 py-0.5 text-[7pt] font-bold uppercase tracking-wide">
        {title}
      </div>
      <div className="space-y-0 p-1">{children}</div>
    </div>
  );
}

function QtyRow({ label }: { label: string }) {
  return (
    <div className="flex items-baseline justify-between gap-1 border-b border-dotted border-neutral-400 py-0.5 last:border-b-0">
      <span className="truncate">{label}</span>
      <span className="h-3 w-6 shrink-0 border border-black" />
    </div>
  );
}

function QtyGrid({
  items,
  cols = 1,
}: {
  items: string[];
  cols?: number;
}) {
  return (
    <div className={`grid gap-x-1.5 gap-y-0 ${cols === 2 ? "grid-cols-2" : cols === 3 ? "grid-cols-3" : ""}`}>
      {items.map((label) => (
        <QtyRow key={label} label={label} />
      ))}
    </div>
  );
}

function RowTable({ headers, rows }: { headers: string[]; rows: number }) {
  return (
    <table className="w-full border-collapse">
      <thead>
        <tr>
          {headers.map((h, i) => (
            <th
              key={i}
              className="border border-black bg-neutral-100 px-0.5 py-0 text-center text-[6.5pt] font-bold uppercase"
            >
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {Array.from({ length: rows }).map((_, i) => (
          <tr key={i}>
            {headers.map((_, j) => (
              <td key={j} className="h-3.5 border border-black p-0" />
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function PlenumPackage() {
  return (
    <Section title="Plenum Package">
      <div className="space-y-0.5 text-[7pt]">
        <Checkbox label={<><span className="font-bold">Small</span> · 18x22x18 · 18x22x24 · 18x22 C.C.</>} />
        <Checkbox label={<><span className="font-bold">Large</span> · 24x22x18 · 24x22x24 · 24x22 C.C.</>} />
        <Checkbox label={<span className="font-bold">None</span>} />
      </div>
    </Section>
  );
}

function Checkbox({ label }: { label: React.ReactNode }) {
  return (
    <label className="flex items-baseline gap-1.5">
      <span className="mt-0.5 inline-block h-2.5 w-2.5 shrink-0 border border-black" />
      <span className="text-[7pt]">{label}</span>
    </label>
  );
}

function Col1() {
  return (
    <div className="space-y-1">
      <PlenumPackage />
      <Section title="Return Plenum">
        <QtyGrid items={RETURN_PLENUM_KEYS.map((k) => RETURN_PLENUM_LABELS[k])} />
      </Section>
      <Section title="End Caps">
        <RowTable headers={["Qty", "W", "H"]} rows={5} />
      </Section>
      <Section title="Volume Dampers">
        <RowTable headers={["Qty", "W", "H"]} rows={5} />
      </Section>
      <Section title="Canvas Conn">
        <RowTable headers={["Qty", "W", "H"]} rows={4} />
      </Section>
      <Section title="Custom Duct">
        <RowTable headers={["Qty", "W", "H", "L", "S/L"]} rows={8} />
      </Section>
      <Section title="Miscellaneous">
        <RowTable headers={["Item"]} rows={6} />
      </Section>
      <Section title="Straight Boot Boxes">
        <QtyGrid items={[...STRAIGHT_BOOT_BOXES_SIZES, ...SIMPSON_STP_KEYS.map((k) => SIMPSON_STP_LABELS[k])]} />
      </Section>
      <Section title="S D / Misc">
        <QtyGrid
          items={[
            ...SD_MISC_KEYS.map((k) => SD_MISC_LABELS[k]),
            ...SD_MISC_EXTRAS_KEYS.map((k) => SD_MISC_EXTRAS_LABELS[k]),
          ]}
        />
      </Section>
    </div>
  );
}

function CenterCol() {
  return (
    <div className="space-y-1">
      <Section title="Filter Racks">
        <QtyGrid items={FILTER_RACKS_KEYS.map((k) => FILTER_RACKS_LABELS[k])} />
      </Section>
      <Section title="Drain Pans">
        <QtyGrid items={[...DRAIN_PANS_KEYS]} />
      </Section>
      <Section title="Drawing" className="h-[3.6in]">
        <div className="h-[3.4in] border border-dashed border-neutral-400" />
      </Section>
      <Section title="Wall Regs">
        <RowTable headers={["Item"]} rows={4} />
      </Section>
      <Section title="Grills">
        <RowTable headers={["Item"]} rows={4} />
      </Section>
      <Section title="Filter Grills">
        <RowTable headers={["Item"]} rows={4} />
      </Section>
      <Section title="Floor Regs">
        <RowTable headers={["Item"]} rows={4} />
      </Section>
      <Section title="Panning / Cond Regs">
        <QtyGrid items={["Panning Metal (36x36)", "Cond Regs (8x6)"]} />
      </Section>
    </div>
  );
}

function Duct60Col() {
  return (
    <div className="space-y-1">
      <Section title='60" Duct'>
        <QtyGrid items={DUCT60_SIZES.map(duct60Label)} />
      </Section>
      <Section title="Fans / G-Necks / Roof">
        <QtyGrid items={FANS_KEYS.map((k) => FANS_LABELS[k])} />
      </Section>
    </div>
  );
}

function OvalCol() {
  return (
    <div className="space-y-1">
      <Section title="OV Pipe">
        <QtyGrid items={OV_PIPE_SIZES.map((s) => `${s}"`)} />
      </Section>
      <Section title="Oval Ells">
        <QtyGrid items={[...OVAL_ELL_SIZES]} />
      </Section>
      <Section title="Oval to Rnd">
        <QtyGrid items={[...OVAL_TO_RND_SIZES]} />
      </Section>
      <Section title="Oval S. Heads">
        <QtyGrid items={[...OVAL_S_HEADS_SIZES]} />
      </Section>
      <Section title="Ell Boots">
        <QtyGrid items={ELL_BOOTS_SIZES.map(bootLabel)} />
      </Section>
      <Section title="End Boots">
        <QtyGrid items={END_BOOTS_SIZES.map(bootLabel)} />
      </Section>
      <Section title="STRT Boots">
        <QtyGrid items={STRT_BOOTS_SIZES.map(bootLabel)} />
      </Section>
      <Section title="TTO">
        <QtyGrid items={[...TTO_SIZES]} />
      </Section>
      <Section title="Mid Atl. Wall Caps">
        <QtyGrid items={MID_ATLANTIC_KEYS.map((k) => MID_ATLANTIC_LABELS[k])} />
      </Section>
      <Section title="Bird Cage">
        <QtyGrid items={BIRD_CAGE_SIZES.map((s) => `${s}"`)} />
      </Section>
      <Section title="Metal / Screen">
        <QtyGrid items={METAL_SCREEN_KEYS.map((k) => METAL_SCREEN_LABELS[k])} />
      </Section>
      <Section title="Dryer Box">
        <QtyGrid items={DRYER_BOX_KEYS.map((k) => DRYER_BOX_LABELS[k])} />
      </Section>
    </div>
  );
}

function RightCol() {
  return (
    <div className="space-y-1">
      <Section title="RND Pipe">
        <QtyGrid items={[...RND_PIPE_SIZES]} />
      </Section>
      <Section title="RND Ells">
        <QtyGrid items={RND_ELL_SIZES.map((s) => `${s}"`)} />
      </Section>
      <Section title="Air Tights">
        <QtyGrid items={FLEX_SIZES.map((s) => `${s}"`)} />
      </Section>
      <Section title="Saddle Tap">
        <QtyGrid items={SADDLE_TAP_SIZES.map((s) => `${s}"`)} />
      </Section>
      <Section title="Uninsulated Flex">
        <QtyGrid items={FLEX_SIZES.map((s) => `${s}"`)} />
      </Section>
      <Section title="Insulated Flex R4">
        <QtyGrid items={FLEX_SIZES.map((s) => `${s}"`)} />
      </Section>
      <Section title="Insulated Flex R8">
        <QtyGrid items={FLEX_SIZES.map((s) => `${s}"`)} />
      </Section>
      <Section title="B-Vent">
        <QtyGrid items={B_VENT_KEYS.map((k) => B_VENT_LABELS[k])} />
      </Section>
      <Section title="Flex B-Vent">
        <QtyGrid items={FLEX_B_VENT_KEYS.map((k) => FLEX_B_VENT_LABELS[k])} />
      </Section>
      <Section title="Blue Flashing">
        <QtyGrid items={BLUE_FLASHING_KEYS.map((k) => BLUE_FLASHING_LABELS[k])} />
      </Section>
      <Section title="RND Collars">
        <QtyGrid items={RND_SIZES.map((s) => `${s}"`)} />
      </Section>
      <Section title="Round Volume Dampers">
        <QtyGrid items={RND_SIZES.map((s) => `${s}"`)} />
      </Section>
      <Section title="Fresh Air Dampers">
        <QtyGrid items={[...FRESH_AIR_DAMPER_SIZES]} />
      </Section>
      <Section title="Gal Redr">
        <QtyGrid items={[...GAL_REDR_SIZES]} />
      </Section>
    </div>
  );
}

function Footer() {
  return (
    <footer className="mt-1 grid grid-cols-3 gap-2 border-t border-black pt-1 text-[6.5pt]">
      <div>
        <span className="font-bold uppercase tracking-wide">Cut by</span>
        <div className="border-b border-black pb-3" />
      </div>
      <div>
        <span className="font-bold uppercase tracking-wide">Date Cut</span>
        <div className="border-b border-black pb-3" />
      </div>
      <div>
        <span className="font-bold uppercase tracking-wide">Notes</span>
        <div className="border-b border-black pb-3" />
      </div>
    </footer>
  );
}

export const dynamic = "force-dynamic";
