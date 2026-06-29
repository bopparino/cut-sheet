import Link from "next/link";
import { Search as SearchIcon, Plus, TriangleAlert } from "lucide-react";
import { db } from "@/lib/db";
import { relativeTime, todayEastern } from "@/lib/utils";
import { getBuilderRollup } from "@/lib/builders";
import { BuildersTable } from "@/components/folders/BuildersTable";

type CutsheetRow = { id: number; data: string; updated_at: string };

export const dynamic = "force-dynamic";

export default async function BrowsePage() {
  const recent = db
    .prepare<[], CutsheetRow>(
      `SELECT id, data, updated_at FROM cutsheets
       WHERE deleted_at IS NULL ORDER BY updated_at DESC LIMIT 5`,
    )
    .all();

  const { builders, totalBuilders, totalCutsheets, unfiledCount } = getBuilderRollup(todayEastern());

  return (
    <div>
      <header className="sticky top-0 z-20 flex items-center gap-4 border-b border-border bg-background/90 px-8 py-[18px] backdrop-blur">
        <div className="min-w-0">
          <h1 className="text-[21px] font-bold tracking-[-0.02em] text-foreground">Browse</h1>
          <p className="font-mono-data mt-0.5 text-[12px] text-[var(--text-3)]">
            {totalBuilders.toLocaleString()} builders · {totalCutsheets.toLocaleString()} cutsheets
          </p>
        </div>
        <form action="/search" className="relative ml-auto hidden max-w-xs flex-1 sm:block">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-3)]" />
          <input
            name="name"
            placeholder="Find a builder"
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
        {unfiledCount > 0 && (
          <Link
            href="/search"
            className="flex items-center gap-3 rounded-sm border px-4 py-[13px]"
            style={{ background: "var(--warn-bg)", borderColor: "var(--warn-line)" }}
          >
            <TriangleAlert className="h-[18px] w-[18px] shrink-0" style={{ color: "var(--warn-fg)" }} />
            <span className="min-w-0">
              <span className="block text-[13.5px] font-semibold" style={{ color: "var(--warn-fg)" }}>
                {unfiledCount.toLocaleString()} cutsheet{unfiledCount === 1 ? "" : "s"} need sorting
              </span>
              <span className="font-mono-data block text-[11.5px]" style={{ color: "var(--warn-sub)" }}>
                Imported without a builder. File them so they roll up correctly.
              </span>
            </span>
            <span
              className="ml-auto rounded-sm border bg-card px-3 py-1.5 text-[12.5px] font-semibold"
              style={{ borderColor: "var(--warn-line)", color: "var(--warn-fg)" }}
            >
              Review
            </span>
          </Link>
        )}

        {/* Recent */}
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

        {/* Builders */}
        <section className="space-y-3">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="label-caps">Builders</h2>
            <span className="font-mono-data text-[11px] text-[var(--text-3)]">
              Click a builder to see communities
            </span>
          </div>
          {builders.length === 0 ? (
            <p className="rounded-sm border border-border bg-card px-4 py-8 text-center text-[13.5px] text-[var(--text-2)]">
              Nothing here yet. Start a new cutsheet and it will file under its builder.
            </p>
          ) : (
            <BuildersTable builders={builders} />
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
