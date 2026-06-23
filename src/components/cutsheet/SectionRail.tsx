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
    <nav className="sticky top-24 hidden w-44 shrink-0 flex-col gap-0.5 self-start lg:flex">
      <p className="label-caps px-2.5 pb-1.5">Sections</p>
      {items.map((it) => (
        <a
          key={it.id}
          href={`#${it.id}`}
          onClick={(e) => onJump(e, it.id)}
          className={`flex items-center justify-between rounded-lg px-2.5 py-1.5 text-sm transition-colors ${
            active === it.id
              ? "bg-primary/10 font-semibold text-primary"
              : "text-muted-foreground hover:bg-secondary hover:text-foreground"
          }`}
        >
          <span className="truncate">{it.label}</span>
          {it.badge ? (
            <span className="ml-1 rounded bg-secondary px-1.5 text-[11px] font-semibold text-muted-foreground">
              {it.badge}
            </span>
          ) : null}
        </a>
      ))}
    </nav>
  );
}
