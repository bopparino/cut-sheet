"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { LayoutGrid, Search, FilePlus2, Trash2, Moon, Sun } from "lucide-react";

const WORKSPACE = [
  { href: "/browse", label: "Browse", icon: LayoutGrid, match: (p: string) => p === "/" || p.startsWith("/browse") },
  { href: "/search", label: "Search", icon: Search, match: (p: string) => p.startsWith("/search") },
  { href: "/form/new", label: "New Cutsheet", icon: FilePlus2, match: (p: string) => p === "/form/new" },
];

export function AppSidebar({ trashCount }: { trashCount: number }) {
  const pathname = usePathname() ?? "/";
  return (
    <aside className="sticky top-0 flex h-screen w-60 shrink-0 flex-col border-r border-border bg-card px-3 py-4">
      <Link href="/browse" className="mb-5 flex items-center gap-2.5 px-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-[var(--logo-chip)] text-[11px] font-bold tracking-tight">
          MET
        </span>
        <span className="leading-tight">
          <span className="block text-sm font-bold tracking-tight">Cut Sheet</span>
          <span className="block text-xs text-muted-foreground">Metcalfe HVAC</span>
        </span>
      </Link>

      <p className="label-caps px-2 pb-1.5 pt-1">Workspace</p>
      <nav className="flex flex-col gap-0.5">
        {WORKSPACE.map((item) => (
          <NavLink key={item.href} {...item} active={item.match(pathname)} />
        ))}
      </nav>

      <p className="label-caps px-2 pb-1.5 pt-4">Admin</p>
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
      <DarkModeToggle />
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
      className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors ${
        active
          ? "bg-primary/10 font-semibold text-primary"
          : "text-muted-foreground hover:bg-secondary hover:text-foreground"
      }`}
    >
      <Icon className="h-[18px] w-[18px] shrink-0" />
      <span className="flex-1">{label}</span>
      {badge != null && (
        <span className="rounded-md bg-secondary px-1.5 py-0.5 text-[11px] font-semibold text-muted-foreground">
          {badge}
        </span>
      )}
    </Link>
  );
}

function DarkModeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const isDark = mounted && resolvedTheme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label="Toggle dark mode"
      className="flex items-center gap-2.5 rounded-lg border border-border px-2.5 py-2 text-sm text-foreground transition-colors hover:bg-secondary"
    >
      {isDark ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
      <span className="flex-1 text-left">Dark mode</span>
      <span
        className={`relative h-5 w-9 rounded-full transition-colors ${isDark ? "bg-primary" : "bg-border"}`}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${isDark ? "left-[18px]" : "left-0.5"}`}
        />
      </span>
    </button>
  );
}
