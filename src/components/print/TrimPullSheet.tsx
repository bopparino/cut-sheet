import type { Cutsheet, TrimExtraRow, TrimRow } from "@/lib/schema";
import { TRIM_FANS, TRIM_FLOOR_REG, TRIM_GRILL, TRIM_REGISTERS } from "@/lib/schema";

// Printable TRIM PULL SHEET - the foreman-packet page mirroring Kimmie's
// paper sheet: per-item quantities across three zones + basement, TOTAL
// computed. Renders on Legal like every other packet page. Only rows with
// any quantity (plus all pre-printed items) appear the way the paper does:
// the fixed items always print, extra rows print only when labeled.

const TRIM_PAGE_CSS = "@page { size: 8.5in 14in; margin: 0.4in; }";
const ZONES = ["zone1", "zone2", "zone3", "base"] as const;
const ZONE_LABELS = ["ZONE 1", "ZONE 2", "ZONE 3", "BASE"] as const;
const total = (r: TrimRow) => r.zone1 + r.zone2 + r.zone3 + r.base;

type Props = { cutsheet: Cutsheet; cutsheetId: number; embedded?: boolean };

export function TrimPullSheet({ cutsheet, cutsheetId, embedded = false }: Props) {
  const t = cutsheet.trimPull;
  const h = cutsheet.header;
  return (
    <div className="font-sans text-black">
      {!embedded && <style>{TRIM_PAGE_CSS}</style>}
      <header className="mb-3 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold uppercase tracking-tight underline">Trim Pull Sheet</h1>
          <div className="mt-2 grid w-80 grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-[10pt]">
            <span className="font-bold uppercase">Job</span>
            <span className="border-b border-black px-1">{h.project}</span>
            <span className="font-bold uppercase">Builder</span>
            <span className="border-b border-black px-1">{h.builder}</span>
            <span className="font-bold uppercase">Lot</span>
            <span className="border-b border-black px-1">{h.lot}</span>
            <span className="font-bold uppercase">House Type</span>
            <span className="border-b border-black px-1">{h.houseType}</span>
          </div>
        </div>
        <div className="text-right text-xs">
          {cutsheet.name.trim() && <div className="font-semibold">{cutsheet.name.trim()}</div>}
          <div className="text-neutral-500">Cutsheet #{cutsheetId}</div>
        </div>
      </header>

      <TrimSection title="Registers" items={TRIM_REGISTERS} map={t.registers} extras={t.registersExtra} />
      <TrimSection title="Grill" items={TRIM_GRILL} map={t.grill} extras={t.grillExtra} />
      <TrimSection title="Floor Reg" items={TRIM_FLOOR_REG} map={t.floorReg} extras={t.floorRegExtra} />
      <TrimSection title="Fans" items={TRIM_FANS} map={t.fans} extras={t.fansExtra} />
      <TrimSheetLines sheets={[cutsheet]} />
    </div>
  );
}

// Register/grille lines typed on the cut sheet itself (page 2's free-text
// boxes; the Access import lands all its trim there, e.g. "11- 8x6  1- 10x6").
// The zone tables above only carry what was entered in the trim matrix, so
// without this block an imported sheet prints a trim pull that's entirely
// blank while the quantities sit on the cut sheet. Zone-tagged when the
// consolidated sheet passes several zones' cutsheets.
const SHEET_LINE_GROUPS = [
  ["Wall Registers", "wallRegs"],
  ["Grilles", "grills"],
  ["Filter Grills", "filterGrills"],
  ["Floor Registers", "floorRegs"],
] as const;

export function TrimSheetLines({ sheets }: { sheets: Cutsheet[] }) {
  const groups = SHEET_LINE_GROUPS.map(([title, key]) => ({
    title,
    entries: sheets.flatMap((s) => {
      const lines = s.formOnly[key].map((l) => l.trim()).filter(Boolean);
      if (lines.length === 0) return [];
      const zone = sheets.length > 1 && s.header.zone.trim() ? `Zone ${s.header.zone.trim()}: ` : "";
      return [zone + lines.join("   ")];
    }),
  })).filter((g) => g.entries.length > 0);

  if (groups.length === 0) return null;

  return (
    <table className="mb-4 w-full border-collapse text-[10pt]">
      <thead>
        <tr>
          <th colSpan={2} className="border-2 border-black bg-neutral-100 px-1.5 py-0.5 text-left uppercase">
            As listed on cut sheet
          </th>
        </tr>
      </thead>
      <tbody>
        {groups.map((g) => (
          <tr key={g.title}>
            <td className="w-44 border border-black px-1.5 py-0.5 font-semibold">{g.title}</td>
            <td className="border border-black px-1.5 py-0.5 tabular-nums">
              {g.entries.map((e, i) => (
                <div key={i}>{e}</div>
              ))}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// Exported so the whole-house consolidated trim sheet renders identical tables.
export function TrimSection<T extends string>({
  title,
  items,
  map,
  extras,
}: {
  title: string;
  items: readonly T[];
  map: Record<T, TrimRow>;
  extras: TrimExtraRow[];
}) {
  const rows: { label: string; row: TrimRow }[] = [
    ...items.map((i) => ({ label: i, row: map[i] })),
    ...extras.filter((x) => x.label.trim()).map((x) => ({ label: x.label, row: x })),
  ];
  return (
    <table className="mb-4 w-full border-collapse text-[10pt]">
      <thead>
        <tr>
          <th className="w-44 border-2 border-black bg-neutral-100 px-1.5 py-0.5 text-left uppercase">{title}</th>
          {ZONE_LABELS.map((z) => (
            <th key={z} className="border-2 border-black bg-neutral-100 px-1 py-0.5 text-center uppercase">{z}</th>
          ))}
          <th className="w-16 border-2 border-black bg-neutral-100 px-1 py-0.5 text-center uppercase">Total</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(({ label, row }, i) => (
          <tr key={i}>
            <td className="border border-black px-1.5 py-0.5 font-semibold">{label}</td>
            {ZONES.map((z) => (
              <td key={z} className="border border-black px-1 py-0.5 text-center tabular-nums">
                {row[z] || ""}
              </td>
            ))}
            <td className="border border-black px-1 py-0.5 text-center font-bold tabular-nums">
              {total(row) || ""}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
