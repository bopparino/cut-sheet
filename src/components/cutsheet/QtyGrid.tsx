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

// Container queries instead of viewport queries: the grid responds to its
// containing Card's width, not the browser's. A QtyGrid inside a half-width
// bento cell shows 3 cols; the same QtyGrid in a `lg:col-span-2` wide card
// shows 4-5. Old viewport-only approach cramped narrow bento cells with too
// many columns and produced label truncation.
export function QtyGrid<T extends string>({
  prefix,
  sizes,
  values,
  formatLabel,
}: QtyGridProps<T>) {
  return (
    <div className="grid grid-cols-2 gap-x-5 gap-y-2 @sm:grid-cols-3 @xl:grid-cols-4 @4xl:grid-cols-5">
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
// `className` is the bento-grid opt-in for col-span hints on wider cards;
// `@container` enables container-query responsiveness for the inner grid.
export function QtyGridCard<T extends string>({
  title,
  className,
  ...props
}: { title: string; className?: string } & QtyGridProps<T>) {
  return (
    <Card className={`@container ${className ?? ""}`}>
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
  // Label is natural-width (no flex-1), so it sits snug against its input;
  // empty space within the cell falls on the right of the input. Combined
  // with gap-x-5 between cells, each label-input pair reads unambiguously
  // as one unit.
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
