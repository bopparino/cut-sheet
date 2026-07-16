import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { CutsheetSchema, type Cutsheet, type TicketKind } from "@/lib/schema";
import { ConsolidatedTicketSheet } from "@/components/print/ConsolidatedTicketSheet";

type Row = { id: number; data: string };

// The whole-house pick ticket: three consolidated tickets (stock, custom,
// truck) summed across every cutsheet sharing this property number - zones and
// options together, exactly what the shop pulls for one house. Driven by
// property number alone (Kimmy's rule); sheets order main-first (lowest zone).
export default async function HousePickTicketPage({
  params,
}: {
  params: Promise<{ propNumber: string }>;
}) {
  const { propNumber } = await params;
  const prop = decodeURIComponent(propNumber).trim();
  if (!prop) notFound();

  const rows = db
    .prepare<[string], Row>(
      `SELECT id, data FROM cutsheets
       WHERE deleted_at IS NULL
         AND TRIM(json_extract(data, '$.header.propNumber')) = ?
       ORDER BY
         CAST(json_extract(data, '$.header.zone') AS INTEGER) ASC,
         json_extract(data, '$.header.zone') ASC,
         id ASC`,
    )
    .all(prop);

  const sheets: Cutsheet[] = rows
    .map((r) => {
      const parsed = CutsheetSchema.safeParse(JSON.parse(r.data));
      return parsed.success ? parsed.data : null;
    })
    .filter((x): x is Cutsheet => x !== null);

  if (sheets.length === 0) notFound();

  const tickets: TicketKind[] = ["stock", "custom", "truck"];

  return (
    <div>
      {tickets.map((ticket, i) => (
        <ConsolidatedTicketSheet key={ticket} sheets={sheets} ticket={ticket} pageBreakBefore={i > 0} />
      ))}
    </div>
  );
}

export const dynamic = "force-dynamic";
