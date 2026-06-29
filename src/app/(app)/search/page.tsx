import Link from "next/link";
import { ChevronRight, AlertTriangle, Plus } from "lucide-react";
import { db } from "@/lib/db";
import { relativeTime } from "@/lib/utils";

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
type DupRef = { lot: string; siblingId: number; siblingDate: string };

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

  const { ids: dupLotIds, lots: dupLots, refs } = findDuplicates();
  const hasFilters =
    !!(filters.name || filters.builder || filters.lot || filters.deliveryFrom || filters.deliveryTo);

  return (
    <div>
      <header className="sticky top-0 z-20 flex items-center gap-4 border-b border-border bg-background/90 px-8 py-[18px] backdrop-blur">
        <div className="min-w-0">
          <h1 className="text-[21px] font-bold tracking-[-0.02em] text-foreground">Search</h1>
          <p className="font-mono-data mt-0.5 text-[12px] text-[var(--text-3)]">
            Filter by name, builder, lot, and delivery date
          </p>
        </div>
        <Link
          href="/form/new"
          className="btn-glow ml-auto inline-flex h-9 items-center gap-1.5 rounded-sm bg-primary px-4 text-[13px] font-semibold text-primary-foreground"
        >
          <Plus className="h-4 w-4" /> New cutsheet
        </Link>
      </header>

      <div className="px-8 py-7">
        <form
          method="get"
          action="/search"
          className="flex flex-wrap items-end gap-3.5 rounded-sm border border-border bg-card p-[18px]"
        >
          <Field label="Name" name="name" defaultValue={filters.name} placeholder="Job name" className="min-w-[180px] flex-1" />
          <Field label="Builder" name="builder" defaultValue={filters.builder} placeholder="Builder" className="min-w-[160px] flex-1" />
          <Field label="Lot" name="lot" defaultValue={filters.lot} placeholder="Lot" mono className="w-[110px]" />
          <Field label="Delivery from" name="deliveryFrom" type="date" defaultValue={filters.deliveryFrom} mono className="w-[150px]" />
          <Field label="Delivery to" name="deliveryTo" type="date" defaultValue={filters.deliveryTo} mono className="w-[150px]" />
          <Link
            href="/search"
            className="inline-flex h-[38px] items-center rounded-sm border border-input bg-card px-3.5 text-[13px] font-semibold text-foreground hover:bg-accent"
          >
            Clear
          </Link>
        </form>

        <div className="mb-3 mt-5 flex items-center gap-3 text-[13px]">
          <span className="font-mono-data text-[var(--text-2)]">
            <span className="font-semibold text-foreground">{rows.length}</span> result{rows.length === 1 ? "" : "s"}
          </span>
          {dupLots.size > 0 && (
            <span className="font-mono-data inline-flex items-center gap-1.5" style={{ color: "var(--danger-fg)" }}>
              <AlertTriangle className="h-3.5 w-3.5" />
              {dupLots.size} possible duplicate lot{dupLots.size === 1 ? "" : "s"}
            </span>
          )}
        </div>

        {rows.length === 0 ? (
          <div className="rounded-sm border border-border bg-card py-12 text-center text-[13.5px] text-[var(--text-2)]">
            {hasFilters ? (
              "No cutsheets match these filters."
            ) : (
              <>
                No cutsheets yet.{" "}
                <Link href="/form/new" className="font-semibold text-foreground underline">
                  Create one
                </Link>
                .
              </>
            )}
          </div>
        ) : (
          <ul className="overflow-hidden rounded-sm border border-border bg-card">
            {rows.map((row) => (
              <ResultRow key={row.id} row={row} isDup={dupLotIds.has(row.id)} ref_={refs.get(row.id)} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function ResultRow({ row, isDup, ref_ }: { row: CutsheetRow; isDup: boolean; ref_?: DupRef }) {
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
    <li className="border-b border-[var(--divider)] last:border-0">
      <Link href={`/form/${row.id}`} className="flex items-center gap-3.5 px-[18px] py-3.5 transition-colors hover:bg-[var(--row-tint)]">
        <span className="font-mono-data w-[42px] shrink-0 text-[12px] text-[var(--text-3)]">#{row.id}</span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-[14px] font-semibold text-foreground">{title}</span>
            {isDup && <span className="chip chip-danger">Dup lot</span>}
          </div>
          {meta && <div className="font-mono-data truncate text-[12px] text-[var(--text-3)]">{meta}</div>}
          {ref_ && (
            <div className="font-mono-data truncate text-[12px]" style={{ color: "var(--danger-fg)" }}>
              Shares Lot {ref_.lot} with #{ref_.siblingId} (Del {ref_.siblingDate})
            </div>
          )}
        </div>
        <span className="font-mono-data shrink-0 text-[11.5px] text-[var(--text-3)]">{relativeTime(row.updated_at)}</span>
        <ChevronRight className="h-4 w-4 shrink-0 text-[var(--text-ghost)]" />
      </Link>
    </li>
  );
}

function Field({
  label,
  name,
  type = "text",
  defaultValue,
  placeholder,
  mono,
  className,
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue: string;
  placeholder?: string;
  mono?: boolean;
  className?: string;
}) {
  return (
    <label className={`flex flex-col gap-1.5 ${className ?? ""}`}>
      <span className="label-caps">{label}</span>
      <input
        name={name}
        type={type}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className={`h-[38px] rounded-sm border border-input bg-card px-[11px] text-[13.5px] outline-none ${mono ? "font-mono-data text-[13px]" : ""}`}
      />
    </label>
  );
}

// Conservative dup rule: both cutsheets share a non-empty lot and have delivery
// dates within DUPLICATE_WINDOW_DAYS. Same propNumber (house zones) and
// differing non-empty builders are excluded. `refs` adds, per flagged row, the
// first sibling it collides with — read-only, for the cross-reference note.
function findDuplicates(): { ids: Set<number>; lots: Set<string>; refs: Map<number, DupRef> } {
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
  const refs = new Map<number, DupRef>();
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
        const diff = Math.abs(new Date(x.deliveryDate).getTime() - new Date(y.deliveryDate).getTime());
        if (diff <= windowMs) {
          ids.add(x.id);
          ids.add(y.id);
          lots.add(lotKey);
          if (!refs.has(x.id)) refs.set(x.id, { lot: lotKey, siblingId: y.id, siblingDate: y.deliveryDate });
          if (!refs.has(y.id)) refs.set(y.id, { lot: lotKey, siblingId: x.id, siblingDate: x.deliveryDate });
        }
      }
    }
  }
  return { ids, lots, refs };
}
