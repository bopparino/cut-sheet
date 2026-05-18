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

// The print view is a normal Next.js page. Puppeteer navigates to it and
// calls page.pdf(); whatever Tailwind classes you use here, the PDF inherits.
// That means there's exactly one styling pass for screen + print.
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
    .prepare<[number], CutsheetRow>("SELECT id, data, updated_at FROM cutsheets WHERE id = ?")
    .get(numeric);
  if (!row) notFound();

  const parsed = CutsheetSchema.safeParse(JSON.parse(row.data));
  if (!parsed.success) notFound();

  const rows = buildTicketSections(parsed.data, ticket);
  const header = parsed.data.header;

  return (
    <div className="mx-auto max-w-[7in] p-6 text-sm text-black">
      <header className="mb-4 flex items-baseline justify-between border-b pb-2">
        <h1 className="text-xl font-bold">{TICKET_TITLES[ticket]}</h1>
        <span className="text-xs text-neutral-500">#{row.id}</span>
      </header>
      <dl className="mb-4 grid grid-cols-3 gap-x-4 gap-y-1 text-xs">
        {header.builder && (
          <>
            <dt className="font-medium">Builder</dt>
            <dd className="col-span-2">{header.builder}</dd>
          </>
        )}
        {header.project && (
          <>
            <dt className="font-medium">Project</dt>
            <dd className="col-span-2">{header.project}</dd>
          </>
        )}
        {header.lot && (
          <>
            <dt className="font-medium">Lot</dt>
            <dd className="col-span-2">{header.lot}</dd>
          </>
        )}
        {header.deliveryDate && (
          <>
            <dt className="font-medium">Delivery</dt>
            <dd className="col-span-2">{header.deliveryDate}</dd>
          </>
        )}
      </dl>
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b">
            <th className="py-1 text-left font-semibold">Item</th>
            <th className="w-20 py-1 text-right font-semibold">Qty</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={2} className="py-2 text-neutral-500">
                No items.
              </td>
            </tr>
          ) : (
            rows.map((r, i) => (
              <tr key={i} className="border-b border-neutral-200">
                <td className="py-1">{r.label}</td>
                <td className="py-1 text-right">{r.qty}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export const dynamic = "force-dynamic";
