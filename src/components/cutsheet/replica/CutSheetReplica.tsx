import {
  BIRD_CAGE_SIZES,
  BLUE_FLASHING_KEYS,
  B_VENT_KEYS,
  DRYER_BOX_KEYS,
  ELL_BOOTS_SIZES,
  FANS_KEYS,
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
  SADDLE_TAP_SIZES,
  type Cutsheet,
} from "@/lib/schema";
import {
  MiscInputList,
  MultiQtyInputTable,
  QtyInputList,
  ReplicaHeader,
  Section,
  SingletonInputRow,
} from "./primitives";

// Editable 1:1 replica of the Cut Sheet (blank2 page 2). Same mapping rules as
// page 1: every box is an <input> on its existing schema name.

const bootLabel = (s: string) => s.replace("3.25", "3¼");

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

// Metal / Screen and Mid Atl. share the size-row × [Metal, Screen] shape, but
// the schema keys are flat (metal6/screen6, buildersEdgeMetal4/…). Spell the
// per-cell keys out explicitly.
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

export function CutSheetReplica({ data }: { data: Cutsheet }) {
  const d = data;
  const fo = d.formOnly;
  return (
    <div className="mx-auto flex w-[10.5in] flex-col bg-white font-sans text-[9px] leading-tight text-black">
      {/* Read-only: the editable header lives on page 1 (Shop Cut Sheet) so
          the shared header fields submit exactly once. */}
      <ReplicaHeader title="Cut Sheet" header={d.header} editable={false} />
      <div className="grid grid-cols-4">
        {/* Col 1 */}
        <div>
          <Section title="Plenum Package">
            <PlenumRadios value={d.header.plenumPackage} />
          </Section>
          <Section title="Return Plenum">
            <SingletonInputRow label="14x24 S.L." name="returnPlenum.14x24SL" value={fo.returnPlenum["14x24SL"]} />
            <SingletonInputRow label="18x24 S.L." name="returnPlenum.18x24SL" value={fo.returnPlenum["18x24SL"]} />
          </Section>
          <Section title="Dryer Box">
            <QtyInputList prefix="dryerBox" sizes={DRYER_BOX_KEYS} values={fo.dryerBox} label={(k) => DRYER_BOX_LABELS[k]} />
          </Section>
          <Section title="Mid Atl. Wall Caps">
            <MultiQtyInputTable
              colLabels={["Metal", "Screen"]}
              rows={MID_ATL_ROWS.map((r) => ({
                label: r.label,
                cells: [
                  { name: `midAtlanticWallCaps.${r.metal}`, value: fo.midAtlanticWallCaps[r.metal] },
                  { name: `midAtlanticWallCaps.${r.screen}`, value: fo.midAtlanticWallCaps[r.screen] },
                ],
              }))}
            />
          </Section>
          <Section title="Bird Cage">
            <QtyInputList prefix="birdCage" sizes={BIRD_CAGE_SIZES} values={fo.birdCage} label={(s) => `${s}"`} />
          </Section>
          <Section title="Metal / Screen">
            <MultiQtyInputTable
              colLabels={["Metal", "Screen"]}
              rows={METAL_SCREEN_ROWS.map((r) => ({
                label: r.label,
                cells: [
                  { name: `metalScreen.${r.metal}`, value: fo.metalScreen[r.metal] },
                  { name: `metalScreen.${r.screen}`, value: fo.metalScreen[r.screen] },
                ],
              }))}
            />
          </Section>
        </div>
        {/* Col 2 */}
        <div>
          <Section title="Elbows">
            <MultiQtyInputTable
              colLabels={["Qty"]}
              rows={RND_ELL_SIZES.map((s) => ({ label: `${s}"`, cells: [{ name: `rndEll.${s}`, value: fo.rndEll[s] }] }))}
            />
          </Section>
          <Section title="Boots (Ell / End / Strt)">
            <MultiQtyInputTable
              colLabels={["Ell", "End", "Strt"]}
              rows={ELL_BOOTS_SIZES.map((s) => ({
                label: bootLabel(s),
                cells: [
                  { name: `ellBoots.${s}`, value: fo.ellBoots[s] },
                  { name: `endBoots.${s}`, value: fo.endBoots[s] },
                  { name: `strtBoots.${s}`, value: fo.strtBoots[s] },
                ],
              }))}
            />
          </Section>
          <Section title="Air Tights">
            <QtyInputList prefix="airTights" sizes={FLEX_SIZES} values={fo.airTights} label={(s) => `${s}"`} />
          </Section>
          <Section title="Saddle Tap">
            <QtyInputList prefix="saddleTap" sizes={SADDLE_TAP_SIZES} values={fo.saddleTap} label={(s) => `${s}"`} />
          </Section>
          <Section title="Blue Flashing">
            <QtyInputList prefix="blueFlashing" sizes={BLUE_FLASHING_KEYS} values={fo.blueFlashing} label={(k) => BLUE_FLASHING_LABELS[k]} />
          </Section>
          <Section title="Con Regs">
            <SingletonInputRow label="8x6" name="condRegs8x6" value={fo.condRegs8x6} />
          </Section>
        </div>
        {/* Col 3 */}
        <div>
          <Section title="Flex (Un / R4 / R8)">
            <MultiQtyInputTable
              colLabels={["Un", "R4", "R8"]}
              rows={FLEX_SIZES.map((s) => {
                const size = `${s}"`;
                return {
                  label: size,
                  cells: [
                    { name: `uninsulatedFlex.${s}`, value: fo.uninsulatedFlex[s] },
                    R4_STOCKED.has(size)
                      ? { name: `insulatedFlexR4.${s}`, value: fo.insulatedFlexR4[s] }
                      : { blackout: true as const },
                    { name: `insulatedFlexR8.${s}`, value: fo.insulatedFlexR8[s] },
                  ],
                };
              })}
            />
          </Section>
          <Section title="Foil Ins / Bubble Wrap">
            <SingletonInputRow label="Foil Ins" name="sdMiscExtras.foilIns" value={fo.sdMiscExtras.foilIns} />
            <SingletonInputRow label="Bubble Wrap" name="sdMiscExtras.bubbleWrap" value={fo.sdMiscExtras.bubbleWrap} />
          </Section>
          <Section title="Fans / G-Necks / Roof">
            <QtyInputList prefix="fans" sizes={FANS_KEYS} values={fo.fans} label={(k) => FANS_LABELS[k]} />
          </Section>
          <Section title="Fresh Air Dampers">
            <QtyInputList prefix="freshAirDampers" sizes={FRESH_AIR_DAMPER_SIZES} values={fo.freshAirDampers} />
          </Section>
          <Section title="Gal Redr">
            <QtyInputList prefix="galRedr" sizes={GAL_REDR_SIZES} values={fo.galRedr} />
          </Section>
        </div>
        {/* Col 4 */}
        <div>
          <Section title="RND Pipe">
            <QtyInputList prefix="rndPipe" sizes={RND_PIPE_SIZES} values={d.truck.rndPipe} />
          </Section>
          <Section title="OV Pipe">
            <QtyInputList prefix="ovPipe" sizes={OV_PIPE_SIZES} values={d.truck.ovPipe} label={(s) => `${s}"`} />
          </Section>
          <Section title="Oval S. Heads">
            <QtyInputList prefix="ovalSHeads" sizes={OVAL_S_HEADS_SIZES} values={fo.ovalSHeads} />
          </Section>
          <Section title="Oval to Rnd">
            <QtyInputList prefix="ovalToRnd" sizes={OVAL_TO_RND_SIZES} values={fo.ovalToRnd} />
          </Section>
          <Section title="Oval Ells">
            <QtyInputList prefix="ovalEll" sizes={OVAL_ELL_SIZES} values={fo.ovalEll} label={(s) => s.replace("F", '" F')} />
          </Section>
          <Section title="B-Vent">
            <QtyInputList prefix="bVent" sizes={B_VENT_KEYS} values={fo.bVent} label={(k) => B_VENT_LABELS[k]} />
          </Section>
          <Section title="Flex B-Vent">
            <QtyInputList prefix="flexBVent" sizes={FLEX_B_VENT_KEYS} values={fo.flexBVent} label={(k) => FLEX_B_VENT_LABELS[k]} />
          </Section>
        </div>
      </div>
      {/* Bottom strip: open register lists */}
      <div className="grid grid-cols-4 border border-t-0 border-black">
        <RegisterColumn title="Wall Regs" prefix="wallRegs" initial={fo.wallRegs} />
        <RegisterColumn title="Grills" prefix="grills" initial={fo.grills} />
        <RegisterColumn title="Filter Grills" prefix="filterGrills" initial={fo.filterGrills} />
        <RegisterColumn title="Floor Regs" prefix="floorRegs" initial={fo.floorRegs} />
      </div>
    </div>
  );
}

