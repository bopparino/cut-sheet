"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, Search, FilePlus2, Trash2 } from "lucide-react";

const WORKSPACE = [
  { href: "/browse", label: "Browse", icon: LayoutGrid, match: (p: string) => p === "/" || p.startsWith("/browse") },
  { href: "/search", label: "Search", icon: Search, match: (p: string) => p.startsWith("/search") },
  // Active for the editor and replica screens too.
  { href: "/form/new", label: "New cutsheet", icon: FilePlus2, match: (p: string) => p.startsWith("/form") },
];

export function AppSidebar({ trashCount }: { trashCount: number }) {
  const pathname = usePathname() ?? "/";
  return (
    <aside className="sticky top-0 flex h-screen w-60 shrink-0 flex-col border-r border-border bg-card px-3 py-[18px]">
      <Link href="/browse" className="mb-6 flex items-center gap-2.5 px-2">
        <span className="font-mono-data flex h-9 w-9 items-center justify-center rounded-sm bg-[var(--ink)] text-[11px] font-semibold tracking-[0.04em] text-white">
          MET
        </span>
        <span className="leading-tight">
          <span className="block text-[14px] font-bold tracking-tight text-foreground">Cut Sheet</span>
          <span className="label-caps mt-0.5 block">Metcalfe HVAC</span>
        </span>
      </Link>

      <p className="label-caps px-2 pb-2 tracking-[0.14em]">Workspace</p>
      <nav className="flex flex-col gap-0.5">
        {WORKSPACE.map((item) => (
          <NavLink key={item.href} {...item} active={item.match(pathname)} />
        ))}
      </nav>

      <p className="label-caps px-2 pb-2 pt-[22px] tracking-[0.14em]">Admin</p>
      <nav className="flex flex-col gap-0.5">
        <NavLink
          href="/admin/trash"
          label="Trash"
          icon={Trash2}
          active={pathname.startsWith("/admin/trash")}
          badge={trashCount > 0 ? trashCount : undefined}
        />
      </nav>

      <div className="flex-1" />
      <div className="flex items-baseline gap-1.5 px-2">
        <span className="label-caps">Cut Sheet</span>
        <span className="font-mono-data text-[10px] text-[var(--text-ghost)]">v1.0</span>
      </div>
    </aside>
  );
}

function NavLink({
  href,
  label,
  icon: Icon,
  active,
  badge,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  active: boolean;
  badge?: number;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-[11px] rounded-r-sm border-l-2 px-2.5 py-2 text-[13.5px] transition-colors ${
        active
          ? "border-l-[var(--ink)] bg-accent font-semibold text-foreground"
          : "border-l-transparent font-medium text-[var(--text-2)] hover:bg-accent"
      }`}
    >
      <Icon className="h-[17px] w-[17px] shrink-0" />
      <span className="flex-1">{label}</span>
      {badge != null && (
        <span className="font-mono-data rounded-sm border border-border bg-[var(--fill-2)] px-1.5 py-px text-[10.5px] font-semibold text-[var(--text-3)]">
          {badge}
        </span>
      )}
    </Link>
  );
}
