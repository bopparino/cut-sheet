import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { CutsheetSchema } from "@/lib/schema";
import { TicketSheet } from "@/components/print/TicketSheet";

// The three pick tickets (Stock, Custom, Truck) stacked for a single Letter
// (8.5×11) render — this is the tickets slice of the print packet. Static
// `tickets` segment avoids the /print/[id]/[ticket] dynamic route (same
// convention as filled/fittings).
export default async function TicketsPrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const numeric = Number(id);
  if (!Number.isInteger(numeric)) notFound();

  const row = db
    .prepare<[number], { id: number; data: string; updated_at: string }>(
      "SELECT id, data, updated_at FROM cutsheets WHERE id = ? AND deleted_at IS NULL",
    )
    .get(numeric);
  if (!row) notFound();

  const parsed = CutsheetSchema.safeParse(JSON.parse(row.data));
  if (!parsed.success) notFound();
  const d = parsed.data;

  return (
    <div>
      <style>{`@page { size: 8.5in 11in; margin: 0.4in; }`}</style>
      <TicketSheet cutsheet={d} cutsheetId={row.id} updatedAt={row.updated_at} ticket="stock" />
      <TicketSheet cutsheet={d} cutsheetId={row.id} updatedAt={row.updated_at} ticket="custom" pageBreakBefore />
      <TicketSheet cutsheet={d} cutsheetId={row.id} updatedAt={row.updated_at} ticket="truck" pageBreakBefore />
    </div>
  );
}

export const dynamic = "force-dynamic";
