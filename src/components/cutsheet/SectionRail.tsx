"use client";

import { useEffect, useState } from "react";

export type RailItem = { id: string; label: string; badge?: number };

// Sticky left rail that jumps to a section and highlights the one in view
// (IntersectionObserver scrollspy). Anchors target each section's `id`.
export function SectionRail({ items }: { items: RailItem[] }) {
  const [active, setActive] = useState(items[0]?.id ?? "");

  useEffect(() => {
    const els = items
      .map((it) => document.getElementById(it.id))
      .filter((el): el is HTMLElement => el != null);
    if (!els.length) return;
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-96px 0px -65% 0px", threshold: 0 },
    );
    els.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, [items]);

  const onJump = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    setActive(id);
  };

  return (
    <nav className="sticky top-[120px] hidden w-[184px] shrink-0 flex-col gap-0.5 self-start lg:flex">
      <p className="label-caps px-[9px] pb-2">Sections</p>
      {items.map((it, i) => (
        <a
          key={it.id}
          href={`#${it.id}`}
          onClick={(e) => onJump(e, it.id)}
          className={`flex items-center gap-2 rounded-r-sm border-l-2 px-[9px] py-[7px] text-[13px] transition-colors ${
            active === it.id
              ? "border-l-[var(--ink)] bg-accent font-semibold text-foreground"
              : "border-l-transparent text-[var(--text-2)] hover:bg-accent"
          }`}
        >
          <span className="font-mono-data text-[11px] text-[var(--text-ghost)]">{String(i + 1).padStart(2, "0")}</span>
          <span className="flex-1 truncate">{it.label}</span>
          {it.badge ? (
            <span className="font-mono-data rounded-sm border border-border bg-[var(--fill-2)] px-1.5 text-[11px] font-semibold text-[var(--text-3)]">
              {it.badge}
            </span>
          ) : null}
        </a>
      ))}
    </nav>
  );
}
