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

// Each row group is a contained spec — subtle muted background block plus
// `×` separators between the inputs. Reads as "qty by width by height"
// instead of three loose input boxes sitting next to each other. Bento can
// still tile multiple groups per visual row; the bg blocks make it obvious
// where one row's spec ends and the next begins.
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
