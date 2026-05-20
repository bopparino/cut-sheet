"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type CDRow = { qty: number; w: string; h: string; l: string; sl: "Y" | "N" };

type Props = {
  title?: string;
  prefix: string;
  initial: CDRow[];
  baseline?: number;
  className?: string;
};

// Each row group is one custom-duct spec: qty × W × H × L, with a S/L flag
// (Y/N) tacked on. The `×` separators tie the four dimension inputs into
// one readable spec; the S/L select sits at the end separated by a small
// gap since it's a property of the row, not a dimension. Subtle bg block
// groups each row visually so the bento layout's wide cards don't blur
// multiple rows together.
export function CustomDuctRowsCard({
  title = "Custom Duct",
  prefix,
  initial,
  baseline = 10,
  className,
}: Props) {
  const [count, setCount] = useState(Math.max(baseline, initial.length));

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{title}</CardTitle>
        <Button type="button" variant="ghost" size="sm" onClick={() => setCount((c) => c + 1)}>
          + Add row
        </Button>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
          {Array.from({ length: count }).map((_, i) => {
            const row = initial[i] ?? { qty: 0, w: "", h: "", l: "", sl: "N" as const };
            return (
              <div
                key={i}
                className="flex items-center gap-1.5 rounded-md bg-muted/40 px-2 py-1.5"
              >
                <Input
                  name={`${prefix}.${i}.qty`}
                  type="number"
                  inputMode="numeric"
                  min={0}
                  step={1}
                  defaultValue={row.qty === 0 ? "" : row.qty}
                  placeholder="#"
                  aria-label={`${title} row ${i + 1} qty`}
                  className="h-7 w-12 px-1.5 text-right tabular-nums"
                />
                <Times />
                <Input
                  name={`${prefix}.${i}.w`}
                  defaultValue={row.w}
                  placeholder="W"
                  aria-label={`${title} row ${i + 1} width`}
                  className="h-7 min-w-0 flex-1 px-2"
                />
                <Times />
                <Input
                  name={`${prefix}.${i}.h`}
                  defaultValue={row.h}
                  placeholder="H"
                  aria-label={`${title} row ${i + 1} height`}
                  className="h-7 min-w-0 flex-1 px-2"
                />
                <Times />
                <Input
                  name={`${prefix}.${i}.l`}
                  defaultValue={row.l}
                  placeholder="L"
                  aria-label={`${title} row ${i + 1} length`}
                  className="h-7 min-w-0 flex-1 px-2"
                />
                <span aria-hidden className="ml-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  S/L
                </span>
                <select
                  name={`${prefix}.${i}.sl`}
                  defaultValue={row.sl}
                  aria-label={`${title} row ${i + 1} S/L`}
                  className="h-7 rounded-md border border-input bg-background px-1.5 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                >
                  <option value="N">N</option>
                  <option value="Y">Y</option>
                </select>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function Times() {
  return (
    <span aria-hidden className="shrink-0 text-xs font-medium text-muted-foreground/70">
      ×
    </span>
  );
}
