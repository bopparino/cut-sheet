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
        {/* Logo always sits on a white chip (Brand Guidelines §02/§03).
            Monogram alone is correct for this tight square placement. */}
        <span className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-lg border border-border bg-[var(--logo-chip)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/metcalfe-monogram.png"
            alt="Metcalfe"
            width={28}
            height={28}
            className="h-7 w-7 object-contain"
          />
        </span>
        <span className="leading-tight">
          <span className="block text-sm font-bold tracking-tight text-[var(--heading)]">Cut Sheet</span>
          <span className="block text-xs font-medium text-[var(--brand-red)]">Metcalfe HVAC</span>
        </span>
      </Link>

      <nav className="flex flex-col gap-0.5">
        {WORKSPACE.map((item) => (
          <NavLink key={item.href} {...item} active={item.match(pathname)} />
        ))}
      </nav>

      <div className="my-3 border-t border-border" />

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
      <ThemeToggle />
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
          ? "bg-accent font-semibold text-primary shadow-[inset_3px_0_0_0_var(--primary)]"
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

// Icon-only theme toggle. The old version was a labeled sliding pill in the
// corner - a consumer-app affordance out of place in a shop tool.
function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const isDark = mounted && resolvedTheme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Light mode" : "Dark mode"}
      className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
    >
      {isDark ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
    </button>
  );
}
