import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type QtyGridProps<T extends string> = {
  // FormData key prefix — each input is named `${prefix}.${size}`.
  prefix: string;
  sizes: readonly T[];
  values: Record<T, number>;
  // Optional pretty-printer for the size key (e.g. "3.25x10" → "3 1/4 x 10").
  formatLabel?: (size: T) => string;
};

export function QtyGrid<T extends string>({
  prefix,
  sizes,
  values,
  formatLabel,
}: QtyGridProps<T>) {
  return (
    <div className="grid grid-cols-2 gap-x-8 gap-y-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {sizes.map((size) => (
        <LabeledQty
          key={size}
          name={`${prefix}.${size}`}
          label={formatLabel ? formatLabel(size) : size}
          defaultValue={values[size]}
        />
      ))}
    </div>
  );
}

// Card + Header + QtyGrid. Used by every qty-map section so the page itself
// stays a flat list of <QtyGridCard /> rather than repeating Card scaffolding.
export function QtyGridCard<T extends string>({
  title,
  ...props
}: { title: string } & QtyGridProps<T>) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <QtyGrid {...props} />
      </CardContent>
    </Card>
  );
}

function LabeledQty({
  name,
  label,
  defaultValue,
}: {
  name: string;
  label: string;
  defaultValue: number;
}) {
  // No flex-1 on the label — keeping it at natural width pulls the input
  // snug to its own label so each pair reads as a unit. The grid above
  // provides generous gap-x to make the inter-cell gap clearly larger than
  // the intra-cell gap, eliminating the "which label goes with which input"
  // ambiguity from the wider grid layout.
  return (
    <div className="flex items-center gap-2">
      <Label
        htmlFor={name}
        className="truncate text-xs font-normal text-muted-foreground"
        title={label}
      >
        {label}
      </Label>
      <Input
        id={name}
        name={name}
        type="number"
        inputMode="numeric"
        min={0}
        step={1}
        defaultValue={defaultValue === 0 ? "" : defaultValue}
        placeholder="0"
        className="h-8 w-16 text-right"
      />
    </div>
  );
}
