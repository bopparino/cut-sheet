import Link from "next/link";
import { Search as SearchIcon, Plus, ChevronRight, Home } from "lucide-react";
import { db } from "@/lib/db";
import { relativeTime } from "@/lib/utils";
import {
  getBuilderLevel,
  getSubdivisionLevel,
  getHouseTypeLevel,
  getHouseTypeSheets,
  getBrowseTotals,
} from "@/lib/builders";
import { BrowseLevel, BrowseSheets } from "@/components/browse/BrowseLevel";

type CutsheetRow = { id: number; data: string; updated_at: string };

export const dynamic = "force-dynamic";

// Browse drills Builder -> Subdivision -> House type -> sheets, all derived
// live from the header fields (see src/lib/builders.ts). The current level is
// whichever query params are present, so every level is a plain link - no
// client state, deep-linkable, and the breadcrumb always shows the full path
// (which matters when one house type name appears under many subdivisions).
export default async function BrowsePage({
  searchParams,
}: {
  searchParams: Promise<{ builder?: string; sub?: string; type?: string }>;
}) {
  const sp = await searchParams;
  const builder = sp.builder;
  const sub = sp.sub;
  const type = sp.type;

  const recent = db
    .prepare<[], CutsheetRow>(
      `SELECT id, data, updated_at FROM cutsheets
       WHERE deleted_at IS NULL ORDER BY updated_at DESC LIMIT 5`,
    )
    .all();

  const totals = getBrowseTotals();

  // Build the href for a level by carrying the parent params forward.
  const href = (params: { builder?: string; sub?: string; type?: string }) => {
    const q = new URLSearchParams();
    if (params.builder !== undefined) q.set("builder", params.builder);
    if (params.sub !== undefined) q.set("sub", params.sub);
    if (params.type !== undefined) q.set("type", params.type);
    const s = q.toString();
    return s ? `/browse?${s}` : "/browse";
  };

  // Breadcrumb segments for the path we're currently at.
  const crumbs: { label: string; href: string }[] = [];
  if (builder !== undefined) crumbs.push({ label: builder || "Unfiled", href: href({ builder }) });
  if (builder !== undefined && sub !== undefined)
    crumbs.push({ label: sub || "(No subdivision)", href: href({ builder, sub }) });
  if (builder !== undefined && sub !== undefined && type !== undefined)
    crumbs.push({ label: type || "(No house type)", href: href({ builder, sub, type }) });

  return (
    <div>
      <header className="sticky top-0 z-20 flex items-center gap-4 border-b border-border bg-background/90 px-8 py-[18px] backdrop-blur">
        <div className="min-w-0">
          <h1 className="text-[21px] font-bold tracking-[-0.02em] text-foreground">Browse</h1>
          <p className="font-mono-data mt-0.5 text-[12px] text-[var(--text-3)]">
            {totals.builders.toLocaleString()} builders · {totals.subdivisions.toLocaleString()} subdivisions ·{" "}
            {totals.cutsheets.toLocaleString()} cutsheets
          </p>
        </div>
        <form action="/search" className="relative ml-auto hidden max-w-xs flex-1 sm:block">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-3)]" />
          <input
            name="q"
            aria-label="Search cutsheets"
            className="h-9 w-full rounded-sm border border-input bg-card pl-9 pr-3 text-[13.5px] outline-none"
          />
        </form>
        <Link
          href="/form/new"
          className="btn-glow inline-flex h-9 items-center gap-1.5 rounded-sm bg-primary px-4 text-[13px] font-semibold text-primary-foreground"
        >
          <Plus className="h-4 w-4" /> New cutsheet
        </Link>
      </header>

      <div className="space-y-7 px-8 py-7">
        {/* Recent only shows at the top level, so drill-downs stay focused. */}
        {crumbs.length === 0 && (
          <section className="space-y-3">
            <h2 className="label-caps">Recent</h2>
            {recent.length === 0 ? (
              <p className="rounded-sm border border-border bg-card px-4 py-6 text-center text-[13.5px] text-[var(--text-2)]">
                No cutsheets yet.{" "}
                <Link href="/form/new" className="font-semibold text-foreground underline">
                  Create one
                </Link>
                .
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                {recent.map((row) => (
                  <RecentTile key={row.id} row={row} />
                ))}
              </div>
            )}
          </section>
        )}

        <section className="space-y-3">
          {/* Breadcrumb: Builder > Subdivision > House type */}
          <nav className="flex flex-wrap items-center gap-1.5 text-[13px]">
            <Link
              href="/browse"
              className="flex items-center gap-1 font-medium text-[var(--text-2)] hover:text-foreground"
            >
              <Home className="h-3.5 w-3.5" /> Builders
            </Link>
            {crumbs.map((c, i) => (
              <span key={i} className="flex items-center gap-1.5">
                <ChevronRight className="h-3.5 w-3.5 text-[var(--text-ghost)]" />
                {i === crumbs.length - 1 ? (
                  <span className="font-semibold text-foreground">{c.label}</span>
                ) : (
                  <Link href={c.href} className="font-medium text-[var(--text-2)] hover:text-foreground">
                    {c.label}
                  </Link>
                )}
              </span>
            ))}
          </nav>

          {/* Render the level matching the deepest present param. */}
          {builder === undefined ? (
            <BrowseLevel
              rows={getBuilderLevel()}
              childNoun="Subdivisions"
              countLabel="Builder"
              hrefFor={(b) => href({ builder: b })}
            />
          ) : sub === undefined ? (
            <BrowseLevel
              rows={getSubdivisionLevel(builder)}
              childNoun="House types"
              countLabel="Subdivision"
              hrefFor={(s) => href({ builder, sub: s })}
            />
          ) : type === undefined ? (
            <BrowseLevel
              rows={getHouseTypeLevel(builder, sub)}
              childNoun="—"
              countLabel="House type"
              hrefFor={(t) => href({ builder, sub, type: t })}
            />
          ) : (
            <BrowseSheets sheets={getHouseTypeSheets(builder, sub, type)} />
          )}
        </section>
      </div>
    </div>
  );
}

function RecentTile({ row }: { row: CutsheetRow }) {
  const parsed = JSON.parse(row.data) as {
    name?: string;
    header?: { lot?: string; builder?: string; project?: string };
  };
  const h = parsed.header ?? {};
  const title =
    (parsed.name ?? "").trim() ||
    [h.builder, h.project].filter(Boolean).join(" · ") ||
    `Cutsheet #${row.id}`;
  return (
    <Link
      href={`/form/${row.id}`}
      className="flex min-h-[118px] flex-col rounded-sm border border-border bg-card p-[14px] transition-colors hover:border-[#CDD2D7] hover:bg-[var(--tile-hover)]"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono-data text-[11px] text-[var(--text-3)]">#{row.id}</span>
        {h.lot ? (
          <span className="font-mono-data rounded-sm border border-border bg-[var(--fill)] px-1.5 py-px text-[10px] text-[var(--text-2)]">
            Lot {h.lot}
          </span>
        ) : null}
      </div>
      <div className="mt-2 line-clamp-2 text-[13.5px] font-semibold leading-snug text-foreground">{title}</div>
      <div className="font-mono-data mt-auto pt-2 text-[11px] text-[var(--text-3)]">
        {relativeTime(row.updated_at)}
      </div>
    </Link>
  );
}
