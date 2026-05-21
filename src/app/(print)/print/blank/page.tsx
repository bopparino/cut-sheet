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
  RND_ELL_SIZES,
  RND_PIPE_SIZES,
  RND_SIZES,
  SADDLE_TAP_SIZES,
  SD_MISC_EXTRAS_KEYS,
  SD_MISC_KEYS,
  SIMPSON_STP_KEYS,
  STRAIGHT_BOOT_BOXES_SIZES,
  TTO_SIZES,
} from "@/lib/schema";

// 11" × 17" Tabloid portrait blank cutsheet pad master.
//
// The previous version overflowed because three families of sections —
// flex (Uninsulated/R4/R8), boots (Ell/End/STRT), and RND fittings
// (Ells/Collars/Vol Dampers) — each had three separate sections with the
// same size lists. This rewrite collapses each into a single multi-column
// table: one size column on the left, multiple qty-box columns to the
// right. That alone saves ~12 vertical inches and turns three previously-
// overflowing columns into balanced ones.
//
// @page locks the paper to Tabloid 11×17 with 0.25in margins so a Cmd-P
// from the browser produces the same output as /api/pdf/blank.

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
      <div className="mx-auto w-[10.5in] bg-white p-0 font-sans text-[8pt] leading-[1.1] text-black">
        <PageHeader />
        <div
          className="grid"
          style={{ gridTemplateColumns: "1.75in 1.75in 1.5in 1.85in 1.85in 1.75in" }}
        >
          <Col1 />
          <Col2 />
          <Col3 />
          <Col4 />
          <Col5 />
          <Col6 />
        </div>
        <BottomStrip />
        <Footer />
      </div>
    </>
  );
}

// ---------- Header -----------------------------------------------------------

