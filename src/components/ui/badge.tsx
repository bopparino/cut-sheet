import { cn } from "@/lib/utils";

type Variant = "default" | "legacy" | "lost" | "pdf" | "muted";

const VARIANTS: Record<Variant, string> = {
  default: "bg-secondary text-muted-foreground",
  // Orange "LEGACY" pill (IMPORTS folder)
  legacy: "bg-primary text-primary-foreground",
  // Red "DUP LOT" pill
  lost: "bg-[var(--status-lost-bg)] text-[var(--status-lost-text)]",
  // Soft amber "STOCK PDF / CUSTOM PDF" tag on editor sections
  pdf: "bg-[var(--status-proposed-bg)] text-[var(--status-proposed-text)]",
  muted: "bg-secondary text-muted-foreground",
};

export function Badge({
  variant = "default",
  className,
  title,
  children,
}: {
  variant?: Variant;
  className?: string;
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      title={title}
      className={cn(
        "inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide",
        VARIANTS[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}
