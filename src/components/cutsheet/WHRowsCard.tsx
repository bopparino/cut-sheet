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

// Each row reads as one spec ("3 × 12 × 24") using `×` between inputs.
// Outer grid is capped at 2 columns so a default 4 rows tile as 2×2,
// giving each spec real room instead of cramming 4-up across the card.
export function WHRowsCard({ title, prefix, initial, baseline = 4, className }: Props) {
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
        <div className="grid grid-cols-1 gap-x-8 gap-y-2 sm:grid-cols-2">
          {Array.from({ length: count }).map((_, i) => {
            const row = initial[i] ?? { qty: 0, w: "", h: "" };
            return (
              <div key={i} className="flex items-center gap-1.5">
                <Input
                  name={`${prefix}.${i}.qty`}
                  type="number"
                  inputMode="numeric"
                  min={0}
                  step={1}
                  defaultValue={row.qty === 0 ? "" : row.qty}
                  placeholder="#"
                  aria-label={`${title} row ${i + 1} qty`}
                  className="h-8 w-12 px-1.5 text-right tabular-nums"
                />
                <Times />
                <Input
                  name={`${prefix}.${i}.w`}
                  defaultValue={row.w}
                  placeholder="W"
                  aria-label={`${title} row ${i + 1} width`}
                  className="h-8 min-w-0 flex-1 px-2"
                />
                <Times />
                <Input
                  name={`${prefix}.${i}.h`}
                  defaultValue={row.h}
                  placeholder="H"
                  aria-label={`${title} row ${i + 1} height`}
                  className="h-8 min-w-0 flex-1 px-2"
                />
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
