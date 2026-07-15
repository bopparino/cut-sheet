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
  RND_ELL_SIZES,
  RND_PIPE_SIZES,
  RND_SIZES,
  SADDLE_TAP_SIZES,
  SIMPSON_STP_KEYS,
  STRAIGHT_BOOT_BOXES_SIZES,
  type Cutsheet,
} from "@/lib/schema";
import { LegalScalePage, LEGAL_PAGE_CSS } from "@/components/cutsheet/replica/LegalScalePage";

// Digitally-filled version of the new cut sheet. Mirrors /print/blank2's print
// layout box-for-box (same 11x17 sizing, borders, columns) but each box shows
// the saved value instead of being empty - so the filled PDF prints identically
// to the approved blank master, just populated. Rendered by /print/filled/[id]
// and turned into a PDF by /api/pdf/[id]/filled.

const duct60Label = (s: string) => (s.startsWith("3.25") ? `3¼x${s.slice(5)}` : s);
const bootLabel = (s: string) => s.replace("3.25", "3¼");
const num = (n: number) => (n > 0 ? String(n) : "");

const SD_MISC_LABELS = { drive24: '24" Drive', slips26: '26" Slips', mastic: "Mastic", brushes: "Brushes" } as const;
const FILTER_RACKS_LABELS = { "16x25": "16x25", "20x25": "20x25", lBox: "L-Box" } as const;
const SIMPSON_STP_LABELS = { stp18: 'Simpson STP 18"', stp24: 'Simpson STP 24"' } as const;
const DRYER_BOX_LABELS = { metal6: '6" Metal', plastic6: '6" Plastic' } as const;
const BLUE_FLASHING_LABELS = { p400: 'P400 (4")', p600: "P600", p800: "P800", p1000: "P1000" } as const;
const FANS_LABELS: Record<(typeof FANS_KEYS)[number], string> = {
  AE80_4: 'AE 80 4" FAN', "744": "744 FAN", SLM70: "SLM 70 FAN", SIG80_110: "SIG 80-110 FAN",
  PTE511: "PTE 511 FAN", PTEL511: "PTEL 511 FAN", gNeckSilv4: '4" G-NECK SILV', gNeckBlk4: '4" G-NECK BLK',
  gNeck116_6: '6" G-NECK 116', roofCap634_6: '6" 634 ROOF CAP', roofJ6: 'ROOF J 6"', roofJ8: 'ROOF J 8"', roofJ10: 'ROOF J 10"',
};
const B_VENT_LABELS: Record<(typeof B_VENT_KEYS)[number], string> = {
  pc5: "5' PC", pc3: "3' PC", pc2: "2' PC", pc1: "1' PC", deg60: "60°", deg90: "90°", tee: "Tee", ccf: "C-C-F",
};
const FLEX_B_VENT_LABELS = { "4x36": '4"x36"', "4x60": '4"x60"' } as const;

const METAL_SCREEN_ROWS = [
  { label: '6"', metal: "metal6", screen: "screen6" },
  { label: '8"', metal: "metal8", screen: "screen8" },
  { label: '10"', metal: "metal10", screen: "screen10" },
  { label: "10x3¼", metal: "metal10x3_25", screen: "screen10x3_25" },
] as const;
const MID_ATL_ROWS = [
  { label: '4"', metal: "buildersEdgeMetal4", screen: "buildersEdgeScreen4" },
  { label: '6"', metal: "buildersEdgeMetal6", screen: "buildersEdgeScreen6" },
] as const;
export function FilledCutSheet({ data }: { data: Cutsheet }) {
  return (
    <>
      <style>{LEGAL_PAGE_CSS}</style>
      <LegalScalePage>
        <ShopPage data={data} />
      </LegalScalePage>
      <LegalScalePage>
        <CutPage data={data} />
      </LegalScalePage>
    </>
  );
}

// ---------- value primitives (mirror blank2 sizing) -------------------------

function VBox({ v, black }: { v?: string; black?: boolean }) {
  return (
    <span
      className={`inline-flex h-[13pt] w-[22pt] shrink-0 items-center justify-center border border-black text-center text-[9.5pt] font-bold tabular-nums leading-none ${black ? "bg-black" : ""}`}
    >
      {v ?? ""}
    </span>
  );
}

