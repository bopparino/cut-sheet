import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { relativeTime } from "@/lib/utils";
import type { BrowseLevelRow } from "@/lib/builders";
import type { CutsheetLeaf } from "@/lib/builders";

const COLS = "grid-cols-[minmax(150px,1fr)_84px_92px_92px_26px]";

function monogram(name: string): string {
  const words = name.split(/[^A-Za-z0-9]+/).filter(Boolean);
  if (words.length >= 2) {
    const second = words.find((w) => w.length >= 2) ?? words[1];
    return (words[0][0] + (second === words[0] ? words[1][0] : second[0])).toUpperCase();
  }
  return (words[0] ?? name).slice(0, 2).toUpperCase() || "?";
}

// One drill-down level (builders / subdivisions / house types). Each row links
// deeper into the hierarchy via the same /browse route with more query params.
// `childNoun` labels the middle count column ("subdivisions" / "house types").
export function BrowseLevel({
  rows,
  hrefFor,
  childNoun,
  countLabel,
  dupCounts,
}: {
  rows: BrowseLevelRow[];
  hrefFor: (value: string) => string;
  childNoun: string;
  countLabel: string;
  /** value (uppercased) -> flagged-duplicate sheet count, builder level only */
  dupCounts?: Map<string, number>;
}) {
  return (
    <div className="overflow-hidden rounded-sm border border-border bg-card">
      <div className={`grid ${COLS} items-center gap-3 border-b border-border bg-[var(--row-tint)] px-[18px] py-2.5`}>
        <span className="label-caps">{countLabel}</span>
        <span className="label-caps text-right">Cutsheets</span>
        <span className="label-caps text-right">{childNoun}</span>
        <span className="label-caps text-right">Updated</span>
        <span />
      </div>
      {rows.map((r) => (
        <Link
          key={r.value || "__none"}
          href={r.soleSheetId ? `/form/${r.soleSheetId}` : hrefFor(r.value)}
          className={`grid ${COLS} items-center gap-3 border-b border-[var(--divider)] px-[18px] py-[13px] text-left transition-colors last:border-0 hover:bg-[var(--row-tint)]`}
        >
          <span className="flex min-w-0 items-center gap-3">
            <span className="font-mono-data flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-sm border border-[var(--border-monogram)] bg-[var(--fill-2)] text-[11px] font-semibold text-[var(--text-2)]">
              {monogram(r.label)}
            </span>
            <span className="min-w-0">
              <span className="flex items-center gap-2 truncate text-[14px] font-semibold text-foreground">
                <span className="truncate">{r.label}</span>
                {dupCounts?.get(r.value.trim().toUpperCase()) ? (
                  <span className="chip chip-danger shrink-0">
                    {dupCounts.get(r.value.trim().toUpperCase())} DUPLICATES
                  </span>
                ) : null}
              </span>
              <span className="font-mono-data block text-[11px] text-[var(--text-3)]">
                {r.cutsheets} {r.cutsheets === 1 ? "cutsheet" : "cutsheets"}
              </span>
            </span>
          </span>
          <span className="font-mono-data text-right text-[13px] text-foreground">{r.cutsheets.toLocaleString()}</span>
          <span className="font-mono-data text-right text-[13px] text-foreground">{r.children || "-"}</span>
          <span className="font-mono-data text-right text-[11.5px] text-[var(--text-3)]">{relativeTime(r.updatedAt) || "-"}</span>
          <ChevronRight className="h-4 w-4 text-[var(--text-ghost)]" />
        </Link>
      ))}
    </div>
  );
}

// Leaf level: the actual cutsheets under a chosen house type. Opens the sheet.
export function BrowseSheets({
  sheets,
  dupes,
  legacyIds,
}: {
  sheets: CutsheetLeaf[];
  dupes?: Map<number, "exact" | "likely">;
  legacyIds?: Set<number>;
}) {
  return (
    <div className="overflow-hidden rounded-sm border border-border bg-card">
      <div className="grid grid-cols-[minmax(0,1fr)_92px_26px] items-center gap-3 border-b border-border bg-[var(--row-tint)] px-[18px] py-2.5">
        <span className="label-caps">Cutsheet</span>
        <span className="label-caps text-right">Updated</span>
        <span />
      </div>
      {sheets.map((s) => {
        const meta = s.deliveryDate ? `Del ${s.deliveryDate}` : "";
        return (
          <Link
            key={s.id}
            href={`/form/${s.id}`}
            className="grid grid-cols-[minmax(0,1fr)_92px_26px] items-center gap-3 border-b border-[var(--divider)] px-[18px] py-2.5 transition-colors last:border-0 hover:bg-[var(--tile-hover)]"
          >
            <span className="flex min-w-0 items-center gap-2.5">
              <span className="font-mono-data shrink-0 text-[11px] text-[var(--text-3)]">#{s.id}</span>
              <span className="truncate text-[13px] font-medium text-foreground">{s.title}</span>
              {legacyIds?.has(s.id) ? (
                <span className="font-mono-data shrink-0 rounded-sm border border-border bg-[var(--fill-2)] px-1.5 py-px text-[10px] text-[var(--text-3)]">
                  LEGACY
                </span>
              ) : null}
              {dupes?.get(s.id) === "exact" ? (
                <span className="chip chip-danger shrink-0">EXACT DUPLICATE FOUND</span>
              ) : dupes?.get(s.id) === "likely" ? (
                <span className="chip chip-warn shrink-0">POSSIBLE DUPLICATE</span>
              ) : null}
              {s.lot ? (
                <span className="font-mono-data shrink-0 rounded-sm border border-border bg-card px-1.5 py-px text-[10px] text-[var(--text-2)]">
                  Lot {s.lot}
                </span>
              ) : null}
              {meta ? <span className="font-mono-data shrink-0 text-[11px] text-[var(--text-3)]">{meta}</span> : null}
            </span>
            <span className="font-mono-data text-right text-[11.5px] text-[var(--text-3)]">{relativeTime(s.updatedAt)}</span>
            <ChevronRight className="h-4 w-4 text-[var(--text-ghost)]" />
          </Link>
        );
      })}
    </div>
  );
}
