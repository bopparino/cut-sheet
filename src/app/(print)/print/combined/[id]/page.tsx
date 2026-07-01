import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { CutsheetSchema } from "@/lib/schema";
import { TicketSheet } from "@/components/print/TicketSheet";
import { FilledCutSheet } from "@/components/cutsheet/replica/FilledCutSheet";
import { FittingsSheet, type FittingImage } from "@/components/print/FittingsSheet";
import { PrintControls } from "@/components/print/PrintControls";
import { LEGAL_PAGE_CSS } from "@/components/cutsheet/replica/LegalScalePage";

// The one-click shop document: every printable output for a cutsheet stacked
// into a single Legal (8.5×14) print job — Stock, Custom, Truck tickets, the
// filled cut sheet, and the fittings contact sheet. Printed by the browser
// (PrintControls opens the dialog), so the user selects the shop's network
// printer or a local printer. Static `combined` segment avoids the
// /print/[id]/[ticket] dynamic route.
export default async function CombinedPrintPage({
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

  const images = db
    .prepare<[number], FittingImage>(
      `SELECT id, filename FROM attachments WHERE cutsheet_id = ? AND kind = 'image'
       ORDER BY created_at ASC, id ASC`,
    )
    .all(numeric);

  const title = (d.name || "").trim() || `Cutsheet #${row.id}`;

  return (
    <div>
      <style>{LEGAL_PAGE_CSS}</style>
      <PrintControls title={title} />

      <TicketSheet cutsheet={d} cutsheetId={row.id} updatedAt={row.updated_at} ticket="stock" />
      <TicketSheet cutsheet={d} cutsheetId={row.id} updatedAt={row.updated_at} ticket="custom" pageBreakBefore />
      <TicketSheet cutsheet={d} cutsheetId={row.id} updatedAt={row.updated_at} ticket="truck" pageBreakBefore />

      <div className="break-before-page" />
      <FilledCutSheet data={d} />

      <div className="break-before-page" />
      <FittingsSheet cutsheet={d} cutsheetId={row.id} images={images} embedded />
    </div>
  );
}

export const dynamic = "force-dynamic";
