"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { clearDupFlag } from "@/lib/actions";

// Lives inside the duplicate banner on the replica page. "Not a duplicate" is
// the human-judgment escape hatch for sheets that legitimately both exist -
// fixing or deleting a real duplicate clears its flag automatically on save/
// delete, so this button is for the pairs that are supposed to stay as-is.
export function DismissDupFlagButton({ cutsheetId }: { cutsheetId: number }) {
  const [pending, startTransition] = useTransition();

  const dismiss = () => {
    if (
      !confirm(
        "Clear the duplicate flag on this sheet?\n\nUse this when both sheets are supposed to exist. Nothing is deleted, and the flag stays off unless this sheet is changed later.",
      )
    )
      return;
    startTransition(async () => {
      try {
        await clearDupFlag(cutsheetId);
        toast.success("Duplicate flag cleared.");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not clear the flag.");
      }
    });
  };

  return (
    <button
      type="button"
      onClick={dismiss}
      disabled={pending}
      className="ml-auto shrink-0 rounded-md border border-current/40 px-2.5 py-1 text-xs font-semibold hover:bg-white/50 disabled:opacity-60 dark:hover:bg-black/20"
    >
      {pending ? "Clearing…" : "Not a duplicate — clear flag"}
    </button>
  );
}
