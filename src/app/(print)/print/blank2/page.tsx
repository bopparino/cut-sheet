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
  OVAL_ELL_SIZES,
  OVAL_S_HEADS_SIZES,
  OVAL_TO_RND_SIZES,
  OV_PIPE_SIZES,
  RND_PIPE_SIZES,
  RND_SIZES,
  SADDLE_TAP_SIZES,
  SIMPSON_STP_KEYS,
  STRAIGHT_BOOT_BOXES_SIZES,
} from "@/lib/schema";

// Two-page Tabloid 11x17 pad master — "blank2" revision.
//
// Same item set as /print/blank, re-organized to match the shop's updated
// paper layout:
//   Page 1 — "Shop Cut Sheet": the duct/box items the shop fabricates
//            (60" duct, custom/W-H tables, coll/VD, boot boxes, racks, pans)
//            over a 6x3 grid of blank fitting boxes.
//   Page 2 — "Cut Sheet": fittings/pipe/flex/registers, then the open
//            Wall/Grills/Filter/Floor Regs strip.
//
// This page reuses the same primitives as /print/blank rather than sharing a
// module: print fidelity is fragile and the original page is in production, so
// blank2 stays self-contained — a tweak here can never regress the live form.

const duct60Label = (s: string) => (s.startsWith("3.25") ? `3¼x${s.slice(5)}` : s);
const bootLabel = (s: string) => s.replace("3.25", "3¼");

