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
};

// Compact tile layout: each row is one [qty | w | h | l | S/L] tuple. Five
// controls per cell means we only fit 1 or 2 cells per visual row, but that's
// still half the vertical footprint of one-row-per-stacked-line.
export function CustomDuctRowsCard({
  title = "Custom Duct",
  prefix,
  initial,
  baseline = 10,
}: Props) {
  const [count, setCount] = useState(Math.max(baseline, initial.length));

  return (
    <Card>
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
                className="grid grid-cols-[44px_1fr_1fr_1fr_48px] gap-1.5"
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
                  className="h-8 px-1.5 text-right"
                />
                <Input
                  name={`${prefix}.${i}.w`}
                  defaultValue={row.w}
                  placeholder="W"
                  aria-label={`${title} row ${i + 1} width`}
                  className="h-8 px-2"
                />
                <Input
                  name={`${prefix}.${i}.h`}
                  defaultValue={row.h}
                  placeholder="H"
                  aria-label={`${title} row ${i + 1} height`}
                  className="h-8 px-2"
                />
                <Input
                  name={`${prefix}.${i}.l`}
                  defaultValue={row.l}
                  placeholder="L"
                  aria-label={`${title} row ${i + 1} length`}
                  className="h-8 px-2"
                />
                <select
                  name={`${prefix}.${i}.sl`}
                  defaultValue={row.sl}
                  aria-label={`${title} row ${i + 1} S/L`}
                  className="h-8 rounded-md border border-input bg-transparent px-1.5 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
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
