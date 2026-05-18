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
import { permanentlyDeleteCutsheet, restoreCutsheet } from "@/lib/actions";

export function TrashRowActions({
  cutsheetId,
  title,
}: {
  cutsheetId: number;
  title: string;
}) {
  const [isPending, startTransition] = useTransition();

  const restore = () => {
    startTransition(async () => {
      try {
        await restoreCutsheet(cutsheetId);
        toast.success(`${title} restored.`);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : String(err));
      }
    });
  };

  const purge = () => {
    startTransition(async () => {
      try {
        await permanentlyDeleteCutsheet(cutsheetId);
        toast.success(`${title} permanently deleted.`);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : String(err));
      }
    });
  };

  return (
    <div className="flex shrink-0 items-center gap-2">
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={restore}
        disabled={isPending}
      >
        Restore
      </Button>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button type="button" size="sm" variant="destructive" disabled={isPending}>
            Purge
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Permanently delete this cutsheet?</AlertDialogTitle>
            <AlertDialogDescription>
              This wipes {title} and every attached file from the database. There is
              no recovery after this point. Continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={purge}
              disabled={isPending}
              className="bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/20"
            >
              {isPending ? "Purging…" : "Permanently Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
