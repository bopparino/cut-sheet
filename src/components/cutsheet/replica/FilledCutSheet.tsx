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

// Digitally-filled version of the new cut sheet. Mirrors /print/blank2's print
// layout box-for-box (same 11x17 sizing, borders, columns) but each box shows
// the saved value instead of being empty — so the filled PDF prints identically
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
const R4_STOCKED = new Set(['4"', '6"', '8"']);

export function FilledCutSheet({ data }: { data: Cutsheet }) {
  return (
    <>
      <style>{`@page { size: 11in 17in; margin: 0.25in; }`}</style>
      <ShopPage data={data} />
      <div className="break-before-page" />
      <CutPage data={data} />
    </>
  );
}

// ---------- value primitives (mirror blank2 sizing) -------------------------

function VBox({ v, black }: { v?: string; black?: boolean }) {
  return (
    <span
      className={`inline-flex h-[10pt] w-[18pt] shrink-0 items-center justify-center border border-black text-center text-[7pt] font-semibold tabular-nums leading-none ${black ? "bg-black" : ""}`}
    >
      {v ?? ""}
    </span>
  );
}

function VRow({ label, v }: { label: string; v: string }) {
  return (
    <div className="flex items-baseline justify-between gap-1">
      <span className="truncate leading-[1.3]">{label}</span>
      <VBox v={v} />
    </div>
  );
}

