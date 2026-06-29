import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { CutsheetSchema, type TicketKind } from "@/lib/schema";
import { TicketSheet } from "@/components/print/TicketSheet";

type Row = { id: number; data: string; updated_at: string };

// Combined pick-ticket for a whole house - concatenates the requested ticket
// type for every cutsheet sharing the same propNumber + lot. Cutsheets are
// ordered by zone then id so the printed output matches the natural reading
// order of the house. Each ticket renders on its own PDF page via
// break-before-page applied to all but the first.
export default async function PrintHousePage({
  params,
}: {
  params: Promise<{ propNumber: string; lot: string; ticket: string }>;
}) {
  const { propNumber, lot, ticket } = await params;
  if (ticket !== "stock" && ticket !== "custom" && ticket !== "truck") notFound();
  if (!propNumber || !lot) notFound();

  const rows = db
    .prepare<[string, string], Row>(
      `SELECT id, data, updated_at FROM cutsheets
       WHERE deleted_at IS NULL
         AND json_extract(data, '$.header.propNumber') = ?
         AND json_extract(data, '$.header.lot') = ?
       ORDER BY
         CAST(json_extract(data, '$.header.zone') AS INTEGER) ASC,
         json_extract(data, '$.header.zone') ASC,
         id ASC`,
    )
    .all(propNumber, lot);

  if (rows.length === 0) notFound();

  const sheets = rows
    .map((row) => {
      const parsed = CutsheetSchema.safeParse(JSON.parse(row.data));
      return parsed.success
        ? { id: row.id, updatedAt: row.updated_at, data: parsed.data }
        : null;
    })
    .filter(<T,>(x: T | null): x is T => x !== null);

  if (sheets.length === 0) notFound();

  return (
    <div>
      {sheets.map((s, i) => (
        <TicketSheet
          key={s.id}
          cutsheet={s.data}
          cutsheetId={s.id}
          updatedAt={s.updatedAt}
          ticket={ticket as TicketKind}
          pageBreakBefore={i > 0}
          asPartOfHouse
        />
      ))}
    </div>
  );
}

export const dynamic = "force-dynamic";
