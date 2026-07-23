import {
  DRAIN_PANS_KEYS,
  DUCT60_SIZES,
  FILTER_RACKS_KEYS,
  RND_SIZES,
  SD_MISC_KEYS,
  SIMPSON_STP_KEYS,
  STRAIGHT_BOOT_BOXES_SIZES,
  type Cutsheet,
} from "@/lib/schema";
import {
  CustomDuctInputTable,
  MiscInputList,
  MultiQtyInputTable,
  QtyInputList,
  ReplicaHeader,
  Section,
  SingletonInputRow,
  WHInputTable,
} from "./primitives";

// Editable 1:1 replica of the Shop Cut Sheet (blank2 page 1). Same layout as
// /print/blank2's ShopPage, but every printed box is an <input> carrying the
// exact FormData name updateCutSheetReplica (and the PDF pipeline) reads.

const duct60Label = (s: string) => (s.startsWith("3.25") ? `3¼x${s.slice(5)}` : s);

const SD_MISC_LABELS: Record<(typeof SD_MISC_KEYS)[number], string> = {
  drive24: '24" Drive',
  slips26: '26" Slips',
  mastic: "Mastic",
  brushes: "Brushes",
};
const FILTER_RACKS_LABELS: Record<(typeof FILTER_RACKS_KEYS)[number], string> = {
  "16x25": "16x25",
  "20x25": "20x25",
  lBox: "L-Box",
};
const SIMPSON_STP_LABELS: Record<(typeof SIMPSON_STP_KEYS)[number], string> = {
  stp18: 'Simpson STP 18"',
  stp24: 'Simpson STP 24"',
};

export function ShopCutSheetReplica({ data, builders }: { data: Cutsheet; builders?: string[] }) {
  const d = data;
  const fo = d.formOnly;
  return (
    <div className="mx-auto flex w-[10.5in] flex-col bg-white font-sans text-[9px] leading-tight text-black">
      <ReplicaHeader title="Shop Cut Sheet" header={d.header} builders={builders} />
      <div className="grid grid-cols-4">
        {/* Col 1 */}
        <div>
          <Section title='60" Duct'>
            <QtyInputList prefix="duct60" sizes={DUCT60_SIZES} values={d.stock.duct60} label={duct60Label} ruled />
          </Section>
        </div>
        {/* Col 2 */}
        <div>
          <Section title="Custom Duct">
            <CustomDuctInputTable prefix="customDuct" rows={12} initial={d.custom.customDuct} />
          </Section>
          <Section title="Miscellaneous">
            <MiscInputList prefix="miscellaneous" rows={7} initial={d.custom.miscellaneous} />
          </Section>
          <Section title="Canvas Conn">
            <WHInputTable prefix="canvasConn" rows={5} initial={d.custom.canvasConn} />
          </Section>
        </div>
        {/* Col 3 */}
        <div>
          <Section title="End Caps">
            <WHInputTable prefix="endCaps" rows={7} initial={d.custom.endCaps} />
          </Section>
          <Section title="Volume Dampers">
            <WHInputTable prefix="volumeDampers" rows={5} initial={d.custom.volumeDampers} />
          </Section>
          <Section title="Round Coll / Round Vol Damp">
            <MultiQtyInputTable
              colLabels={["Coll", "VD"]}
              rows={RND_SIZES.map((s) => ({
                label: `${s}"`,
                cells: [
                  { name: `rndCollars.${s}`, value: d.custom.rndCollars[s] },
                  { name: `roundVolumeDampers.${s}`, value: d.custom.roundVolumeDampers[s] },
                ],
              }))}
            />
          </Section>
          <Section title="Simpson STP" gapTop>
            <QtyInputList prefix="simpsonStp" sizes={SIMPSON_STP_KEYS} values={fo.simpsonStp} label={(k) => SIMPSON_STP_LABELS[k]} />
          </Section>
          <Section title="S D / Misc">
            <QtyInputList prefix="sdMisc" sizes={SD_MISC_KEYS} values={d.stock.sdMisc} label={(k) => SD_MISC_LABELS[k]} />
          </Section>
          <Section title="Panning">
            <SingletonInputRow label="Panning Metal (36x36)" name="panningMetal36x36" value={fo.panningMetal36x36} />
          </Section>
        </div>
        {/* Col 4 */}
        <div>
          <Section title="Furnace Feet">
            <SingletonInputRow label="Furnace Feet" name="returnPlenum.furnaceFeet" value={fo.returnPlenum.furnaceFeet} />
          </Section>
          <Section title="Drain Pans">
            <QtyInputList prefix="drainPans" sizes={DRAIN_PANS_KEYS} values={fo.drainPans} />
          </Section>
          <Section title="Filter Racks">
            <QtyInputList prefix="filterRacks" sizes={FILTER_RACKS_KEYS} values={fo.filterRacks} label={(k) => FILTER_RACKS_LABELS[k]} />
          </Section>
          <Section title="Straight Ceiling Boot">
            <QtyInputList prefix="straightBootBoxes" sizes={STRAIGHT_BOOT_BOXES_SIZES} values={fo.straightBootBoxes} />
          </Section>
        </div>
      </div>
      {/* The fitting drawing grid is intentionally omitted from the editor -
          it's a draw-on-paper section, so it stays only on the printed/filled
          PDF (see FilledCutSheet). Digital fitting sketches attach via the
          Attachments upload on the replica page. */}
    </div>
  );
}
