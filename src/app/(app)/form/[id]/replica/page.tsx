import { notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CutsheetForm } from "@/components/cutsheet/CutsheetForm";
import { ShopCutSheetReplica } from "@/components/cutsheet/replica/ShopCutSheetReplica";
import { CutSheetReplica } from "@/components/cutsheet/replica/CutSheetReplica";
import { PhotosCard } from "@/components/cutsheet/PhotosCard";
import { DocumentsCard } from "@/components/cutsheet/DocumentsCard";
import { db } from "@/lib/db";
import { CutsheetSchema } from "@/lib/schema";
import { updateCutSheetReplica } from "@/lib/actions";

type CutsheetRow = { id: number; data: string; updated_at: string };

const FORM_ID = "shop-cutsheet-replica-form";

// Editable 1:1 replica of the two-page cut sheet. Writes the same schema fields
// the card form does (via updateCutSheetReplica) and outputs a digitally-filled
// PDF. Photo/document uploads cover the sketch-on-paper sections (fitting
// drawings, register schedules) that don't translate to digital editing.
export default async function ShopReplicaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
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
  const d = parsed.data;

  const photos = db
    .prepare<[number], { id: number; filename: string }>(
      `SELECT id, filename FROM attachments
       WHERE cutsheet_id = ? AND kind = 'image'
       ORDER BY created_at ASC, id ASC`,
    )
    .all(numeric);
  const documents = db
    .prepare<[number], { id: number; filename: string; size: number; mime: string }>(
      `SELECT id, filename, size, mime FROM attachments
       WHERE cutsheet_id = ? AND kind = 'document'
       ORDER BY created_at ASC, id ASC`,
    )
    .all(numeric);

  const save = updateCutSheetReplica.bind(null, numeric);

  return (
    <div key={row.id} className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Replica view · Pages 1–2
          </p>
          <input
            type="text"
            name="name"
            form={FORM_ID}
            defaultValue={d.name}
            aria-label="Cutsheet name"
            placeholder={`Cutsheet #${row.id}`}
            className="-mx-1 w-full max-w-xl rounded bg-transparent px-1 text-xl font-semibold tracking-tight outline-none placeholder:text-muted-foreground/60 focus-visible:bg-accent/50"
          />
          <p className="mt-0.5 text-xs text-muted-foreground">
            #{row.id} · Updated {row.updated_at} ·{" "}
            <Link href={`/form/${row.id}`} className="underline underline-offset-4">
              switch to card form
            </Link>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href={`/api/pdf/${row.id}/filled`}
            target="_blank"
            className="text-sm font-medium text-foreground underline-offset-4 hover:underline"
          >
            Filled PDF
          </Link>
          {(["stock", "custom", "truck"] as const).map((t) => (
            <Link
              key={t}
              href={`/api/pdf/${row.id}/${t}`}
              target="_blank"
              className="text-sm text-muted-foreground underline-offset-4 hover:underline"
            >
              {{ stock: "Stock PDF", custom: "Custom PDF", truck: "Truck PDF" }[t]}
            </Link>
          ))}
          <Button type="submit" form={FORM_ID} size="sm">
            Save
          </Button>
        </div>
      </div>

      <p className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
        Editable two-page cut sheet — every box is a real field. Saving writes
        the same data the Stock / Custom / Truck PDFs read and produces the
        Filled PDF above. Use Photos / Documents below for fitting sketches and
        register schedules that are easier drawn than typed.
      </p>

      <CutsheetForm formId={FORM_ID} action={save} className="space-y-6">
        <div className="overflow-x-auto rounded-md border bg-neutral-100 p-4">
          <ShopCutSheetReplica data={d} />
        </div>
        <div className="overflow-x-auto rounded-md border bg-neutral-100 p-4">
          <CutSheetReplica data={d} />
        </div>
      </CutsheetForm>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <PhotosCard cutsheetId={numeric} photos={photos} />
        <DocumentsCard cutsheetId={numeric} documents={documents} />
      </div>
    </div>
  );
}

export const dynamic = "force-dynamic";
