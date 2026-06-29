import Link from "next/link";
import { Search as SearchIcon, Plus, ChevronRight, AlertTriangle } from "lucide-react";
import { db } from "@/lib/db";
import { formatDateTime, relativeTime, formatShortDate, todayEastern } from "@/lib/utils";
import { getBuilderRollup, type BuilderRow } from "@/lib/builders";

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
  const filedCount = builders.filter((b) => !b.unfiled).length;

  return (
    <div>
      <header className="sticky top-0 z-20 flex items-center gap-4 border-b border-border bg-background/85 px-8 py-4 backdrop-blur">
        <div className="min-w-0">
          <h1 className="text-2xl font-extrabold uppercase tracking-tight text-foreground">Browse</h1>
          <p className="font-mono-data mt-0.5 text-xs text-muted-foreground">
            {totalBuilders.toLocaleString()} builders · {totalCutsheets.toLocaleString()} cutsheets
          </p>
        </div>
        <form action="/search" className="relative ml-auto hidden max-w-md flex-1 sm:block">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            name="name"
            placeholder="Search name, builder, lot, then Enter"
            className="h-10 w-full rounded-lg border border-input bg-card pl-9 pr-3 text-sm outline-none transition-shadow focus:border-ring focus:ring-2 focus:ring-ring/25"
          />
        </form>
        <Link
          href="/form/new"
          className="btn-glow inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-sm font-semibold text-primary-foreground"
        >
          <Plus className="h-4 w-4" /> New Cutsheet
        </Link>
      </header>

      <div className="space-y-8 px-8 py-7">
        {/* Recent - compact strip, not floaty dashboard tiles */}
        <section className="space-y-2.5">
          <h2 className="label-caps">Recent</h2>
          {recent.length === 0 ? (
            <p className="rounded-lg border border-border bg-card px-4 py-6 text-center text-sm text-muted-foreground">
              No cutsheets yet.{" "}
              <Link href="/form/new" className="font-medium text-primary underline">
                Create one
              </Link>
              .
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
              {recent.map((row) => (
                <RecentTile key={row.id} row={row} />
              ))}
            </div>
          )}
        </section>

        {/* Builders - the organizing unit of the shop */}
        <section className="space-y-3">
          <div className="flex items-baseline gap-3 border-b border-border pb-2">
            <h2 className="label-caps">Builders</h2>
            <span className="font-mono-data text-[11px] text-muted-foreground">
              {filedCount} active{unfiledCount > 0 ? " + 1 unfiled" : ""}
            </span>
          </div>

          {unfiledCount > 0 && (
            <Link
              href="/search"
              className="flex items-center gap-2.5 rounded-lg border px-4 py-2.5 text-sm"
              style={{ background: "var(--warn-bg)", borderColor: "var(--warn-line)", color: "var(--warn-fg)" }}
            >
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span className="font-medium">
                {unfiledCount.toLocaleString()} unfiled import{unfiledCount === 1 ? "" : "s"} need sorting
              </span>
              <span className="label-caps ml-auto flex items-center gap-1">
                Sort now <ChevronRight className="h-3.5 w-3.5" />
              </span>
            </Link>
          )}

          {builders.length === 0 ? (
            <p className="rounded-lg border border-border bg-card px-4 py-8 text-center text-sm text-muted-foreground">
              Nothing here yet. Start a new cutsheet and it will file under its builder.
            </p>
          ) : (
            <div className="overflow-hidden rounded-lg border border-border bg-card">
              {/* Column header */}
              <div className="grid grid-cols-[minmax(0,1fr)_84px_84px_104px_72px_20px] items-center gap-4 border-b border-border bg-secondary/40 px-4 py-2">
                <span className="label-caps">Builder</span>
                <span className="label-caps text-right">Cutsheets</span>
                <span className="label-caps text-right">Active lots</span>
                <span className="label-caps text-right">Next delivery</span>
                <span className="label-caps text-right">Updated</span>
                <span />
              </div>
              {builders.map((b) => (
                <BuilderRowLink key={b.unfiled ? "__unfiled" : b.name} b={b} />
              ))}
            </div>
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
      className="group block rounded-lg border border-border bg-card px-3 py-2.5 transition-colors hover:border-[var(--clay-line)] hover:bg-accent/40"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono-data text-[11px] text-muted-foreground">#{row.id}</span>
        {h.lot ? <span className="chip chip-muted">Lot {h.lot}</span> : null}
      </div>
      <div className="mt-1.5 line-clamp-2 text-[13px] font-semibold leading-snug text-foreground">{title}</div>
      <div className="font-mono-data mt-1.5 text-[10px] text-muted-foreground">{formatDateTime(row.updated_at)}</div>
    </Link>
  );
}

function BuilderRowLink({ b }: { b: BuilderRow }) {
  const href = b.unfiled ? "/search" : `/search?builder=${encodeURIComponent(b.name)}`;
  const mono = monogram(b.name);
  return (
    <Link
      href={href}
      className="grid grid-cols-[minmax(0,1fr)_84px_84px_104px_72px_20px] items-center gap-4 border-b border-border/60 px-4 py-3 transition-colors last:border-0 hover:bg-accent/40"
    >
      <span className="flex min-w-0 items-center gap-3">
        {b.unfiled ? (
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-dashed border-border text-[11px] text-muted-foreground">
            <AlertTriangle className="h-4 w-4" style={{ color: "var(--warn-fg)" }} />
          </span>
        ) : (
          <span
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md font-mono-data text-[11px] font-bold"
            style={{ background: mono.bg, color: mono.fg }}
          >
            {mono.initials}
          </span>
        )}
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold text-foreground">{b.name}</span>
          <span className="font-mono-data block truncate text-[11px] text-muted-foreground">
            {b.unfiled
              ? "needs sorting"
              : `${b.communities} ${b.communities === 1 ? "community" : "communities"}`}
          </span>
        </span>
      </span>
      <span className="font-mono-data text-right text-sm font-semibold tabular-nums text-foreground">
        {b.cutsheets.toLocaleString()}
      </span>
      <span className="font-mono-data text-right text-sm tabular-nums text-muted-foreground">
        {b.activeLots || "-"}
      </span>
      <span className="font-mono-data text-right text-sm tabular-nums text-foreground">
        {b.nextDelivery ? formatShortDate(b.nextDelivery) : "-"}
      </span>
      <span className="font-mono-data text-right text-[11px] tabular-nums text-muted-foreground">
        {relativeTime(b.updatedAt) || "-"}
      </span>
      <ChevronRight className="h-4 w-4 text-muted-foreground" />
    </Link>
  );
}

// Stable muted tint per builder so the eye can track a builder by color across
// sessions. Color here is identity, not decoration.
const TINTS = [
  { bg: "rgba(37, 99, 235, 0.12)", fg: "#2563EB" },
  { bg: "rgba(13, 148, 136, 0.13)", fg: "#0F766E" },
  { bg: "rgba(180, 83, 9, 0.14)", fg: "#B45309" },
  { bg: "rgba(124, 58, 237, 0.12)", fg: "#7C3AED" },
  { bg: "rgba(190, 18, 60, 0.11)", fg: "#BE123C" },
  { bg: "rgba(71, 85, 105, 0.15)", fg: "#475569" },
  { bg: "rgba(3, 105, 161, 0.12)", fg: "#0369A1" },
];

function monogram(name: string): { initials: string; bg: string; fg: string } {
  const words = name.split(/[^A-Za-z0-9]+/).filter(Boolean);
  let initials: string;
  if (words.length >= 2) {
    const second = words.find((w) => w.length >= 2) ?? words[1];
    initials = (words[0][0] + (second === words[0] ? words[1][0] : second[0])).toUpperCase();
  } else {
    initials = (words[0] ?? name).slice(0, 2).toUpperCase();
  }
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return { initials: initials || "?", ...TINTS[hash % TINTS.length] };
}
