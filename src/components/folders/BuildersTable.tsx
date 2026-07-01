"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight, ChevronDown } from "lucide-react";
import { relativeTime } from "@/lib/utils";
import type { BuilderRow, CutsheetLeaf } from "@/lib/builders";

const COLS = "grid-cols-[minmax(150px,1fr)_84px_84px_92px_26px]";

// Letter heading a builder sorts under: first A-Z character, else "#".
// Unfiled always buckets to "#" and (because it sorts last) lands at the end.
function groupLetter(b: BuilderRow): string {
  if (b.unfiled) return "#";
  const c = b.name.trim().charAt(0).toUpperCase();
  return c >= "A" && c <= "Z" ? c : "#";
}

export function BuildersTable({ builders }: { builders: BuilderRow[] }) {
  const [expanded, setExpanded] = useState<string | null>(null);

  let lastLetter = "";

  return (
    <div className="overflow-hidden rounded-sm border border-border bg-card">
      {/* Column header */}
      <div className={`grid ${COLS} items-center gap-3 border-b border-border bg-[var(--row-tint)] px-[18px] py-2.5`}>
        <span className="label-caps">Builder</span>
        <span className="label-caps text-right">Cutsheets</span>
        <span className="label-caps text-right">Active lots</span>
        <span className="label-caps text-right">Updated</span>
        <span />
      </div>

      {builders.map((b) => {
        const letter = groupLetter(b);
        const showHeading = letter !== lastLetter;
        lastLetter = letter;
        return (
          <div key={b.unfiled ? "__unfiled" : b.name}>
            {showHeading && (
              <div className="border-b border-[var(--divider)] bg-[var(--fill)] px-[18px] py-1.5">
                <span className="font-mono-data text-[11px] font-semibold tracking-[0.08em] text-[var(--text-3)]">
                  {letter}
                </span>
              </div>
            )}
            <BuilderRowItem
              b={b}
              open={expanded === b.name}
              onToggle={() => setExpanded((cur) => (cur === b.name ? null : b.name))}
            />
          </div>
        );
      })}
    </div>
  );
}

function BuilderRowItem({ b, open, onToggle }: { b: BuilderRow; open: boolean; onToggle: () => void }) {
  const hasSheets = b.sheets.length > 0;
  return (
    <div className="border-b border-[var(--divider)] last:border-0">
      <button
        type="button"
        onClick={onToggle}
        className={`grid w-full ${COLS} items-center gap-3 px-[18px] py-[13px] text-left transition-colors hover:bg-[var(--row-tint)] ${open ? "bg-[var(--row-tint)]" : ""}`}
      >
        <span className="flex min-w-0 items-center gap-3">
          <span className="font-mono-data flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-sm border border-[var(--border-monogram)] bg-[var(--fill-2)] text-[11px] font-semibold text-[var(--text-2)]">
            {monogram(b.name)}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-[14px] font-semibold text-foreground">{b.name}</span>
            <span className="font-mono-data block text-[11px] text-[var(--text-3)]">
              {b.cutsheets} {b.cutsheets === 1 ? "cutsheet" : "cutsheets"}
            </span>
          </span>
        </span>
        <span className="font-mono-data text-right text-[13px] text-foreground">{b.cutsheets.toLocaleString()}</span>
        <span className="font-mono-data text-right text-[13px] text-foreground">{b.activeLots || "-"}</span>
        <span className="font-mono-data text-right text-[11.5px] text-[var(--text-3)]">{relativeTime(b.updatedAt) || "-"}</span>
        {hasSheets ? (
          open ? (
            <ChevronDown className="h-4 w-4 text-[var(--text-2)]" />
          ) : (
            <ChevronRight className="h-4 w-4 text-[var(--text-ghost)]" />
          )
        ) : (
          <span />
        )}
      </button>

      {open && b.sheets.map((s) => <SheetRow key={s.id} s={s} />)}
    </div>
  );
}

function SheetRow({ s }: { s: CutsheetLeaf }) {
  const meta = [s.deliveryDate ? `Del ${s.deliveryDate}` : null].filter(Boolean).join(" · ");
  return (
    <Link
      href={`/form/${s.id}`}
      className="grid grid-cols-[minmax(0,1fr)_92px_26px] items-center gap-3 border-t border-[var(--line-faint)] bg-[var(--row-tint)] px-[18px] py-2.5 transition-colors hover:bg-[var(--tile-hover)]"
    >
      <span className="flex min-w-0 items-center gap-2.5 pl-[46px]">
        <span className="font-mono-data shrink-0 text-[11px] text-[var(--text-3)]">#{s.id}</span>
        <span className="truncate text-[13px] font-medium text-[#313842]">{s.title}</span>
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
}

function monogram(name: string): string {
  const words = name.split(/[^A-Za-z0-9]+/).filter(Boolean);
  if (words.length >= 2) {
    const second = words.find((w) => w.length >= 2) ?? words[1];
    return (words[0][0] + (second === words[0] ? words[1][0] : second[0])).toUpperCase();
  }
  return (words[0] ?? name).slice(0, 2).toUpperCase() || "?";
}
