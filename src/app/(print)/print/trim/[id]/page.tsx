import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { CutsheetSchema } from "@/lib/schema";
import { TrimPullSheet } from "@/components/print/TrimPullSheet";

// Print page for the trim pull sheet. The foreman packet renders this via
// Puppeteer at Legal. Static `trim` segment wins over the sibling
// /print/[id]/[ticket] dynamic route.
export default async function TrimPrintPage({
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

  return <TrimPullSheet cutsheet={parsed.data} cutsheetId={row.id} />;
}

export const dynamic = "force-dynamic";
