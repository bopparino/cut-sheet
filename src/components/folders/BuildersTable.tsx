"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight, ChevronDown, MapPin, Folder } from "lucide-react";
import { relativeTime } from "@/lib/utils";
import type { BuilderRow } from "@/lib/builders";

const COLS = "grid-cols-[minmax(150px,1fr)_78px_78px_112px_84px_26px]";

export function BuildersTable({ builders }: { builders: BuilderRow[] }) {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div className="overflow-hidden rounded-sm border border-border bg-card">
      {/* Column header */}
      <div className={`grid ${COLS} items-center gap-3 border-b border-border bg-[var(--row-tint)] px-[18px] py-2.5`}>
        <span className="label-caps">Builder</span>
        <span className="label-caps text-right">Cutsheets</span>
        <span className="label-caps text-right">Active lots</span>
        <span className="label-caps text-right">Next delivery</span>
        <span className="label-caps text-right">Updated</span>
        <span />
      </div>

      {builders.map((b) =>
        b.unfiled ? (
          <Link
            key="__unfiled"
            href="/search"
            className={`grid ${COLS} items-center gap-3 border-b border-[var(--divider)] px-[18px] py-[13px] transition-colors last:border-0 hover:bg-[var(--row-tint)]`}
          >
            <span className="flex min-w-0 items-center gap-3">
              <span
                className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-sm"
                style={{ background: "var(--warn-bg)", border: "1px solid var(--warn-line)" }}
              >
                <Folder className="h-4 w-4" style={{ color: "var(--warn-fg)" }} />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-[14px] font-semibold text-foreground">Unfiled (Imports)</span>
                <span className="font-mono-data block text-[11px]" style={{ color: "var(--warn-sub)" }}>
                  needs sorting
                </span>
              </span>
            </span>
            <span className="font-mono-data text-right text-[13px] text-foreground">{b.cutsheets.toLocaleString()}</span>
            <span className="text-right text-[var(--text-ghost)]">-</span>
            <span className="text-right text-[var(--text-ghost)]">-</span>
            <span className="text-right text-[var(--text-ghost)]">-</span>
            <ChevronRight className="h-4 w-4 text-[var(--text-ghost)]" />
          </Link>
        ) : (
          <BuilderRowItem
            key={b.name}
            b={b}
            open={expanded === b.name}
            onToggle={() => setExpanded((cur) => (cur === b.name ? null : b.name))}
          />
        ),
      )}
    </div>
  );
}

function BuilderRowItem({ b, open, onToggle }: { b: BuilderRow; open: boolean; onToggle: () => void }) {
  const hasComm = b.communities.length > 0;
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
              {b.communities.length} {b.communities.length === 1 ? "community" : "communities"}
            </span>
          </span>
        </span>
        <span className="font-mono-data text-right text-[13px] text-foreground">{b.cutsheets.toLocaleString()}</span>
        <span className="font-mono-data text-right text-[13px] text-foreground">{b.activeLots || "-"}</span>
        <span className="font-mono-data text-right text-[12.5px] text-[var(--text-2)]">{b.nextDelivery ?? "-"}</span>
        <span className="font-mono-data text-right text-[11.5px] text-[var(--text-3)]">{relativeTime(b.updatedAt) || "-"}</span>
        {hasComm ? (
          open ? (
            <ChevronDown className="h-4 w-4 text-[var(--text-2)]" />
          ) : (
            <ChevronRight className="h-4 w-4 text-[var(--text-ghost)]" />
          )
        ) : (
          <span />
        )}
      </button>

      {open &&
        b.communities.map((c) => (
          <div
            key={c.name}
            className={`grid ${COLS} items-center gap-3 border-t border-[var(--line-faint)] bg-[var(--row-tint)] px-[18px] py-2.5`}
          >
            <span className="flex min-w-0 items-center gap-2 pl-[46px]">
              <MapPin className="h-[14px] w-[14px] shrink-0 text-[var(--text-3)]" />
              <span className="truncate text-[13px] font-medium text-[#313842]">{c.name}</span>
            </span>
            <span className="font-mono-data text-right text-[13px] text-[var(--text-2)]">{c.cutsheets.toLocaleString()}</span>
            <span className="font-mono-data text-right text-[13px] text-[var(--text-2)]">{c.activeLots || "-"}</span>
            <span className="font-mono-data text-right text-[12.5px] text-[var(--text-2)]">{c.nextDelivery ?? "-"}</span>
            <span />
            <span />
          </div>
        ))}
    </div>
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
