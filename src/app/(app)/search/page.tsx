import Link from "next/link";
import { FileText, ChevronRight, AlertTriangle, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { db } from "@/lib/db";

type CutsheetRow = { id: number; data: string; created_at: string; updated_at: string };
type LotRow = {
  id: number;
  lot: string | null;
  deliveryDate: string | null;
  propNumber: string | null;
  builder: string | null;
};
type SearchParams = {
  name?: string;
  builder?: string;
  lot?: string;
  deliveryFrom?: string;
  deliveryTo?: string;
};

const DUPLICATE_WINDOW_DAYS = 14;

export const dynamic = "force-dynamic";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const filters = {
    name: (sp.name ?? "").trim(),
    builder: (sp.builder ?? "").trim(),
    lot: (sp.lot ?? "").trim(),
    deliveryFrom: (sp.deliveryFrom ?? "").trim(),
    deliveryTo: (sp.deliveryTo ?? "").trim(),
  };

  const escapeLike = (s: string) => s.replace(/[\\%_]/g, "\\$&");
  const wheres: string[] = [];
  const params: Record<string, string> = {};
  if (filters.name) {
    wheres.push("LOWER(json_extract(data, '$.name')) LIKE @name ESCAPE '\\'");
    params.name = `%${escapeLike(filters.name.toLowerCase())}%`;
  }
  if (filters.builder) {
    wheres.push("LOWER(json_extract(data, '$.header.builder')) LIKE @builder ESCAPE '\\'");
    params.builder = `%${escapeLike(filters.builder.toLowerCase())}%`;
  }
  if (filters.lot) {
    wheres.push("json_extract(data, '$.header.lot') = @lot");
    params.lot = filters.lot;
  }
  if (filters.deliveryFrom) {
    wheres.push("json_extract(data, '$.header.deliveryDate') >= @deliveryFrom");
    params.deliveryFrom = filters.deliveryFrom;
  }
  if (filters.deliveryTo) {
    wheres.push("json_extract(data, '$.header.deliveryDate') <= @deliveryTo");
    params.deliveryTo = filters.deliveryTo;
  }

  const allWheres = ["deleted_at IS NULL", ...wheres];
  const sql = `
    SELECT id, data, created_at, updated_at FROM cutsheets
    WHERE ${allWheres.join(" AND ")}
    ORDER BY updated_at DESC
    LIMIT 50
  `;
  const rows = db.prepare(sql).all(params) as CutsheetRow[];

  const { ids: dupLotIds, lots: dupLots } = findDuplicates();

  const hasFilters =
    !!(filters.name || filters.builder || filters.lot || filters.deliveryFrom || filters.deliveryTo);

  return (
    <div>
      <header className="sticky top-0 z-20 flex items-center gap-4 border-b border-border bg-background/85 px-8 py-4 backdrop-blur">
        <h1 className="text-xl font-bold tracking-tight">Search cutsheets</h1>
        <Link
          href="/form/new"
          className="btn-glow ml-auto inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-sm font-semibold text-primary-foreground"
        >
          <Plus className="h-4 w-4" /> New Cutsheet
        </Link>
      </header>

      <div className="px-8 py-7">
        {/* Filter row */}
        <form
          method="get"
          action="/search"
          className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-card p-4 shadow-[var(--shadow)]"
        >
          <Field label="Name" name="name" defaultValue={filters.name} className="min-w-[180px] flex-1" />
          <Field label="Builder" name="builder" defaultValue={filters.builder} className="min-w-[160px] flex-1" />
          <Field label="Lot" name="lot" defaultValue={filters.lot} className="w-28" />
          <Field label="Delivery from" name="deliveryFrom" type="date" defaultValue={filters.deliveryFrom} className="w-40" />
          <Field label="Delivery to" name="deliveryTo" type="date" defaultValue={filters.deliveryTo} className="w-40" />
          <button
            type="submit"
            className="btn-glow h-10 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground"
          >
            Filter
          </button>
          {hasFilters && (
            <Link
              href="/search"
              className="h-10 rounded-lg border border-border px-4 text-sm font-medium leading-10 text-muted-foreground hover:bg-secondary"
            >
              Clear
            </Link>
          )}
        </form>

        {/* Summary */}
        <div className="mb-3 mt-5 flex items-center gap-3 text-sm text-muted-foreground">
          <span>
            <span className="font-semibold text-foreground">{rows.length}</span> result
            {rows.length === 1 ? "" : "s"}
          </span>
          {dupLots.size > 0 && (
            <span className="inline-flex items-center gap-1.5 text-[var(--status-lost-text)]">
              <AlertTriangle className="h-3.5 w-3.5" />
              {dupLots.size} possible duplicate lot{dupLots.size === 1 ? "" : "s"}
            </span>
          )}
        </div>

        {rows.length === 0 ? (
          <div className="rounded-xl border border-border bg-card py-12 text-center text-sm text-muted-foreground">
            {hasFilters ? (
              "No cutsheets match these filters."
            ) : (
              <>
                No cutsheets yet.{" "}
                <Link href="/form/new" className="font-medium text-foreground underline">
                  Create one
                </Link>
                .
              </>
            )}
          </div>
        ) : (
          <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
            {rows.map((row) => (
              <ResultRow key={row.id} row={row} isDup={dupLotIds.has(row.id)} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function ResultRow({ row, isDup }: { row: CutsheetRow; isDup: boolean }) {
  const data = JSON.parse(row.data) as {
    name?: string;
    header?: { lot?: string; builder?: string; project?: string; deliveryDate?: string };
  };
  const h = data.header ?? {};
  const title =
    (data.name ?? "").trim() ||
    [h.builder, h.project].filter(Boolean).join(" · ") ||
    `Cutsheet #${row.id}`;
  const meta = [
    h.lot ? `Lot ${h.lot}` : null,
    h.builder || null,
    h.deliveryDate ? `Del ${h.deliveryDate}` : null,
  ]
    .filter(Boolean)
    .join(" · ");
  return (
    <li>
      <Link href={`/form/${row.id}`} className="flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-accent/40">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <FileText className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-semibold">{title}</span>
            {isDup && (
              <Badge variant="lost" title={`Shares a lot within ${DUPLICATE_WINDOW_DAYS} days`}>
                Dup Lot
              </Badge>
            )}
          </div>
          {meta && <div className="font-mono-data truncate text-xs text-muted-foreground">{meta}</div>}
        </div>
        <span className="shrink-0 text-xs text-muted-foreground">Updated {row.updated_at}</span>
        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
      </Link>
    </li>
  );
}

function Field({
  label,
  name,
  type = "text",
  defaultValue,
  className,
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue: string;
  className?: string;
}) {
  return (
    <label className={`flex flex-col gap-1 ${className ?? ""}`}>
      <span className="label-caps">{label}</span>
      <input
        name={name}
        type={type}
        defaultValue={defaultValue}
        className="h-10 rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
      />
    </label>
  );
}

// Conservative dup rule: both cutsheets have a delivery date within
// DUPLICATE_WINDOW_DAYS and a matching non-empty lot. Same propNumber (house
// zones) and differing non-empty builders are excluded as false positives.
function findDuplicates(): { ids: Set<number>; lots: Set<string> } {
  const all = db
    .prepare(
      `SELECT id,
        json_extract(data, '$.header.lot') AS lot,
        json_extract(data, '$.header.deliveryDate') AS deliveryDate,
        json_extract(data, '$.header.propNumber') AS propNumber,
        json_extract(data, '$.header.builder') AS builder
      FROM cutsheets
      WHERE deleted_at IS NULL
        AND json_extract(data, '$.header.lot') IS NOT NULL
        AND json_extract(data, '$.header.lot') != ''
        AND json_extract(data, '$.header.deliveryDate') IS NOT NULL
        AND json_extract(data, '$.header.deliveryDate') != ''`,
    )
    .all() as LotRow[];

  const byLot = new Map<string, LotRow[]>();
  for (const r of all) {
    if (!r.lot) continue;
    const key = r.lot.trim();
    const list = byLot.get(key) ?? [];
    list.push(r);
    byLot.set(key, list);
  }

  const ids = new Set<number>();
  const lots = new Set<string>();
  const windowMs = DUPLICATE_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  for (const [lotKey, group] of byLot) {
    if (group.length < 2) continue;
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        const x = group[i]!;
        const y = group[j]!;
        if (!x.deliveryDate || !y.deliveryDate) continue;
        const propX = (x.propNumber ?? "").trim();
        const propY = (y.propNumber ?? "").trim();
        if (propX && propX === propY) continue;
        const builderX = (x.builder ?? "").trim().toLowerCase();
        const builderY = (y.builder ?? "").trim().toLowerCase();
        if (builderX && builderY && builderX !== builderY) continue;
        const diff = Math.abs(
          new Date(x.deliveryDate).getTime() - new Date(y.deliveryDate).getTime(),
        );
        if (diff <= windowMs) {
          ids.add(x.id);
          ids.add(y.id);
          lots.add(lotKey);
        }
      }
    }
  }
  return { ids, lots };
}
