"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type Props = {
  title: string;
  // FormData key prefix - inputs are named `${prefix}.${index}`.
  prefix: string;
  initial: string[];
  // Empty rows below this baseline render even when the saved data is shorter,
  // so the user gets visible blanks to tab through.
  baseline?: number;
  className?: string;
};

// Compact grid layout: rows tile horizontally (2 cols at sm, 3 at md, 4 at lg)
// instead of stacking one-per-row full-width. Saves a lot of vertical space
// for sections like Wall Regs / Grills / Miscellaneous that have many short
// entries.
export function MiscRowsCard({ title, prefix, initial, baseline = 10, className }: Props) {
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
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: count }).map((_, i) => (
            <Input
              key={i}
              name={`${prefix}.${i}`}
              defaultValue={initial[i] ?? ""}
              placeholder={`Item ${i + 1}`}
              aria-label={`${title} row ${i + 1}`}
              className="h-8"
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
