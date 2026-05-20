"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { cloneCutsheet } from "@/lib/actions";

// Non-destructive — no confirmation dialog. cloneCutsheet redirects to the
// new cutsheet on success; the redirect itself is the feedback. The pending
// label keeps the button from looking unresponsive during the ~100-300ms
// insert + navigation round-trip.
export function CloneCutsheetButton({ cutsheetId }: { cutsheetId: number }) {
  const [isPending, startTransition] = useTransition();
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={isPending}
      onClick={() => startTransition(() => cloneCutsheet(cutsheetId))}
    >
      {isPending ? "Cloning…" : "Clone"}
    </Button>
  );
}
