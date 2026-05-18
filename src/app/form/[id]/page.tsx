import { notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HeaderFields } from "@/components/cutsheet/HeaderFields";
import { Duct60Section } from "@/components/cutsheet/Duct60Section";
import { db } from "@/lib/db";
import { CutsheetSchema } from "@/lib/schema";
import { deleteCutsheet, updateCutsheet } from "@/lib/actions";

type CutsheetRow = { id: number; data: string; updated_at: string };

const FORM_ID = "cutsheet-form";

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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Cutsheet #{row.id}</h1>
          <p className="text-xs text-muted-foreground">Updated {row.updated_at}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <PdfLink id={row.id} ticket="stock">Stock PDF</PdfLink>
          <PdfLink id={row.id} ticket="custom">Custom PDF</PdfLink>
          <PdfLink id={row.id} ticket="truck">Truck PDF</PdfLink>
          <Button type="submit" form={FORM_ID} size="sm">Save</Button>
          <form action={remove}>
            <Button type="submit" variant="destructive" size="sm">Delete</Button>
          </form>
        </div>
      </div>

      <form id={FORM_ID} action={update} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Header</CardTitle>
          </CardHeader>
          <CardContent>
            <HeaderFields initial={parsed.data.header} />
          </CardContent>
        </Card>

        <Duct60Section values={parsed.data.stock.duct60} />
      </form>

      <p className="text-sm text-muted-foreground">
        More qty sections (Custom Duct, OV Pipe, RND Pipe, etc.) land in the next iteration —
        each is a 1-line addition once a section component exists for its row shape.
      </p>
    </div>
  );
}

function PdfLink({ id, ticket, children }: { id: number; ticket: string; children: React.ReactNode }) {
  return (
    <Link
      href={`/api/pdf/${id}/${ticket}`}
      target="_blank"
      className="text-sm text-muted-foreground underline-offset-4 hover:underline"
    >
      {children}
    </Link>
  );
}