const SIMPSON_STP_LABELS: Record<(typeof SIMPSON_STP_KEYS)[number], string> = {
  stp18: 'Simpson STP 18"',
  stp24: 'Simpson STP 24"',
};
const FILTER_RACKS_LABELS: Record<(typeof FILTER_RACKS_KEYS)[number], string> = {
  "16x25": "16x25",
  "20x25": "20x25",
  lBox: "L-Box",
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

export default function Blank2PrintPage() {
  return (
    <>
      <style>{`@page { size: 11in 17in; margin: 0.25in; }`}</style>
      <ShopPage />
      <div className="break-before-page" />
      <CutPage />
    </>
  );
}

// ============================================================================
// Shared header + primitives (kept in sync with /print/blank)
// ============================================================================

function PageHeader({ title }: { title: string }) {
  return (
    <header className="border-2 border-black">
      <div className="flex items-center justify-between border-b border-black px-2 py-1">
        <span className="text-[14pt] font-bold uppercase tracking-wide">{title}</span>
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

// `ruled` draws a light gray rule under each row — used on tall, sparse lists
// (60" Duct) so the column reads as ledger lines instead of empty white space.
function QtyRow({ label, ruled }: { label: string; ruled?: boolean }) {
  return (
    <div
      className={`flex items-baseline justify-between gap-1 ${ruled ? "border-b border-neutral-300 pb-0.5" : ""}`}
    >
      <span className="truncate leading-[1.3]">{label}</span>
      <span className="h-[10pt] w-[18pt] shrink-0 border border-black" />
    </div>
  );
}

function QtyList({ items, ruled }: { items: readonly string[]; ruled?: boolean }) {
  return (
    <div className={ruled ? "space-y-1" : "space-y-px"}>
      {items.map((label) => (
        <QtyRow key={label} label={label} ruled={ruled} />
      ))}
    </div>
  );
}

function MultiQtyTable({
  cols,
  rows,
  // Returns true for a (column, size) cell that should be filled black —
  // i.e. a size the shop never orders in that variant, so there's no box to
  // write a quantity in. Used by Flex R4 (only 4/6/8 are stocked).
  blackout,
}: {
  cols: string[];
  rows: string[];
  blackout?: (col: string, size: string) => boolean;
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
            {cols.map((col, i) => (
              <td key={i} className="px-0 py-px">
                <span
                  className={`block h-[10pt] w-[18pt] border border-black ${
                    blackout?.(col, size) ? "bg-black" : ""
                  }`}
                />
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
// PAGE 1 — Shop Cut Sheet
// ============================================================================

function ShopPage() {
  return (
    <div className="mx-auto flex min-h-[16.5in] w-[10.5in] flex-col bg-white p-0 font-sans text-[8pt] leading-[1.1] text-black">
      <PageHeader title="Shop Cut Sheet" />
      <div className="grid grid-cols-4">
        <div>
          <Section title='60" Duct'>
            <QtyList items={DUCT60_SIZES.map(duct60Label)} ruled />
          </Section>
          <Section title="S D / Misc">
            <QtyList items={['24" Drive', '26" Slips', "Mastic", "Brushes"]} />
          </Section>
        </div>
        <div>
          <Section title="Custom Duct">
            <WHTable rows={12} withL />
          </Section>
          <Section title="Miscellaneous">
            <WHTable rows={7} />
          </Section>
          <Section title="Canvas Conn">
            <WHTable rows={5} />
          </Section>
        </div>
        <div>
          <Section title="End Caps">
            <WHTable rows={7} />
          </Section>
          <Section title="Volume Dampers">
            <WHTable rows={5} />
          </Section>
          <Section title="Round Coll / Round Vol Damp">
            <MultiQtyTable cols={["Coll", "VD"]} rows={RND_SIZES.map((s) => `${s}"`)} />
          </Section>
        </div>
        <div>
          <Section title="Straight Boot Boxes">
            <QtyList items={[...STRAIGHT_BOOT_BOXES_SIZES]} />
          </Section>
          <Section title="Simpson STP">
            <QtyList items={SIMPSON_STP_KEYS.map((k) => SIMPSON_STP_LABELS[k])} />
          </Section>
          <Section title="Filter Racks">
            <QtyList items={FILTER_RACKS_KEYS.map((k) => FILTER_RACKS_LABELS[k])} />
          </Section>
          <Section title="Drain Pans">
            <QtyList items={[...DRAIN_PANS_KEYS]} />
          </Section>
          <Section title="Panning">
            <QtyList items={["Panning Metal (36x36)"]} />
          </Section>
          <Section title="Furnace Feet">
            <QtyList items={["Furnace Feet"]} />
          </Section>
        </div>
      </div>
      <div className="grid flex-1 grid-cols-6 grid-rows-3 border-l border-t border-black">
        {Array.from({ length: SHOP_FITTING_BOX_COUNT }).map((_, i) => (
          <FittingBox key={i} />
        ))}
      </div>
      <Footer />
    </div>
  );
}

// 6 across × 3 down blank fitting boxes anchored to the bottom of page 1.
const SHOP_FITTING_BOX_COUNT = 18;

function FittingBox() {
  return (
    <div className="flex flex-col border border-l-0 border-t-0 border-black">
      <div className="flex items-center justify-between gap-1 border-b border-black px-1 py-0.5">
        <div className="flex items-center gap-1 text-[7pt] font-medium uppercase tracking-wide">
          <span>SL?</span>
          <label className="flex items-center gap-0.5">
            <span className="inline-block h-2 w-2 border border-black" />
            <span>N</span>
          </label>
          <label className="flex items-center gap-0.5">
            <span className="inline-block h-2 w-2 border border-black" />
            <span>Y</span>
          </label>
        </div>
        <div className="flex items-baseline gap-1 text-[7pt] font-medium uppercase tracking-wide">
          <span>Qty</span>
          <span className="inline-block h-[10pt] w-[20pt] border border-black" />
        </div>
      </div>
      <div className="flex-1" />
    </div>
  );
}

// ============================================================================
// PAGE 2 — Cut Sheet
// ============================================================================

function CutPage() {
  return (
    <div className="mx-auto flex min-h-[16.5in] w-[10.5in] flex-col bg-white p-0 font-sans text-[8pt] leading-[1.1] text-black">
      <PageHeader title="Cut Sheet" />
      <div className="grid grid-cols-4">
        <div>
          <Section title="Plenum Package">
            <PlenumBlock />
          </Section>
          <Section title="Return Plenum">
            <QtyList items={["14x24 S.L.", "18x24 S.L."]} />
          </Section>
          <Section title="Dryer Box">
            <QtyList items={DRYER_BOX_KEYS.map((k) => DRYER_BOX_LABELS[k])} />
          </Section>
          {/* Size rows + Metal / Screen variant boxes, matching Metal / Screen
              below — replaces the four "4\" Metal / 6\" Metal / …" rows. */}
          <Section title="Mid Atl. Wall Caps">
            <MultiQtyTable cols={["Metal", "Screen"]} rows={['4"', '6"']} />
          </Section>
          <Section title="Bird Cage">
            <QtyList items={BIRD_CAGE_SIZES.map((s) => `${s}"`)} />
          </Section>
          {/* One row per size with Metal / Screen variant boxes to the right
              (like Boots / Flex), instead of eight separate metal-or-screen
              rows. */}
          <Section title="Metal / Screen">
            <MultiQtyTable cols={["Metal", "Screen"]} rows={['6"', '8"', '10"', "10x3¼"]} />
          </Section>
        </div>
        <div>
          <Section title="Elbows">
            <MultiQtyTable cols={["Qty"]} rows={RND_SIZES.map((s) => `${s}"`)} />
          </Section>
          <Section title="Boots (Ell / End / Strt)">
            <MultiQtyTable cols={["Ell", "End", "Strt"]} rows={ELL_BOOTS_SIZES.map(bootLabel)} />
          </Section>
          <Section title="Air Tights">
            <QtyList items={FLEX_SIZES.map((s) => `${s}"`)} />
          </Section>
          <Section title="Saddle Tap">
            <QtyList items={SADDLE_TAP_SIZES.map((s) => `${s}"`)} />
          </Section>
          <Section title="Blue Flashing">
            <QtyList items={BLUE_FLASHING_KEYS.map((k) => BLUE_FLASHING_LABELS[k])} />
          </Section>
          <Section title="Con Regs">
            <QtyList items={["8x6"]} />
          </Section>
        </div>
        <div>
          <Section title="Flex (Un / R4 / R8)">
            {/* R4 is only stocked in 4"/6"/8" — every other size is blacked
                out so no one writes a quantity the shop can't fill. */}
            <MultiQtyTable
              cols={["Un", "R4", "R8"]}
              rows={FLEX_SIZES.map((s) => `${s}"`)}
              blackout={(col, size) =>
                col === "R4" && !['4"', '6"', '8"'].includes(size)
              }
            />
          </Section>
          {/* Two loose insulation items share one box — no dedicated
              single-item header each, but they stay on the Cut Sheet. */}
          <Section title="Foil Ins / Bubble Wrap">
            <QtyList items={["Foil Ins", "Bubble Wrap"]} />
          </Section>
          <Section title="Fans / G-Necks / Roof">
            <QtyList items={FANS_KEYS.map((k) => FANS_LABELS[k])} />
          </Section>
          <Section title="Fresh Air Dampers">
            <QtyList items={[...FRESH_AIR_DAMPER_SIZES]} />
          </Section>
          <Section title="Gal Redr">
            <QtyList items={[...GAL_REDR_SIZES]} />
          </Section>
        </div>
        <div>
          <Section title="RND Pipe">
            <QtyList items={[...RND_PIPE_SIZES]} />
          </Section>
          <Section title="OV Pipe">
            <QtyList items={OV_PIPE_SIZES.map((s) => `${s}"`)} />
          </Section>
          <Section title="Oval S. Heads">
            <QtyList items={[...OVAL_S_HEADS_SIZES]} />
          </Section>
          <Section title="Oval to Rnd">
            <QtyList items={[...OVAL_TO_RND_SIZES]} />
          </Section>
          <Section title="Oval Ells">
            <QtyList items={OVAL_ELL_SIZES.map((s) => s.replace("F", '" F'))} />
          </Section>
          <Section title="B-Vent">
            <QtyList items={B_VENT_KEYS.map((k) => B_VENT_LABELS[k])} />
          </Section>
          <Section title="Flex B-Vent">
            <QtyList items={FLEX_B_VENT_KEYS.map((k) => FLEX_B_VENT_LABELS[k])} />
          </Section>
        </div>
      </div>
      <div className="flex-1" aria-hidden />
      <BottomStrip />
      <Footer />
    </div>
  );
}

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

export const dynamic = "force-dynamic";
