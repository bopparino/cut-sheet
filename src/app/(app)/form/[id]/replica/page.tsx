import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Printer } from "lucide-react";
import { CutsheetForm } from "@/components/cutsheet/CutsheetForm";
import { ShopCutSheetReplica } from "@/components/cutsheet/replica/ShopCutSheetReplica";
import { CutSheetReplica } from "@/components/cutsheet/replica/CutSheetReplica";
import { AttachmentsCard, type AttachmentItem } from "@/components/cutsheet/AttachmentsCard";
import { PlansCard, type PlanItem } from "@/components/cutsheet/PlansCard";
import { db } from "@/lib/db";
import { CutsheetSchema } from "@/lib/schema";
import { listBuilderNames } from "@/lib/builders";
import { updateCutSheetReplica } from "@/lib/actions";
import { formatDateTime } from "@/lib/utils";

type CutsheetRow = { id: number; data: string; updated_at: string };

const FORM_ID = "shop-cutsheet-replica-form";

// Editable 1:1 replica of the two-page cut sheet. Writes the same schema fields
// the card form does (via updateCutSheetReplica) and outputs a digitally-filled
// PDF. The sheet itself keeps its unthemed print layout (untouched by the
// redesign); only the surrounding chrome is themed.
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

  const attachments = db
    .prepare<[number], AttachmentItem>(
      `SELECT id, filename, mime, size, kind FROM attachments WHERE cutsheet_id = ? AND kind != 'plan'
       ORDER BY created_at ASC, id ASC`,
    )
    .all(numeric);
  const plans = db
    .prepare<[number], PlanItem>(
      `SELECT id, filename, size FROM attachments WHERE cutsheet_id = ? AND kind = 'plan'
       ORDER BY created_at ASC, id ASC`,
    )
    .all(numeric);

  const builders = listBuilderNames();
  const save = updateCutSheetReplica.bind(null, numeric);
  const title = (d.name || "").trim() || `Cutsheet #${row.id}`;

  return (
    <div key={row.id}>
      <header className="sticky top-0 z-30 flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-border bg-background/85 px-6 py-3 backdrop-blur">
        <Link
          href="/browse"
          className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" /> Browse
        </Link>
        <div className="min-w-0 flex-1">
          <input
            type="text"
            name="name"
            form={FORM_ID}
            defaultValue={d.name}
            aria-label="Cutsheet name"
            placeholder={title}
            className="-mx-1 w-full max-w-md truncate rounded bg-transparent px-1 text-base font-bold tracking-tight outline-none placeholder:text-muted-foreground/60 focus-visible:bg-accent/50"
          />
          <p className="font-mono-data mt-0.5 px-0.5 text-[11px] text-muted-foreground">
            Replica view · Pages 1–2 · #{row.id} · Updated {formatDateTime(row.updated_at)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <Link
            href={`/api/pdf/${row.id}/packet`}
            target="_blank"
            className="btn-glow inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground"
          >
            <Printer className="h-4 w-4" /> Send to Shop
          </Link>
          <Link
            href={`/api/pdf/${row.id}/packet?download=1`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-input px-3 py-1.5 text-sm font-semibold text-foreground hover:bg-secondary"
          >
            <Printer className="h-4 w-4" /> Print Here
          </Link>
          <span className="mx-0.5 h-5 w-px bg-border" />
          <Link
            href={`/api/pdf/${row.id}/filled`}
            target="_blank"
            className="rounded-lg bg-primary/10 px-2.5 py-1.5 text-sm font-semibold text-primary hover:bg-primary/15"
          >
            Filled PDF
          </Link>
          {(["stock", "custom", "truck"] as const).map((t) => (
            <Link
              key={t}
              href={`/api/pdf/${row.id}/${t}`}
              target="_blank"
              className="rounded-lg px-2.5 py-1.5 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground"
            >
              {{ stock: "Stock", custom: "Custom", truck: "Truck" }[t]}
            </Link>
          ))}
          <button
            type="submit"
            form={FORM_ID}
            className="btn-glow rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
          >
            Save
          </button>
        </div>
      </header>

      <div className="space-y-5 px-6 py-7">
        <CutsheetForm formId={FORM_ID} action={save} className="space-y-6">
          <div className="overflow-x-auto rounded-xl border border-border bg-secondary p-4">
            <ShopCutSheetReplica data={d} builders={builders} />
          </div>
          <div className="overflow-x-auto rounded-xl border border-border bg-secondary p-4">
            <CutSheetReplica data={d} />
          </div>
        </CutsheetForm>

        <AttachmentsCard cutsheetId={numeric} attachments={attachments} />
        <PlansCard cutsheetId={numeric} plans={plans} />
      </div>
    </div>
  );
}

export const dynamic = "force-dynamic";
