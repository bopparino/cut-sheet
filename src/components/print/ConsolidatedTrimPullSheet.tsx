import type { Cutsheet } from "@/lib/schema";
import { TRIM_FANS, TRIM_FLOOR_REG, TRIM_GRILL, TRIM_REGISTERS } from "@/lib/schema";
import { consolidateTrimPull } from "@/lib/trim-rules";
import { TrimSection, TrimSheetLines } from "@/components/print/TrimPullSheet";

const TRIM_PAGE_CSS = "@page { size: 8.5in 14in; margin: 0.4in; }";

type Props = {
  // Every cutsheet sharing the house's property number.
  sheets: Cutsheet[];
  embedded?: boolean;
};

// The house's model, shared prefix across the sheets' house types (they differ
// only by option/zone), falling back to the main sheet's full name.
function commonModel(sheets: Cutsheet[]): string {
  const names = sheets.map((s) => s.header.houseType ?? "");
  if (names.length <= 1) return names[0] ?? "";
  let prefix = names[0];
  for (const n of names.slice(1)) {
    let i = 0;
    while (i < prefix.length && i < n.length && prefix[i] === n[i]) i++;
    prefix = prefix.slice(0, i);
  }
  prefix = prefix.replace(/[\s\-–—]+$/, "").trim();
  return prefix.length >= 3 ? prefix : names[0];
}

// Whole-house TRIM PULL SHEET: the four sections summed across every cutsheet
// sharing the property number, keeping the Zone 1/2/3/Base columns (each sheet
// already carries its trim in the right column). Same table layout as the
// per-sheet trim so it reads identically to Kimmy's paper sheet.
export function ConsolidatedTrimPullSheet({ sheets, embedded = false }: Props) {
  const t = consolidateTrimPull(sheets);
  const h = sheets[0].header;
  const zones = [...new Set(sheets.map((s) => s.header.zone).filter(Boolean))];

  return (
    <div className="font-sans text-black">
      {!embedded && <style>{TRIM_PAGE_CSS}</style>}
      <header className="mb-3 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold uppercase tracking-tight underline">Trim Pull Sheet</h1>
          <div className="mt-2 grid w-96 grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-[10pt]">
            <span className="font-bold uppercase">Job</span>
            <span className="border-b border-black px-1">{h.project}</span>
            <span className="font-bold uppercase">Builder</span>
            <span className="border-b border-black px-1">{h.builder}</span>
            <span className="font-bold uppercase">Lot</span>
            <span className="border-b border-black px-1">{h.lot}</span>
            <span className="font-bold uppercase">House Type</span>
            <span className="border-b border-black px-1">{commonModel(sheets)}</span>
            <span className="font-bold uppercase">Prop #</span>
            <span className="border-b border-black px-1">{h.propNumber}</span>
          </div>
        </div>
        <div className="text-right text-xs text-neutral-500">
          <div className="font-semibold text-black">Prop # {h.propNumber || "—"}</div>
          <div>
            Whole house · {sheets.length} sheet{sheets.length === 1 ? "" : "s"}
            {zones.length > 0 ? ` · Zone${zones.length === 1 ? "" : "s"} ${zones.join(", ")}` : ""}
          </div>
        </div>
      </header>

      {/* Same banner as the pick ticket: this is already summed across zones. */}
      <div className="mb-4 border-2 border-black bg-neutral-100 px-3 py-2 text-center text-[12pt] font-bold uppercase tracking-wide">
        This includes all items across all zones
      </div>

      <TrimSection title="Registers" items={TRIM_REGISTERS} map={t.registers} extras={t.registersExtra} />
      <TrimSection title="Grill" items={TRIM_GRILL} map={t.grill} extras={t.grillExtra} />
      <TrimSection title="Floor Reg" items={TRIM_FLOOR_REG} map={t.floorReg} extras={t.floorRegExtra} />
      <TrimSection title="Fans" items={TRIM_FANS} map={t.fans} extras={t.fansExtra} />
      <TrimSheetLines sheets={sheets} />
    </div>
  );
}