function PageHeader() {
  return (
    <header className="border-2 border-black">
      <div className="flex items-center justify-between border-b border-black px-2 py-0.5">
        <span className="text-[13pt] font-bold uppercase tracking-wide">Cut Sheet</span>
        <span className="text-[8pt]">Pad #__________________</span>
      </div>
      <HRow>
        <HF label="Builder" flex={3} />
        <HF label="Date" flex={1.2} />
        <HF label="Delivery Date" flex={1.2} />
        <HF label="Foreman" flex={1.5} />
      </HRow>
      <HRow>
        <HF label="Project" flex={3} />
        <HF label="Project Code" flex={1.3} />
        <HF label="Option" flex={1} />
        <HF label="House Type" flex={1.6} />
      </HRow>
      <HRow last>
        <HF label="Lot" flex={0.8} />
        <HF label="Block" flex={0.8} />
        <HF label="Section" flex={0.8} />
        <HF label="Prop #" flex={1.1} />
        <HF label="Zone" flex={0.8} />
        <HF label="Region (MD/VA/WV)" flex={1.8} />
        <HF label="Eq To (Job/Whs/Hold)" flex={1.8} />
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
      className="flex items-baseline gap-1 border-r border-black px-1.5 py-0.5 last:border-r-0"
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

// Multi-qty-per-row table — one size label on the left, multiple qty boxes
// to the right. Used for the combined Flex (Un/R4/R8), Boots (Ell/End/STRT),
// and RND (Coll/VolDmp) sections.
function MultiQtyTable({
  cols,
  rows,
}: {
  cols: string[];
  rows: string[];
}) {
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

// ---------- Columns ---------------------------------------------------------
//
// Six columns at 1.75 / 1.75 / 1.5 / 1.85 / 1.85 / 1.75 = 10.45in inside the
// 10.5in container. Distributed so the tallest column lands around 10in,
// fitting comfortably inside the 13in main-grid budget (Tabloid 17in tall
// minus 1in header, 2in bottom strip, 0.5in footer, ~0.5in margins).

function Col1() {
  return (
    <div>
      <Section title="Plenum Package">
        <PlenumBlock />
      </Section>
      <Section title="Return Plenum">
        <QtyList items={RETURN_PLENUM_KEYS.map((k) => RETURN_PLENUM_LABELS[k])} />
      </Section>
      <Section title="End Caps">
        <WHTable rows={5} />
      </Section>
      <Section title="Volume Dampers">
        <WHTable rows={5} />
      </Section>
      <Section title="Canvas Conn">
        <WHTable rows={4} />
      </Section>
      <Section title="Custom Duct">
        <WHTable rows={10} withL />
      </Section>
      <Section title="Miscellaneous">
        <WHTable rows={8} />
      </Section>
    </div>
  );
}

function Col2() {
  return (
    <div>
      <Section title="Filter Racks">
        <QtyList items={FILTER_RACKS_KEYS.map((k) => FILTER_RACKS_LABELS[k])} />
      </Section>
      <Section title="Drain Pans">
        <QtyList items={[...DRAIN_PANS_KEYS]} />
      </Section>
      <Section title="Drawing">
        <div className="h-[5.5in] border border-dashed border-neutral-400" />
      </Section>
      <Section title="Panning / Cond Regs">
        <QtyList items={["Panning Metal (36x36)", "Cond Regs (8x6)"]} />
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
        <QtyList items={[...OVAL_ELL_SIZES]} />
      </Section>
      <Section title="Oval to Rnd">
        <QtyList items={[...OVAL_TO_RND_SIZES]} />
      </Section>
      <Section title="Oval S. Heads">
        <QtyList items={[...OVAL_S_HEADS_SIZES]} />
      </Section>
      {/* Boots family combined: Ell, End, STRT all share the same 10 sizes,
          so one table with 10 rows × 3 columns is half the height of three
          separate sections. */}
      <Section title="Boots (Ell / End / STRT)">
        <MultiQtyTable cols={["Ell", "End", "STRT"]} rows={ELL_BOOTS_SIZES.map(bootLabel)} />
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
    </div>
  );
}

function Col5() {
  return (
    <div>
      <Section title="Metal / Screen">
        <QtyList items={METAL_SCREEN_KEYS.map((k) => METAL_SCREEN_LABELS[k])} />
      </Section>
      <Section title="Dryer Box">
        <QtyList items={DRYER_BOX_KEYS.map((k) => DRYER_BOX_LABELS[k])} />
      </Section>
      <Section title="RND Pipe">
        <QtyList items={[...RND_PIPE_SIZES]} />
      </Section>
      {/* RND family combined: Ell, Collar, Volume Damper all use the same 9
          sizes. One table instead of three sections. */}
      <Section title="RND Ells / Collars / Vol Dmprs">
        <MultiQtyTable
          cols={["Ell", "Coll", "VD"]}
          rows={RND_SIZES.map((s) => `${s}"`)}
        />
      </Section>
      <Section title="Air Tights">
        <QtyList items={FLEX_SIZES.map((s) => `${s}"`)} />
      </Section>
      <Section title="Saddle Tap">
        <QtyList items={SADDLE_TAP_SIZES.map((s) => `${s}"`)} />
      </Section>
    </div>
  );
}

function Col6() {
  return (
    <div>
      {/* Flex combined: Uninsulated / R4 / R8 all use the same 9 sizes. */}
      <Section title="Flex (Un / R4 / R8)">
        <MultiQtyTable
          cols={["Un", "R4", "R8"]}
          rows={FLEX_SIZES.map((s) => `${s}"`)}
        />
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
      <Section title="Fresh Air Dampers">
        <QtyList items={[...FRESH_AIR_DAMPER_SIZES]} />
      </Section>
      <Section title="Gal Redr">
        <QtyList items={[...GAL_REDR_SIZES]} />
      </Section>
    </div>
  );
}

// Suppress unused-import warning while keeping the constant in source so the
// section reads consistently if we ever split RND Ells back out.
void RND_ELL_SIZES;

// ---------- Bottom strip ----------------------------------------------------

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
      <div className="h-[1.6in]" />
    </div>
  );
}

// ---------- Footer ----------------------------------------------------------

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

export const dynamic = "force-dynamic";
