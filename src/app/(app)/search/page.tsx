import Link from "next/link";
import { ChevronRight, Plus, Search as SearchIcon } from "lucide-react";
import { db } from "@/lib/db";
import { relativeTime } from "@/lib/utils";

type CutsheetRow = { id: number; data: string; created_at: string; updated_at: string };
type SearchParams = {
  q?: string;
  deliveryFrom?: string;
  deliveryTo?: string;
};

export const dynamic = "force-dynamic";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const filters = {
    q: (sp.q ?? "").trim(),
    deliveryFrom: (sp.deliveryFrom ?? "").trim(),
    deliveryTo: (sp.deliveryTo ?? "").trim(),
  };

  const escapeLike = (s: string) => s.replace(/[\\%_]/g, "\\$&");
  const wheres: string[] = [];
  const params: Record<string, string> = {};

  // One query box matches across name, builder, project, and lot. Each term is
  // a case-insensitive substring; the fields are OR'd so a hit on any one
  // surfaces the row.
  if (filters.q) {
    params.q = `%${escapeLike(filters.q.toLowerCase())}%`;
    wheres.push(`(
      LOWER(json_extract(data, '$.name')) LIKE @q ESCAPE '\\'
      OR LOWER(json_extract(data, '$.header.builder')) LIKE @q ESCAPE '\\'
      OR LOWER(json_extract(data, '$.header.project')) LIKE @q ESCAPE '\\'
      OR LOWER(json_extract(data, '$.header.lot')) LIKE @q ESCAPE '\\'
    )`);
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
    LIMIT 100
  `;
  const rows = db.prepare(sql).all(params) as CutsheetRow[];

  const hasFilters = !!(filters.q || filters.deliveryFrom || filters.deliveryTo);

  return (
    <div>
      <header className="sticky top-0 z-20 flex items-center gap-4 border-b border-border bg-background/90 px-8 py-[18px] backdrop-blur">
        <div className="min-w-0">
          <h1 className="text-[21px] font-bold tracking-[-0.02em] text-foreground">Search</h1>
          <p className="font-mono-data mt-0.5 text-[12px] text-[var(--text-3)]">
            Search by name, builder, project, or lot
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
          <label className="flex min-w-[260px] flex-[2] flex-col gap-1.5">
            <span className="label-caps">Search</span>
            <span className="relative">
              <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-3)]" />
              <input
                name="q"
                autoFocus
                defaultValue={filters.q}
                className="h-[38px] w-full rounded-sm border border-input bg-card pl-9 pr-[11px] text-[13.5px] outline-none"
              />
            </span>
          </label>
          <Field label="Delivery from" name="deliveryFrom" type="date" defaultValue={filters.deliveryFrom} mono className="w-[150px]" />
          <Field label="Delivery to" name="deliveryTo" type="date" defaultValue={filters.deliveryTo} mono className="w-[150px]" />
          <button
            type="submit"
            className="btn-glow inline-flex h-[38px] items-center rounded-sm bg-primary px-4 text-[13px] font-semibold text-primary-foreground"
          >
            Search
          </button>
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
            {rows.length === 100 ? "+" : ""}
          </span>
        </div>

        {rows.length === 0 ? (
          <div className="rounded-sm border border-border bg-card py-12 text-center text-[13.5px] text-[var(--text-2)]">
            {hasFilters ? (
              "No cutsheets match your search."
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
              <ResultRow key={row.id} row={row} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function ResultRow({ row }: { row: CutsheetRow }) {
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
          <div className="truncate text-[14px] font-semibold text-foreground">{title}</div>
          {meta && <div className="font-mono-data truncate text-[12px] text-[var(--text-3)]">{meta}</div>}
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
  mono,
  className,
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue: string;
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
        className={`h-[38px] rounded-sm border border-input bg-card px-[11px] text-[13.5px] outline-none ${mono ? "font-mono-data text-[13px]" : ""}`}
      />
    </label>
  );
}
