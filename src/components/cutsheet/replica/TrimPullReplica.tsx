import type { Cutsheet, TrimExtraRow, TrimRow } from "@/lib/schema";
import { TRIM_FANS, TRIM_FLOOR_REG, TRIM_GRILL, TRIM_REGISTERS } from "@/lib/schema";
import { QtyInput, TextInput } from "@/components/cutsheet/replica/primitives";

// Editable replica of Kimmie's TRIM PULL SHEET. Same idea as the cut-sheet
// replicas: every box is an <input> whose FormData name the save action reads
// (trim.<section>.<item>.<zone>), so it lives inside the big replica form and
// saves with the Save button. TOTAL is computed - it shows the saved values'
// sum here and is recomputed live on the printed sheet.
//
// Each section gets a few blank rows (label + zones) for items that aren't
// pre-printed on the sheet; blank labels are dropped on save.

const EXTRA_ROWS = 3;
const ZONES = ["zone1", "zone2", "zone3", "base"] as const;
const ZONE_LABELS = ["ZONE 1", "ZONE 2", "ZONE 3", "BASE"] as const;

const total = (r: TrimRow) => r.zone1 + r.zone2 + r.zone3 + r.base;

export function TrimPullReplica({ data }: { data: Cutsheet }) {
  const t = data.trimPull;
  const h = data.header;
  return (
    <div className="mx-auto w-[7.5in] bg-white p-3 font-sans text-[10px] leading-tight text-black">
      <h2 className="mb-2 text-center text-base font-bold uppercase tracking-wide underline">
        Trim Pull Sheet
      </h2>
      <div className="mb-3 grid w-72 grid-cols-[auto_1fr] gap-x-2 gap-y-0.5 text-[10px]">
        <span className="font-bold uppercase">Job</span>
        <span className="border-b border-black px-1">{h.project || " "}</span>
        <span className="font-bold uppercase">Builder</span>
        <span className="border-b border-black px-1">{h.builder || " "}</span>
        <span className="font-bold uppercase">Lot</span>
        <span className="border-b border-black px-1">{h.lot || " "}</span>
        <span className="font-bold uppercase">House Type</span>
        <span className="border-b border-black px-1">{h.houseType || " "}</span>
      </div>

      <TrimSection title="Registers" prefix="trim.registers" items={TRIM_REGISTERS} map={t.registers} extras={t.registersExtra} extraPrefix="trim.registersExtra" />
      <TrimSection title="Grill" prefix="trim.grill" items={TRIM_GRILL} map={t.grill} extras={t.grillExtra} extraPrefix="trim.grillExtra" />
      <TrimSection title="Floor Reg" prefix="trim.floorReg" items={TRIM_FLOOR_REG} map={t.floorReg} extras={t.floorRegExtra} extraPrefix="trim.floorRegExtra" />
      <TrimSection title="Fans" prefix="trim.fans" items={TRIM_FANS} map={t.fans} extras={t.fansExtra} extraPrefix="trim.fansExtra" />
      <p className="mt-1 text-[8px] text-neutral-500">
        Totals fill in automatically when the sheet prints.
      </p>
    </div>
  );
}

function TrimSection<T extends string>({
  title,
  prefix,
  items,
  map,
  extras,
  extraPrefix,
}: {
  title: string;
  prefix: string;
  items: readonly T[];
  map: Record<T, TrimRow>;
  extras: TrimExtraRow[];
  extraPrefix: string;
}) {
  const extraCount = Math.max(EXTRA_ROWS, extras.length + 1);
  return (
    <table className="mb-3 w-full border-collapse">
      <thead>
        <tr>
          <th className="w-36 border border-black bg-neutral-100 px-1 py-0.5 text-left uppercase">{title}</th>
          {ZONE_LABELS.map((z) => (
            <th key={z} className="border border-black bg-neutral-100 px-1 py-0.5 text-center uppercase">{z}</th>
          ))}
          <th className="w-14 border border-black bg-neutral-100 px-1 py-0.5 text-center uppercase">Total</th>
        </tr>
      </thead>
      <tbody>
        {items.map((item) => (
          <tr key={item}>
            <td className="border border-black px-1 py-0.5 font-semibold">{item}</td>
            {ZONES.map((z) => (
              <td key={z} className="border border-black p-0.5 text-center">
                <QtyInput name={`${prefix}.${item}.${z}`} value={map[item][z]} />
              </td>
            ))}
            <td className="border border-black px-1 py-0.5 text-center font-bold tabular-nums text-neutral-500">
              {total(map[item]) || ""}
            </td>
          </tr>
        ))}
        {Array.from({ length: extraCount }).map((_, i) => {
          const row = extras[i];
          return (
            <tr key={`x${i}`}>
              <td className="border border-black p-0.5">
                <TextInput name={`${extraPrefix}.${i}.label`} value={row?.label ?? ""} className="w-full" />
              </td>
              {ZONES.map((z) => (
                <td key={z} className="border border-black p-0.5 text-center">
                  <QtyInput name={`${extraPrefix}.${i}.${z}`} value={row?.[z] ?? 0} />
                </td>
              ))}
              <td className="border border-black px-1 py-0.5 text-center font-bold tabular-nums text-neutral-500">
                {row ? total(row) || "" : ""}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
