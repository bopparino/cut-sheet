import { buildConsolidatedTicket } from "@/lib/ticket-rules";
import type { Cutsheet, TicketKind } from "@/lib/schema";

type Props = {
  // Every cutsheet sharing the house's property number. The first (main) sheet
  // supplies the header; the rows are summed across all of them.
  sheets: Cutsheet[];
  ticket: TicketKind;
  pageBreakBefore?: boolean;
};

const TICKET_TITLES: Record<TicketKind, string> = {
  stock: "Pick Ticket — Stock Duct",
  custom: "Pick Ticket — Custom Duct",
  truck: "Pick Ticket — Truck Drivers",
};

// House-level pick ticket: one consolidated list per ticket type, summed over
// all of the house's cutsheets (zones + options). Header comes from the main
// sheet; house type is intentionally the main sheet's (the shop identifies the
// house by its base model), and a small note says how many sheets were merged.
// The header house type: every sheet's houseType shares a model prefix
// ("*JADE - D422 - ...") that differs only by option/zone, so the shared
// prefix is the house's model. Falls back to the main sheet's full name.
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

export function ConsolidatedTicketSheet({ sheets, ticket, pageBreakBefore = false }: Props) {
  const rows = buildConsolidatedTicket(sheets, ticket);
  const h = sheets[0].header;

  const headerPairs: Array<[string, string]> = [
    ["Builder", h.builder],
    ["Delivery Date", h.deliveryDate],
    ["Project", h.project],
    ["Project Code", h.projectCode],
    ["House Type", commonModel(sheets)],
    ["Foreman", h.foreman],
    ["Lot / Blk / Sec", [h.lot, h.block, h.section].filter(Boolean).join(" / ")],
    ["Region", h.region],
    ["Prop #", h.propNumber],
    ["Option", h.option],
  ].filter((pair): pair is [string, string] => Boolean(pair[1]));

  const zones = [...new Set(sheets.map((s) => s.header.zone).filter(Boolean))];

  return (
    <div
      className={`mx-auto max-w-[7.5in] px-6 py-8 font-sans text-[11pt] leading-snug print:px-0 print:py-0 ${pageBreakBefore ? "break-before-page" : ""}`}
    >
      <header className="mb-3 flex items-end justify-between border-b-2 border-black pb-2">
        <div>
          <h1 className="text-2xl font-bold uppercase tracking-tight">{TICKET_TITLES[ticket]}</h1>
          <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-neutral-600">
            Whole house · {sheets.length} cutsheet{sheets.length === 1 ? "" : "s"}
            {zones.length > 0 ? ` · Zone${zones.length === 1 ? "" : "s"} ${zones.join(", ")}` : ""}
          </p>
        </div>
        <div className="text-right text-xs text-neutral-500">
          <div className="font-semibold text-black">Prop # {h.propNumber || "—"}</div>
          <div>Combined pick ticket</div>
        </div>
      </header>

      {/* The shop has to know this ticket is already summed across every zone,
          so they don't go hunting for a per-zone ticket that no longer exists. */}
      <div className="mb-5 border-2 border-black bg-neutral-100 px-3 py-2 text-center text-[12pt] font-bold uppercase tracking-wide">
        This includes all items across all zones
      </div>

      {headerPairs.length > 0 && (
        <section className="mb-6">
          <dl className="grid grid-cols-[max-content_1fr_max-content_1fr] gap-x-4 gap-y-1 text-[10pt]">
            {headerPairs.map(([label, value]) => (
              <Row key={label} label={label} value={value} />
            ))}
          </dl>
        </section>
      )}

      <section>
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b-2 border-black">
              <th className="py-1.5 text-left text-xs font-bold uppercase tracking-wide">Item</th>
              <th className="w-24 py-1.5 text-right text-xs font-bold uppercase tracking-wide">Qty</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={2} className="py-6 text-center text-sm text-neutral-500">
                  No items with quantities above zero.
                </td>
              </tr>
            ) : (
              rows.map((r, i) => (
                <tr key={i} className="border-b border-neutral-300">
                  <td className="py-1.5 pr-4">{r.label}</td>
                  <td className="py-1.5 text-right tabular-nums">{r.qty}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>

      <footer className="mt-8 flex justify-between border-t border-neutral-300 pt-2 text-[9pt] text-neutral-500">
        <span>
          Prop # {h.propNumber} · {TICKET_TITLES[ticket]}
        </span>
        <span>{sheets.length} sheet{sheets.length === 1 ? "" : "s"} combined</span>
      </footer>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt className="font-semibold text-neutral-700">{label}</dt>
      <dd className="text-black">{value}</dd>
    </>
  );
}
