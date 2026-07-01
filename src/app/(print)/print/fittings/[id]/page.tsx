import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { CutsheetSchema } from "@/lib/schema";
import { FittingsSheet, type FittingImage } from "@/components/print/FittingsSheet";

// Print page for a cutsheet's fitting drawings. /api/pdf/[id]/fittings renders
// this via Puppeteer; the combined print view embeds the same component.
// Structured as /print/fittings/[id] (static first segment) so it never
// collides with the /print/[id]/[ticket] dynamic route.
export default async function FittingsPrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const numeric = Number(id);
  if (!Number.isInteger(numeric)) notFound();

  const row = db
    .prepare<[number], { id: number; data: string }>(
      "SELECT id, data FROM cutsheets WHERE id = ? AND deleted_at IS NULL",
    )
    .get(numeric);
  if (!row) notFound();

  const parsed = CutsheetSchema.safeParse(JSON.parse(row.data));
  if (!parsed.success) notFound();

  const images = db
    .prepare<[number], FittingImage>(
      `SELECT id, filename FROM attachments WHERE cutsheet_id = ? AND kind = 'image'
       ORDER BY created_at ASC, id ASC`,
    )
    .all(numeric);

  return <FittingsSheet cutsheet={parsed.data} cutsheetId={row.id} images={images} />;
}

export const dynamic = "force-dynamic";
