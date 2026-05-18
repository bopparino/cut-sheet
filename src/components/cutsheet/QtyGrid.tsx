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
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
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

function LabeledQty({
  name,
  label,
  defaultValue,
}: {
  name: string;
  label: string;
  defaultValue: number;
}) {
  return (
    <div className="flex items-center gap-2">
      <Label
        htmlFor={name}
        className="flex-1 truncate text-xs font-normal text-muted-foreground"
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
