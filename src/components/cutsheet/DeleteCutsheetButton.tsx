"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { deleteCutsheet } from "@/lib/actions";

// Wraps the Server Action delete in a shadcn AlertDialog. Copy is intentionally
// stern - directors get one click, no undo. Behind the scenes deleteCutsheet
// is soft-delete and /admin/trash can resurrect, but they don't need to know
// that. Common sense + a confirm dialog is the safety net.
export function DeleteCutsheetButton({ cutsheetId }: { cutsheetId: number }) {
  const [isPending, startTransition] = useTransition();

  const confirm = () => {
    startTransition(async () => {
      try {
        await deleteCutsheet(cutsheetId);
        // Note: deleteCutsheet redirects to /search before this runs, so the
        // toast lands on the search page. Sonner persists across navigations.
        toast.success(`Cutsheet #${cutsheetId} deleted.`);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Delete failed.");
      }
    });
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button type="button" variant="destructive" size="sm" disabled={isPending}>
          Delete
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this cutsheet?</AlertDialogTitle>
          <AlertDialogDescription>
            This action is irreversible. Continue?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={confirm}
            disabled={isPending}
            className="bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/20"
          >
            {isPending ? "Deleting…" : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
