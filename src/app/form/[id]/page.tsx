import { notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HeaderFields } from "@/components/cutsheet/HeaderFields";
import { db } from "@/lib/db";
import { CutsheetSchema } from "@/lib/schema";
import { deleteCutsheet, updateCutsheet } from "@/server/actions";

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

  const parsed = CutsheetSchema.safeParse(JSON.parse(row.data));
  if (!parsed.success) notFound();

  const update = updateCutsheet.bind(null, numeric);
  const remove = deleteCutsheet.bind(null, numeric);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Cutsheet #{row.id}</h1>
          <p className="text-xs text-muted-foreground">Updated {row.updated_at}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/api/pdf/${row.id}/stock`}
            target="_blank"
            className="text-sm text-muted-foreground underline-offset-4 hover:underline"
          >
            Stock PDF
          </Link>
          <Link
            href={`/api/pdf/${row.id}/custom`}
            target="_blank"
            className="text-sm text-muted-foreground underline-offset-4 hover:underline"
          >
            Custom PDF
          </Link>
          <Link
            href={`/api/pdf/${row.id}/truck`}
            target="_blank"
            className="text-sm text-muted-foreground underline-offset-4 hover:underline"
          >
            Truck PDF
          </Link>
          <form action={remove}>
            <Button type="submit" variant="destructive" size="sm">
              Delete
            </Button>
          </form>
        </div>
      </div>

      <form action={update} className="space-y-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Header</CardTitle>
            <Button type="submit" size="sm">
              Save
            </Button>
          </CardHeader>
          <CardContent>
            <HeaderFields initial={parsed.data.header} />
          </CardContent>
        </Card>
      </form>

      <p className="text-sm text-muted-foreground">
        Quantity sections (Plenum, 60&quot; Duct, Custom Duct, etc.) land in the next iteration.
      </p>
    </div>
  );
}
