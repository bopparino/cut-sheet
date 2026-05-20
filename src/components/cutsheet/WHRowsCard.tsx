"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type WHRow = { qty: number; w: string; h: string };

type Props = {
  title: string;
  prefix: string;
  initial: WHRow[];
  baseline?: number;
  className?: string;
};

// Compact tile layout: each row is one [qty | w | h] triple, and the triples
// tile horizontally (1 col → 2 → 3 → 4 at increasing breakpoints). Placeholders
// inside the inputs replace the static Qty/W/H header row, since the fields
// are narrow enough that the placeholder is the clearer affordance.
export function WHRowsCard({ title, prefix, initial, baseline = 5, className }: Props) {
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
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: count }).map((_, i) => {
            const row = initial[i] ?? { qty: 0, w: "", h: "" };
            return (
              <div key={i} className="grid grid-cols-[44px_1fr_1fr] gap-1.5">
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
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
