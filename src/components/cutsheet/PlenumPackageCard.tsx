import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// "" is the unset state (nothing checked); only the three real choices render.
type Plenum = "small" | "large" | "none" | "";

const OPTIONS: { value: Exclude<Plenum, "">; label: string; contents: string }[] = [
  { value: "none", label: "None", contents: "No plenum package." },
  {
    value: "small",
    label: "Small",
    contents: "1 × 18x22x18  ·  1 × 18x22x24  ·  1 × 18x22 C.C.",
  },
  {
    value: "large",
    label: "Large",
    contents: "1 × 24x22x18  ·  1 × 24x22x24  ·  1 × 24x22 C.C.",
  },
];

// Native radios in a fieldset - accessible, no extra deps, posts cleanly via
// FormData as a single `plenumPackage` value.
export function PlenumPackageCard({
  value,
  className,
}: {
  value: Plenum;
  className?: string;
}) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Plenum Package</CardTitle>
      </CardHeader>
      <CardContent>
        <fieldset className="grid gap-3 sm:grid-cols-3">
          <legend className="sr-only">Plenum Package</legend>
          {OPTIONS.map((opt) => (
            <label
              key={opt.value}
              className={cn(
                "group flex cursor-pointer flex-col gap-1.5 rounded-sm border border-input bg-card p-[14px] text-sm transition-colors",
                // Selected: ink border + soft fill. Emphasis is structural, not colored.
                "has-[input:checked]:border-[1.5px] has-[input:checked]:border-[var(--ink)] has-[input:checked]:bg-[var(--fill)]",
              )}
            >
              <span className="flex items-center gap-2.5">
                <input type="radio" name="plenumPackage" value={opt.value} defaultChecked={value === opt.value} className="peer sr-only" />
                {/* Custom radio dot: hollow when off, ink with inset white ring when on. */}
                <span className="h-4 w-4 shrink-0 rounded-full border-[1.5px] border-[var(--border-input)] bg-card peer-checked:border-[var(--ink)] peer-checked:bg-[var(--ink)] peer-checked:shadow-[inset_0_0_0_3px_#fff]" />
                <span className="text-[14px] font-semibold text-foreground group-has-[input:checked]:font-bold">{opt.label}</span>
              </span>
              <span className="font-mono-data pl-[26px] text-[12px] text-[var(--text-3)]">{opt.contents}</span>
            </label>
          ))}
        </fieldset>
      </CardContent>
    </Card>
  );
}
