import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// SQLite `datetime('now')` stores UTC as "YYYY-MM-DD HH:MM:SS" with no zone
// marker. Render it as 12-hour Eastern time. Eastern (America/New_York)
// handles the EST/EDT switch automatically.
export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "-";
  const iso = value.includes("T") ? value : value.replace(" ", "T");
  const utc = /[zZ]|[+-]\d\d:?\d\d$/.test(iso) ? iso : `${iso}Z`;
  const d = new Date(utc);
  if (Number.isNaN(d.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(d);
}

// Compact relative time for "updated" columns: "just now", "5m ago",
// "2h ago", "3d ago", "2w ago", "4mo ago". Input is a UTC SQLite timestamp.
export function relativeTime(value: string | null | undefined): string {
  if (!value) return "";
  const iso = value.includes("T") ? value : value.replace(" ", "T");
  const utc = /[zZ]|[+-]\d\d:?\d\d$/.test(iso) ? iso : `${iso}Z`;
  const then = new Date(utc).getTime();
  if (Number.isNaN(then)) return "";
  const s = Math.max(0, Math.round((Date.now() - then) / 1000));
  if (s < 45) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  if (d < 7) return `${d}d ago`;
  const w = Math.round(d / 7);
  if (w < 5) return `${w}w ago`;
  const mo = Math.round(d / 30);
  if (mo < 12) return `${mo}mo ago`;
  return `${Math.round(d / 365)}y ago`;
}

// Render a plain calendar date ("2026-06-30") as "Jun 30". No timezone math:
// a delivery date is a wall-calendar day, not an instant.
export function formatShortDate(value: string | null | undefined): string {
  if (!value) return "";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!m) return value;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  if (Number.isNaN(d.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(d);
}

// Today as YYYY-MM-DD in shop-local (Eastern) time, for "upcoming delivery"
// comparisons against plain calendar dates.
export function todayEastern(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(new Date());
}
