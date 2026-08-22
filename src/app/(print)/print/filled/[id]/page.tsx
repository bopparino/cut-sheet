import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { CutsheetSchema } from "@/lib/schema";
import { FilledCutSheet } from "@/components/cutsheet/replica/FilledCutSheet";

// Print page for the digitally-filled cut sheet. /api/pdf/[id]/filled renders
// this via Puppeteer at 11x17. Static `filled` segment wins over the sibling
// /print/[id]/[ticket] dynamic route.
export default async function FilledPrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const numeric = Number(id);
  if (!Number.isInteger(numeric)) notFound();

  // No deleted_at filter on purpose: Ariya cites archived sheets (the 2026-08
  // legacy cleanup trashed ~3,600 of them) and its PDF route renders this
  // page. The app itself never links here for trashed sheets, and /api/pdf/
  // [id]/filled keeps its own non-deleted guard for the app path.
  const row = db
    .prepare<[number], { data: string }>(
      "SELECT data FROM cutsheets WHERE id = ?",
    )
    .get(numeric);
  if (!row) notFound();

  const parsed = CutsheetSchema.safeParse(JSON.parse(row.data));
  if (!parsed.success) notFound();

  return <FilledCutSheet data={parsed.data} />;
}

export const dynamic = "force-dynamic";
