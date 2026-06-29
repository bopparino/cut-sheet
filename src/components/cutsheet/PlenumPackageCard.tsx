import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Plenum = "small" | "large" | "none";

const OPTIONS: { value: Plenum; label: string; contents: string }[] = [
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
        <fieldset className="grid gap-2 sm:grid-cols-3">
          <legend className="sr-only">Plenum Package</legend>
          {OPTIONS.map((opt) => (
            <label
              key={opt.value}
              className={cn(
                "group flex cursor-pointer flex-col gap-1 rounded-md border border-input p-3 text-sm transition-colors",
                // Restrained selected state: soft clay tint + clay border + clay
                // text, never a saturated fill. Emphasis matches importance.
                "hover:bg-accent has-[input:checked]:border-[var(--clay-line)] has-[input:checked]:bg-accent",
                "has-[input:checked]:text-accent-foreground",
              )}
            >
              <span className="flex items-center gap-2">
                <input
                  type="radio"
                  name="plenumPackage"
                  value={opt.value}
                  defaultChecked={value === opt.value}
                  className="h-4 w-4 accent-[var(--primary)]"
                />
                <span className="font-semibold">{opt.label}</span>
              </span>
              <span className="pl-6 text-xs text-muted-foreground group-has-[input:checked]:text-accent-foreground/75">
                {opt.contents}
              </span>
            </label>
          ))}
        </fieldset>
      </CardContent>
    </Card>
  );
}
