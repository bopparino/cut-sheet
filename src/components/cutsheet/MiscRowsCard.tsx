"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type Props = {
  title: string;
  // FormData key prefix — inputs are named `${prefix}.${index}`.
  prefix: string;
  initial: string[];
  // Empty rows below this baseline render even when the saved data is shorter,
  // so the user gets visible blanks to tab through.
  baseline?: number;
};

export function MiscRowsCard({ title, prefix, initial, baseline = 10 }: Props) {
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
        {Array.from({ length: count }).map((_, i) => (
          <Input
            key={i}
            name={`${prefix}.${i}`}
            defaultValue={initial[i] ?? ""}
            className="h-8"
          />
        ))}
      </CardContent>
    </Card>
  );
}