// `ruled` matches blank2's 60" Duct - gray rules under each row to fill the
// otherwise-sparse tall column.
function VRow({ label, v, ruled = true }: { label: string; v: string; ruled?: boolean }) {
  return (
    <div
      className={`flex items-baseline justify-between gap-1 ${ruled ? "border-b border-neutral-300 pb-0.5" : ""}`}
    >
      <span className="truncate font-medium leading-[1.3]">{label}</span>
      <VBox v={v} />
    </div>
  );
}

function VList({ items, ruled = true }: { items: { label: string; v: string }[]; ruled?: boolean }) {
  return (
    <div className={ruled ? "space-y-1" : "space-y-px"}>
      {items.map((it) => (
        <VRow key={it.label} label={it.label} v={it.v} ruled={ruled} />
      ))}
    </div>
  );
}

function VMultiTable({
  cols,
  rows,
}: {
  cols: string[];
  rows: { label: string; cells: ({ v: string } | { black: true })[] }[];
}) {
  return (
    <table className="w-full border-collapse">
      <thead>
        <tr>
          <th className="bg-neutral-200 px-0.5 py-0 text-left text-[8pt] font-bold uppercase">Size</th>
          {cols.map((c) => (
            <th key={c} className="bg-neutral-200 px-0.5 py-0 text-center text-[8pt] font-bold uppercase" style={{ width: "24pt" }}>
              {c}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.label}>
            <td className="border-b border-neutral-300 px-0.5 py-0 text-[10pt] font-medium leading-[1.3]">{r.label}</td>
            {r.cells.map((cell, i) => (
              <td key={i} className="border-b border-neutral-300 px-0 py-px text-center">
                <VBox v={"v" in cell ? cell.v : undefined} black={"black" in cell} />
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// Fixed-row W/H table populated from row data, padded with blanks to `min`.
function WHFilled({
  rows,
  min,
  withL,
}: {
  rows: { qty: number; w: string; h: string; l?: string; sl?: string }[];
  min: number;
  withL?: boolean;
}) {
  const cols = withL ? ["Qty", "W", "H", "L", "S/L"] : ["Qty", "W", "H"];
  const count = Math.max(min, rows.length);
  const cell = (s: string) => (
    <td className="h-[16pt] border border-black p-0 text-center text-[10pt] font-bold">{s}</td>
  );
  return (
    <table className="w-full border-collapse">
      <thead>
        <tr>
          {cols.map((h) => (
            <th key={h} className="border border-black bg-neutral-200 px-1 py-0 text-center text-[8pt] font-bold uppercase">
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {Array.from({ length: count }).map((_, i) => {
          const r = rows[i];
          return (
            <tr key={i}>
              {cell(r ? num(r.qty) : "")}
              {cell(r?.w ?? "")}
              {cell(r?.h ?? "")}
              {withL && cell(r?.l ?? "")}
              {withL && cell(r && r.qty ? (r.sl ?? "") : "")}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function Section({ title, children, gapTop }: { title: string; children: React.ReactNode; gapTop?: boolean }) {
  return (
    <div className={`border border-black ${gapTop ? "mt-2" : "border-t-0 first:border-t"}`}>
      <div className="border-b border-black px-1.5 py-0.5 text-[10pt] font-bold uppercase tracking-wide">{title}</div>
      <div className="p-0.5">{children}</div>
    </div>
  );
}

// ---------- header ----------------------------------------------------------

function PageHeader({ title, h }: { title: string; h: Cutsheet["header"] }) {
  return (
    <header className="border-2 border-black">
      <div className="flex items-center justify-between border-b border-black px-2 py-1">
        <span className="text-[14pt] font-bold uppercase tracking-wide">{title}</span>
        <span className="text-[10pt]">Pad #_____________________</span>
      </div>
      <HRow>
        <HF label="Builder" v={h.builder} flex={4} />
        <HF label="Date" v={h.date} flex={1.3} />
        <HF label="Delivery Date" v={h.deliveryDate} flex={1.5} />
      </HRow>
      <HRow>
        <HF label="Project" v={h.project} flex={4} />
        <HF label="Project Code" v={h.projectCode} flex={1.5} />
        <HF label="Option" v={h.option} flex={1.3} />
      </HRow>
      <HRow>
        <HF label="House Type" v={h.houseType} flex={2.2} />
        <HF label="Foreman" v={h.foreman} flex={1.8} />
        <HF label="Region (MD/VA/WV)" v={h.region} flex={1.7} />
        <HF label="Eq To (Job/Whs/Hold)" v={h.eqTo} flex={1.7} />
      </HRow>
      <HRow last>
        <HF label="Lot" v={h.lot} flex={1} />
        <HF label="Block" v={h.block} flex={1} />
        <HF label="Section" v={h.section} flex={1} />
        <HF label="Prop #" v={h.propNumber} flex={1.4} />
        <HF label="Zone" v={h.zone} flex={1} />
      </HRow>
    </header>
  );
}

function HRow({ children, last }: { children: React.ReactNode; last?: boolean }) {
  return <div className={`flex items-stretch ${last ? "" : "border-b border-black"}`}>{children}</div>;
}

function HF({ label, v, flex }: { label: string; v: string; flex: number }) {
  return (
    <div className="flex min-h-[32pt] flex-col justify-end gap-0.5 border-r border-black px-2 pb-1 pt-3 last:border-r-0" style={{ flex }}>
      <span className="text-[8pt] font-medium uppercase tracking-wide text-neutral-700">{label}</span>
      <span className="min-h-[13pt] border-b border-black text-[11pt] font-bold">{v}</span>
    </div>
  );
}

function Footer() {
  return (
    <footer className="grid border border-black border-t-0 text-[8pt]" style={{ gridTemplateColumns: "1fr 1fr 2fr" }}>
      {["Cut By", "Date Cut", "Notes"].map((t) => (
        <div key={t} className="border-l border-black px-2 py-1.5 first:border-l-0">
          <div className="text-[8pt] font-bold uppercase tracking-wide text-neutral-700">{t}</div>
          <div className="mt-2 border-b border-black" />
        </div>
      ))}
    </footer>
  );
}

// ---------- Page 1 - Shop Cut Sheet -----------------------------------------

function ShopPage({ data: d }: { data: Cutsheet }) {
  return (
    <div className="mx-auto flex min-h-[17.65in] w-[10.5in] flex-col bg-white p-0 font-sans text-[10pt] leading-[1.1] text-black">
      <PageHeader title="Shop Cut Sheet" h={d.header} />
      <div className="grid grid-cols-4">
        {/* Col 1 */}
        <div>
          <Section title='60" Duct'>
            <VList items={DUCT60_SIZES.map((s) => ({ label: duct60Label(s), v: num(d.stock.duct60[s]) }))} ruled />
          </Section>
        </div>
        {/* Col 2 */}
        <div>
          <Section title="Custom Duct">
            <WHFilled rows={d.custom.customDuct} min={12} withL />
          </Section>
          <Section title="Miscellaneous">
            {/* 7 lines standard, more if the data has more. */}
            <div className="space-y-px text-[10pt]">
              {Array.from({ length: Math.max(7, d.custom.miscellaneous.length) }).map((_, i) => (
                <div key={i} className="min-h-[13pt] border-b border-black/30 font-medium">
                  {d.custom.miscellaneous[i] ?? ""}
                </div>
              ))}
            </div>
          </Section>
          <Section title="Canvas Conn">
            <WHFilled rows={d.custom.canvasConn} min={5} />
          </Section>
        </div>
        {/* Col 3 */}
        <div>
          <Section title="End Caps">
            <WHFilled rows={d.custom.endCaps} min={7} />
          </Section>
          <Section title="Volume Dampers">
            <WHFilled rows={d.custom.volumeDampers} min={5} />
          </Section>
          <Section title="Round Coll / Round Vol Damp">
            <VMultiTable
              cols={["Coll", "VD"]}
              rows={RND_SIZES.map((s) => ({
                label: `${s}"`,
                cells: [{ v: num(d.custom.rndCollars[s]) }, { v: num(d.custom.roundVolumeDampers[s]) }],
              }))}
            />
          </Section>
          <Section title="Simpson STP" gapTop>
            <VList items={SIMPSON_STP_KEYS.map((k) => ({ label: SIMPSON_STP_LABELS[k], v: num(d.formOnly.simpsonStp[k]) }))} />
          </Section>
          <Section title="S D / Misc">
            <VList items={(["drive24", "slips26", "mastic", "brushes"] as const).map((k) => ({ label: SD_MISC_LABELS[k], v: num(d.stock.sdMisc[k]) }))} />
          </Section>
          <Section title="Panning">
            <VRow label="Panning Metal (36x36)" v={num(d.formOnly.panningMetal36x36)} />
          </Section>
        </div>
        {/* Col 4 */}
        <div>
          <Section title="Plenum Package">
            <PlenumChecks value={d.header.plenumPackage} />
          </Section>
          <Section title="Return Plenum">
            <VList items={[{ label: "14x24 S.L.", v: num(d.formOnly.returnPlenum["14x24SL"]) }, { label: "18x24 S.L.", v: num(d.formOnly.returnPlenum["18x24SL"]) }]} />
          </Section>
          <Section title="Furnace Feet">
            <VRow label="Furnace Feet" v={num(d.formOnly.returnPlenum.furnaceFeet)} />
          </Section>
          <Section title="Drain Pans">
            <VList items={DRAIN_PANS_KEYS.map((k) => ({ label: k, v: num(d.formOnly.drainPans[k]) }))} />
          </Section>
          <Section title="Filter Racks">
            <VList items={FILTER_RACKS_KEYS.map((k) => ({ label: FILTER_RACKS_LABELS[k], v: num(d.formOnly.filterRacks[k]) }))} />
          </Section>
        </div>
      </div>
      {/* No draw grid here: hand sketches happen on the printed blank pad
          (/print/blank2 keeps it); the digital packet carries its fittings on
          the fittings sheet. The open band is still scribble room on paper. */}
      <div className="flex-1" />
      <Footer />
    </div>
  );
}

// ---------- Page 2 - Cut Sheet ----------------------------------------------

function PlenumChecks({ value }: { value: string }) {
  return (
    <div className="space-y-1 text-[9pt]">
      {([["small", "Small", "· 18x22x18"], ["large", "Large", "· 24x22x18"], ["none", "None", ""]] as const).map(([v, label, detail]) => (
        <div key={v} className="flex items-center gap-1.5">
          <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center border border-black text-[10pt] leading-none">
            {value === v ? "✓" : ""}
          </span>
          <span className="font-bold">{label}</span>
          {detail && <span>{detail}</span>}
        </div>
      ))}
    </div>
  );
}

function CutPage({ data: d }: { data: Cutsheet }) {
  const fo = d.formOnly;
  return (
    <div className="mx-auto flex min-h-[17.65in] w-[10.5in] flex-col bg-white p-0 font-sans text-[10pt] leading-[1.1] text-black">
      <PageHeader title="Cut Sheet" h={d.header} />
      <div className="grid grid-cols-4">
        {/* Col 1 */}
        <div>
          <Section title="Boots (Ell / End / Strt)">
            <VMultiTable cols={["Ell", "End", "Strt"]} rows={ELL_BOOTS_SIZES.map((s) => ({ label: bootLabel(s), cells: [{ v: num(fo.ellBoots[s]) }, { v: num(fo.endBoots[s]) }, { v: num(fo.strtBoots[s]) }] }))} />
          </Section>
          <Section title="Oval Stack Heads">
            <VList items={OVAL_S_HEADS_SIZES.map((s) => ({ label: s, v: num(fo.ovalSHeads[s]) }))} />
          </Section>
          <Section title="Straight Ceiling Boot">
            <VList items={STRAIGHT_BOOT_BOXES_SIZES.map((s) => ({ label: s, v: num(fo.straightBootBoxes[s]) }))} />
          </Section>
          <Section title="Round Pipe">
            <VList items={RND_PIPE_SIZES.map((s) => ({ label: s, v: num(d.truck.rndPipe[s]) }))} />
          </Section>
          <Section title="Elbows">
            <VMultiTable cols={["Qty"]} rows={RND_ELL_SIZES.map((s) => ({ label: `${s}"`, cells: [{ v: num(fo.rndEll[s]) }] }))} />
          </Section>
        </div>
        {/* Col 2 */}
        <div>
          <Section title="Air Tights">
            <VList items={FLEX_SIZES.map((s) => ({ label: `${s}"`, v: num(fo.airTights[s]) }))} />
          </Section>
          <Section title="Saddle Tap">
            <VList items={SADDLE_TAP_SIZES.map((s) => ({ label: `${s}"`, v: num(fo.saddleTap[s]) }))} />
          </Section>
          <Section title="Oval Pipe">
            <VList items={OV_PIPE_SIZES.map((s) => ({ label: `${s}"`, v: num(d.truck.ovPipe[s]) }))} />
          </Section>
          <Section title="Oval to Round">
            <VList items={OVAL_TO_RND_SIZES.map((s) => ({ label: s, v: num(fo.ovalToRnd[s]) }))} />
          </Section>
          <Section title="Oval Ells">
            <VList items={OVAL_ELL_SIZES.map((s) => ({ label: s.replace("F", '" F'), v: num(fo.ovalEll[s]) }))} />
          </Section>
          <Section title='Flex (Un / R4 / R8) x 18"'>
            <VMultiTable
              cols={["Un", "R4", "R8"]}
              rows={FLEX_SIZES.map((s) => ({
                label: `${s}"`,
                cells: [
                  { v: num(fo.uninsulatedFlex[s]) },
                  { v: num(fo.insulatedFlexR4[s]) },
                  { v: num(fo.insulatedFlexR8[s]) },
                ],
              }))}
            />
          </Section>
        </div>
        {/* Col 3 */}
        <div>
          <Section title="Gal Reducer">
            <VList items={GAL_REDR_SIZES.map((s) => ({ label: s, v: num(fo.galRedr[s]) }))} />
          </Section>
          <Section title="B-Vent">
            <VList items={B_VENT_KEYS.map((k) => ({ label: B_VENT_LABELS[k], v: num(fo.bVent[k]) }))} />
          </Section>
          <Section title="Flex B-Vent">
            <VList items={FLEX_B_VENT_KEYS.map((k) => ({ label: FLEX_B_VENT_LABELS[k], v: num(fo.flexBVent[k]) }))} />
          </Section>
          <Section title="Foil Ins / Bubble Wrap" gapTop>
            <VList items={[{ label: "Foil Ins R-8", v: num(fo.sdMiscExtras.foilIns) }, { label: "Bubble Wrap", v: num(fo.sdMiscExtras.bubbleWrap) }]} />
          </Section>
          <Section title="Con Regs" gapTop>
            <VRow label="8x6" v={num(fo.condRegs8x6)} />
          </Section>
        </div>
        {/* Col 4 */}
        <div>
          <Section title="Dryer Box">
            <VList items={DRYER_BOX_KEYS.map((k) => ({ label: DRYER_BOX_LABELS[k], v: num(fo.dryerBox[k]) }))} />
          </Section>
          <Section title="Mid Atl. Wall Caps">
            <VMultiTable cols={["Metal", "Screen"]} rows={MID_ATL_ROWS.map((r) => ({ label: r.label, cells: [{ v: num(fo.midAtlanticWallCaps[r.metal]) }, { v: num(fo.midAtlanticWallCaps[r.screen]) }] }))} />
          </Section>
          <Section title="Bird Cage">
            <VList items={BIRD_CAGE_SIZES.map((s) => ({ label: `${s}"`, v: num(fo.birdCage[s]) }))} />
          </Section>
          <Section title="Metal / Screen">
            <VMultiTable cols={["Metal", "Screen"]} rows={METAL_SCREEN_ROWS.map((r) => ({ label: r.label, cells: [{ v: num(fo.metalScreen[r.metal]) }, { v: num(fo.metalScreen[r.screen]) }] }))} />
          </Section>
          <Section title="Fans / G-Necks / Roof">
            <VList items={FANS_KEYS.map((k) => ({ label: FANS_LABELS[k], v: num(fo.fans[k]) }))} />
          </Section>
          <Section title="Blue Flashing">
            <VList items={BLUE_FLASHING_KEYS.map((k) => ({ label: BLUE_FLASHING_LABELS[k], v: num(fo.blueFlashing[k]) }))} />
          </Section>
          <Section title="Fresh Air Dampers">
            <VList items={FRESH_AIR_DAMPER_SIZES.map((s) => ({ label: s, v: num(fo.freshAirDampers[s]) }))} />
          </Section>
        </div>
      </div>
      {/* Regs absorb the leftover page height (mirrors page 1's draw grid) —
          write-in room instead of a dead band above a fixed-height row. */}
      <div className="grid flex-1 grid-cols-4 border border-black border-t-0">
        <RegBox title="Wall Regs" rows={fo.wallRegs} />
        <RegBox title="Grills" rows={fo.grills} />
        <RegBox title="Filter Grills" rows={fo.filterGrills} />
        <RegBox title="Floor Regs" rows={fo.floorRegs} />
      </div>
      <Footer />
    </div>
  );
}

function RegBox({ title, rows }: { title: string; rows: string[] }) {
  return (
    <div className="border-l border-black first:border-l-0">
      <div className="border-b border-black px-1.5 py-0.5 text-[10pt] font-bold uppercase tracking-wide">{title}</div>
      <div className="min-h-[2.2in] space-y-px p-1 text-[10pt]">
        {rows.map((r, i) => (
          <div key={i} className="border-b border-black/30 font-medium">{r}</div>
        ))}
      </div>
    </div>
  );
}
