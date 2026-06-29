import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type QtyGridProps<T extends string> = {
  // FormData key prefix - each input is named `${prefix}.${size}`.
  prefix: string;
  sizes: readonly T[];
  values: Record<T, number>;
  // Optional pretty-printer for the size key (e.g. "3.25x10" → "3 1/4 x 10").
  formatLabel?: (size: T) => string;
};

// Container queries instead of viewport queries: the grid responds to its
// containing Card's width, not the browser's. A QtyGrid inside a half-width
// bento cell shows 4 cols; the same QtyGrid in a `lg:col-span-2` wide card
// shows 5-6. Cells stack label-above-input so labels are never truncated
// by the input width and inputs across a row are vertically aligned.
export function QtyGrid<T extends string>({
  prefix,
  sizes,
  values,
  formatLabel,
}: QtyGridProps<T>) {
  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-3 @sm:grid-cols-3 @md:grid-cols-4 @xl:grid-cols-5 @4xl:grid-cols-6">
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
  // Stacked: label on top, input below, both filling the cell width. All
  // labels in a row sit at the same y-position, all inputs at the same
  // y-position underneath them - no truncation, no jagged input column.
  // Cell width is uniform via the outer grid track, so labels also line up
  // horizontally across cells. `truncate` is a safety net for the rare
  // label that exceeds the track width at small breakpoints.
  return (
    <div className="flex flex-col gap-1 [&:has(input:not(:placeholder-shown))_label]:text-[var(--heading)]">
      <Label
        htmlFor={name}
        className="font-mono-data truncate text-[11px] font-medium text-muted-foreground"
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
        className="font-mono-data h-8 w-full text-right text-sm tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:m-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:m-0 [&::-webkit-outer-spin-button]:appearance-none placeholder:text-muted-foreground/40 [&:not(:placeholder-shown)]:border-[var(--clay-line)] [&:not(:placeholder-shown)]:bg-[var(--clay-tint)] [&:not(:placeholder-shown)]:font-bold [&:not(:placeholder-shown)]:text-[var(--heading)]"
      />
    </div>
  );
}
