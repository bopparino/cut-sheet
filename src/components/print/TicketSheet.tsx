import { buildTicketSections } from "@/lib/ticket-rules";
import type { Cutsheet, TicketKind } from "@/lib/schema";
import { formatDateTime } from "@/lib/utils";

type Props = {
  cutsheet: Cutsheet;
  cutsheetId: number;
  updatedAt: string;
  ticket: TicketKind;
  // When true, a CSS break-before-page is applied so Puppeteer starts this
  // ticket on a fresh PDF page. Used when stacking multiple zones in a
  // house-combined print.
  pageBreakBefore?: boolean;
  // When true, this is part of a combined house print — show the zone label
  // prominently in the header block so it's obvious which slice of the
  // combined PDF the reader is looking at.
  asPartOfHouse?: boolean;
};

const TICKET_TITLES: Record<TicketKind, string> = {
  stock: "Stock Duct Ticket",
  custom: "Custom Duct Ticket",
  truck: "Truck Driver Ticket",
};

export function TicketSheet({
  cutsheet,
  cutsheetId,
  updatedAt,
  ticket,
  pageBreakBefore = false,
  asPartOfHouse = false,
}: Props) {
  const rows = buildTicketSections(cutsheet, ticket);
  const h = cutsheet.header;
  const name = cutsheet.name.trim();

  const headerPairs: Array<[string, string]> = [
    ["Builder", h.builder],
    ["Date", h.date],
    ["Project", h.project],
    ["Delivery Date", h.deliveryDate],
    ["House Type", h.houseType],
    ["Foreman", h.foreman],
    ["Lot / Blk / Sec", [h.lot, h.block, h.section].filter(Boolean).join(" / ")],
    ["Region", h.region],
    ["Project Code", h.projectCode],
    ["Option", h.option],
    ["Prop #", h.propNumber],
    ["Zone", h.zone],
  ].filter((pair): pair is [string, string] => Boolean(pair[1]));

  return (
    <div
      className={`mx-auto max-w-[7.5in] px-6 py-8 font-sans text-[11pt] leading-snug print:px-0 print:py-0 ${pageBreakBefore ? "break-before-page" : ""}`}
    >
      <header className="mb-6 flex items-end justify-between border-b-2 border-black pb-2">
        <div>
          <h1 className="text-2xl font-bold uppercase tracking-tight">
            {TICKET_TITLES[ticket]}
          </h1>
          {asPartOfHouse && h.zone && (
            <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-neutral-600">
              Zone {h.zone}
            </p>
          )}
        </div>
        <div className="text-right text-xs">
          {name ? (
            <>
              <div className="font-semibold">{name}</div>
              <div className="text-neutral-500">Cutsheet #{cutsheetId}</div>
            </>
          ) : (
            <div className="font-semibold">Cutsheet #{cutsheetId}</div>
          )}
          <div className="text-neutral-500">Updated {formatDateTime(updatedAt)}</div>
        </div>
      </header>

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
              <th className="py-1.5 text-left text-xs font-bold uppercase tracking-wide">
                Item
              </th>
              <th className="w-24 py-1.5 text-right text-xs font-bold uppercase tracking-wide">
                Qty
              </th>
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
        <span>Cutsheet #{cutsheetId} · {TICKET_TITLES[ticket]}</span>
        {asPartOfHouse && h.zone && <span>Zone {h.zone}</span>}
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