function VList({ items }: { items: { label: string; v: string }[] }) {
  return (
    <div className="space-y-px">
      {items.map((it) => (
        <VRow key={it.label} label={it.label} v={it.v} />
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
          <th className="bg-neutral-200 px-0.5 py-0 text-left text-[7pt] font-bold uppercase">Size</th>
          {cols.map((c) => (
            <th key={c} className="bg-neutral-200 px-0.5 py-0 text-center text-[7pt] font-bold uppercase" style={{ width: "20pt" }}>
              {c}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.label}>
            <td className="px-0.5 py-0 text-[8pt] leading-[1.3]">{r.label}</td>
            {r.cells.map((cell, i) => (
              <td key={i} className="px-0 py-px text-center">
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
    <td className="h-[13pt] border border-black p-0 text-center text-[7pt] font-semibold">{s}</td>
  );
  return (
    <table className="w-full border-collapse">
      <thead>
        <tr>
          {cols.map((h) => (
            <th key={h} className="border border-black bg-neutral-200 px-1 py-0 text-center text-[7pt] font-bold uppercase">
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

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border border-black border-t-0 first:border-t">
      <div className="border-b border-black px-1.5 py-0.5 text-[8.5pt] font-bold uppercase tracking-wide">{title}</div>
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
        <span className="text-[9pt]">Pad #_____________________</span>
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
      <span className="text-[7pt] font-medium uppercase tracking-wide text-neutral-700">{label}</span>
      <span className="min-h-[10pt] border-b border-black text-[9pt] font-semibold">{v}</span>
    </div>
  );
}

function Footer() {
  return (
    <footer className="grid border border-black border-t-0 text-[8pt]" style={{ gridTemplateColumns: "1fr 1fr 2fr" }}>
      {["Cut By", "Date Cut", "Notes"].map((t) => (
        <div key={t} className="border-l border-black px-2 py-1.5 first:border-l-0">
          <div className="text-[7pt] font-bold uppercase tracking-wide text-neutral-700">{t}</div>
          <div className="mt-2 border-b border-black" />
        </div>
      ))}
    </footer>
  );
}

// ---------- Page 1 — Shop Cut Sheet -----------------------------------------

function ShopPage({ data: d }: { data: Cutsheet }) {
  return (
    <div className="mx-auto flex min-h-[16.5in] w-[10.5in] flex-col bg-white p-0 font-sans text-[8pt] leading-[1.1] text-black">
      <PageHeader title="Shop Cut Sheet" h={d.header} />
      <div className="grid grid-cols-4">
        <div>
          <Section title='60" Duct'>
            <VList items={DUCT60_SIZES.map((s) => ({ label: duct60Label(s), v: num(d.stock.duct60[s]) }))} />
          </Section>
          <Section title="S D / Misc">
            <VList items={(["drive24", "slips26", "mastic", "brushes"] as const).map((k) => ({ label: SD_MISC_LABELS[k], v: num(d.stock.sdMisc[k]) }))} />
          </Section>
        </div>
        <div>
          <Section title="Custom Duct">
            <WHFilled rows={d.custom.customDuct} min={12} withL />
          </Section>
          <Section title="Miscellaneous">
            <div className="space-y-px text-[8pt]">
              {(d.custom.miscellaneous.length ? d.custom.miscellaneous : [""]).map((m, i) => (
                <div key={i} className="min-h-[11pt] border-b border-black/30">{m}</div>
              ))}
            </div>
          </Section>
          <Section title="Canvas Conn">
            <WHFilled rows={d.custom.canvasConn} min={5} />
          </Section>
        </div>
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
        </div>
        <div>
          <Section title="Straight Boot Boxes">
            <VList items={STRAIGHT_BOOT_BOXES_SIZES.map((s) => ({ label: s, v: num(d.formOnly.straightBootBoxes[s]) }))} />
          </Section>
          <Section title="Simpson STP">
            <VList items={SIMPSON_STP_KEYS.map((k) => ({ label: SIMPSON_STP_LABELS[k], v: num(d.formOnly.simpsonStp[k]) }))} />
          </Section>
          <Section title="Filter Racks">
            <VList items={FILTER_RACKS_KEYS.map((k) => ({ label: FILTER_RACKS_LABELS[k], v: num(d.formOnly.filterRacks[k]) }))} />
          </Section>
          <Section title="Drain Pans">
            <VList items={DRAIN_PANS_KEYS.map((k) => ({ label: k, v: num(d.formOnly.drainPans[k]) }))} />
          </Section>
          <Section title="Panning">
            <VRow label="Panning Metal (36x36)" v={num(d.formOnly.panningMetal36x36)} />
          </Section>
          <Section title="Furnace Feet">
            <VRow label="Furnace Feet" v={num(d.formOnly.returnPlenum.furnaceFeet)} />
          </Section>
        </div>
      </div>
      {/* Drawing grid stays blank for hand sketches on the printed copy. */}
      <div className="grid flex-1 grid-cols-6 grid-rows-3 border-l border-t border-black">
        {Array.from({ length: 18 }).map((_, i) => (
          <div key={i} className="flex flex-col border border-l-0 border-t-0 border-black">
            <div className="flex items-center justify-between gap-1 border-b border-black px-1 py-0.5 text-[7pt] uppercase">
              <span>SL? □N □Y</span>
              <span className="flex items-baseline gap-1">Qty<span className="inline-block h-[10pt] w-[20pt] border border-black" /></span>
            </div>
            <div className="flex-1" />
          </div>
        ))}
      </div>
      <Footer />
    </div>
  );
}

// ---------- Page 2 — Cut Sheet ----------------------------------------------

function CutPage({ data: d }: { data: Cutsheet }) {
  const fo = d.formOnly;
  return (
    <div className="mx-auto flex min-h-[16.5in] w-[10.5in] flex-col bg-white p-0 font-sans text-[8pt] leading-[1.1] text-black">
      <PageHeader title="Cut Sheet" h={d.header} />
      <div className="grid grid-cols-4">
        <div>
          <Section title="Plenum Package">
            <div className="space-y-0.5 text-[7.5pt]">
              {([["small", "Small", "· 18x22x18 · 18x22x24 · 18x22 C.C."], ["large", "Large", "· 24x22x18 · 24x22x24 · 24x22 C.C."], ["none", "None", ""]] as const).map(([v, label, detail]) => (
                <div key={v} className="flex items-baseline gap-1.5">
                  <span className="mt-px inline-flex h-2.5 w-2.5 shrink-0 items-center justify-center border border-black text-[7pt] leading-none">
                    {d.header.plenumPackage === v ? "✓" : ""}
                  </span>
                  <span className="font-bold">{label}</span>
                  {detail && <span className="text-[7pt]">{detail}</span>}
                </div>
              ))}
            </div>
          </Section>
          <Section title="Return Plenum">
            <VList items={[{ label: "14x24 S.L.", v: num(fo.returnPlenum["14x24SL"]) }, { label: "18x24 S.L.", v: num(fo.returnPlenum["18x24SL"]) }]} />
          </Section>
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
        </div>
        <div>
          <Section title="Elbows">
            <VMultiTable cols={["Qty"]} rows={RND_ELL_SIZES.map((s) => ({ label: `${s}"`, cells: [{ v: num(fo.rndEll[s]) }] }))} />
          </Section>
          <Section title="Boots (Ell / End / Strt)">
            <VMultiTable cols={["Ell", "End", "Strt"]} rows={ELL_BOOTS_SIZES.map((s) => ({ label: bootLabel(s), cells: [{ v: num(fo.ellBoots[s]) }, { v: num(fo.endBoots[s]) }, { v: num(fo.strtBoots[s]) }] }))} />
          </Section>
          <Section title="Air Tights">
            <VList items={FLEX_SIZES.map((s) => ({ label: `${s}"`, v: num(fo.airTights[s]) }))} />
          </Section>
          <Section title="Saddle Tap">
            <VList items={SADDLE_TAP_SIZES.map((s) => ({ label: `${s}"`, v: num(fo.saddleTap[s]) }))} />
          </Section>
          <Section title="Blue Flashing">
            <VList items={BLUE_FLASHING_KEYS.map((k) => ({ label: BLUE_FLASHING_LABELS[k], v: num(fo.blueFlashing[k]) }))} />
          </Section>
          <Section title="Con Regs">
            <VRow label="8x6" v={num(fo.condRegs8x6)} />
          </Section>
        </div>
        <div>
          <Section title="Flex (Un / R4 / R8)">
            <VMultiTable
              cols={["Un", "R4", "R8"]}
              rows={FLEX_SIZES.map((s) => ({
                label: `${s}"`,
                cells: [
                  { v: num(fo.uninsulatedFlex[s]) },
                  R4_STOCKED.has(`${s}"`) ? { v: num(fo.insulatedFlexR4[s]) } : { black: true as const },
                  { v: num(fo.insulatedFlexR8[s]) },
                ],
              }))}
            />
          </Section>
          <Section title="Foil Ins / Bubble Wrap">
            <VList items={[{ label: "Foil Ins", v: num(fo.sdMiscExtras.foilIns) }, { label: "Bubble Wrap", v: num(fo.sdMiscExtras.bubbleWrap) }]} />
          </Section>
          <Section title="Fans / G-Necks / Roof">
            <VList items={FANS_KEYS.map((k) => ({ label: FANS_LABELS[k], v: num(fo.fans[k]) }))} />
          </Section>
          <Section title="Fresh Air Dampers">
            <VList items={FRESH_AIR_DAMPER_SIZES.map((s) => ({ label: s, v: num(fo.freshAirDampers[s]) }))} />
          </Section>
          <Section title="Gal Redr">
            <VList items={GAL_REDR_SIZES.map((s) => ({ label: s, v: num(fo.galRedr[s]) }))} />
          </Section>
        </div>
        <div>
          <Section title="RND Pipe">
            <VList items={RND_PIPE_SIZES.map((s) => ({ label: s, v: num(d.truck.rndPipe[s]) }))} />
          </Section>
          <Section title="OV Pipe">
            <VList items={OV_PIPE_SIZES.map((s) => ({ label: `${s}"`, v: num(d.truck.ovPipe[s]) }))} />
          </Section>
          <Section title="Oval S. Heads">
            <VList items={OVAL_S_HEADS_SIZES.map((s) => ({ label: s, v: num(fo.ovalSHeads[s]) }))} />
          </Section>
          <Section title="Oval to Rnd">
            <VList items={OVAL_TO_RND_SIZES.map((s) => ({ label: s, v: num(fo.ovalToRnd[s]) }))} />
          </Section>
          <Section title="Oval Ells">
            <VList items={OVAL_ELL_SIZES.map((s) => ({ label: s.replace("F", '" F'), v: num(fo.ovalEll[s]) }))} />
          </Section>
          <Section title="B-Vent">
            <VList items={B_VENT_KEYS.map((k) => ({ label: B_VENT_LABELS[k], v: num(fo.bVent[k]) }))} />
          </Section>
          <Section title="Flex B-Vent">
            <VList items={FLEX_B_VENT_KEYS.map((k) => ({ label: FLEX_B_VENT_LABELS[k], v: num(fo.flexBVent[k]) }))} />
          </Section>
        </div>
      </div>
      <div className="flex-1" aria-hidden />
      <div className="grid grid-cols-4 border border-black border-t-0">
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
      <div className="border-b border-black px-1.5 py-0.5 text-[9pt] font-bold uppercase tracking-wide">{title}</div>
      <div className="min-h-[2.2in] space-y-px p-1 text-[8pt]">
        {rows.map((r, i) => (
          <div key={i} className="border-b border-black/30">{r}</div>
        ))}
      </div>
    </div>
  );
}