function RegisterColumn({ title, prefix, initial }: { title: string; prefix: string; initial: string[] }) {
  return (
    <div className="border-l border-black first:border-l-0">
      <div className="border-b border-black bg-neutral-50 px-1 py-0.5 text-[9px] font-bold uppercase tracking-wide">
        {title}
      </div>
      {/* A few quick lines only - full register schedules are easier attached
          as a photo/document than typed into a long list. */}
      <div className="p-1">
        <MiscInputList prefix={prefix} rows={3} initial={initial} />
      </div>
    </div>
  );
}

function PlenumRadios({ value }: { value: string }) {
  const opts = [
    { v: "small", label: "Small", detail: "· 18x22x18 · 18x22x24 · 18x22 C.C." },
    { v: "large", label: "Large", detail: "· 24x22x18 · 24x22x24 · 24x22 C.C." },
    { v: "none", label: "None", detail: "" },
  ];
  return (
    <div className="space-y-0.5">
      {opts.map((o) => (
        <label key={o.v} className="flex items-baseline gap-1.5">
          <input type="radio" name="plenumPackage" value={o.v} defaultChecked={value === o.v} className="accent-black" />
          <span className="font-bold">{o.label}</span>
          {o.detail && <span className="text-[8px]">{o.detail}</span>}
        </label>
      ))}
    </div>
  );
}
