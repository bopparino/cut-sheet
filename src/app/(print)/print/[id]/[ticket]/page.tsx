import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { buildTicketSections } from "@/lib/ticket-rules";
import { CutsheetSchema, type TicketKind } from "@/lib/schema";

type CutsheetRow = { id: number; data: string; updated_at: string };

const TICKET_TITLES: Record<TicketKind, string> = {
  stock: "Stock Duct Ticket",
  custom: "Custom Duct Ticket",
  truck: "Truck Driver Ticket",
};

// Renders one printable ticket. Puppeteer navigates here and page.pdf()s
// the result, so this layout is *the* PDF — whatever Tailwind classes you
// apply here are what the printed sheet looks like.
export default async function PrintPage({
  params,
}: {
  params: Promise<{ id: string; ticket: string }>;
}) {
  const { id, ticket } = await params;
  if (ticket !== "stock" && ticket !== "custom" && ticket !== "truck") notFound();

  const numeric = Number(id);
  if (!Number.isInteger(numeric)) notFound();

  const row = db
    .prepare<[number], CutsheetRow>(
      "SELECT id, data, updated_at FROM cutsheets WHERE id = ? AND deleted_at IS NULL",
    )
    .get(numeric);
  if (!row) notFound();

  const parsed = CutsheetSchema.safeParse(JSON.parse(row.data));
  if (!parsed.success) notFound();

  const rows = buildTicketSections(parsed.data, ticket);
  const h = parsed.data.header;
  const name = parsed.data.name.trim();
  const printedAt = new Date().toISOString().slice(0, 16).replace("T", " ");

  // Project info goes in a 2-column dt/dd grid. Each pair only renders if the
  // value is set, so empty rows don't pad the printable header.
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
    <div className="mx-auto max-w-[7.5in] px-6 py-8 font-sans text-[11pt] leading-snug print:px-0 print:py-0">
      <header className="mb-6 flex items-end justify-between border-b-2 border-black pb-2">
        <h1 className="text-2xl font-bold uppercase tracking-tight">
          {TICKET_TITLES[ticket]}
        </h1>
        <div className="text-right text-xs">
          {name ? (
            <>
              <div className="font-semibold">{name}</div>
              <div className="text-neutral-500">Cutsheet #{row.id}</div>
            </>
          ) : (
            <div className="font-semibold">Cutsheet #{row.id}</div>
          )}
          <div className="text-neutral-500">Updated {row.updated_at}</div>
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
        <span>Printed {printedAt}</span>
        <span>
          Cutsheet #{row.id} · {TICKET_TITLES[ticket]}
        </span>
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

export const dynamic = "force-dynamic";
