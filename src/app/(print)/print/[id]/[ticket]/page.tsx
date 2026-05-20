import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { CutsheetSchema, type TicketKind } from "@/lib/schema";
import { TicketSheet } from "@/components/print/TicketSheet";

type CutsheetRow = { id: number; data: string; updated_at: string };

// Renders one printable ticket for a single cutsheet. Puppeteer navigates
// here and page.pdf()s the result. For house-combined output see
// /print/house/[propNumber]/[lot]/[ticket].
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

  return (
    <TicketSheet
      cutsheet={parsed.data}
      cutsheetId={row.id}
      updatedAt={row.updated_at}
      ticket={ticket as TicketKind}
    />
  );
}

export const dynamic = "force-dynamic";
