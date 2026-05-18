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
      <CardContent className="space-y-2">
        <div className="grid grid-cols-[60px_1fr_1fr_1fr_60px] gap-2 text-xs font-medium text-muted-foreground">
          <span>Qty</span>
          <span>W</span>
          <span>H</span>
          <span>L</span>
          <span>S/L</span>
        </div>
        {Array.from({ length: count }).map((_, i) => {
          const row = initial[i] ?? { qty: 0, w: "", h: "", l: "", sl: "N" as const };
          return (
            <div key={i} className="grid grid-cols-[60px_1fr_1fr_1fr_60px] gap-2">
              <Input
                name={`${prefix}.${i}.qty`}
                type="number"
                inputMode="numeric"
                min={0}
                step={1}
                defaultValue={row.qty === 0 ? "" : row.qty}
                placeholder="0"
                className="h-8 text-right"
              />
              <Input name={`${prefix}.${i}.w`} defaultValue={row.w} className="h-8" />
              <Input name={`${prefix}.${i}.h`} defaultValue={row.h} className="h-8" />
              <Input name={`${prefix}.${i}.l`} defaultValue={row.l} className="h-8" />
              <select
                name={`${prefix}.${i}.sl`}
                defaultValue={row.sl}
                className="h-8 rounded-md border border-input bg-transparent px-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              >
                <option value="N">N</option>
                <option value="Y">Y</option>
              </select>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
