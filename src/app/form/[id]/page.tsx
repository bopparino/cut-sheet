import { notFound } from "next/navigation";
import { db } from "@/lib/db";

type CutsheetRow = { id: number; data: string; updated_at: string };

export default async function EditCutsheetPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const numeric = Number(id);
  if (!Number.isInteger(numeric)) notFound();

  const row = db
    .prepare<[number], CutsheetRow>("SELECT id, data, updated_at FROM cutsheets WHERE id = ?")
    .get(numeric);

  if (!row) notFound();

  return (
    <div className="space-y-2">
      <h1 className="text-2xl font-semibold tracking-tight">Cutsheet #{row.id}</h1>
      <p className="text-muted-foreground">Updated {row.updated_at}</p>
      <p className="text-muted-foreground">Edit UI lands in the next iteration.</p>
    </div>
  );
}
