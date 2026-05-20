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
import { deleteFolder } from "@/lib/actions";

// Deleting a folder only removes the folder row — its cutsheets revert to
// unfiled because the FK is ON DELETE SET NULL. Dialog copy reflects that.
export function DeleteFolderButton({
  folderId,
  folderName,
  cutsheetCount,
}: {
  folderId: number;
  folderName: string;
  cutsheetCount: number;
}) {
  const [isPending, startTransition] = useTransition();

  const confirm = () => {
    startTransition(async () => {
      try {
        await deleteFolder(folderId);
        toast.success(`Folder "${folderName}" deleted.`);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Delete failed.");
      }
    });
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button type="button" variant="destructive" size="sm" disabled={isPending}>
          Delete folder
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete folder &quot;{folderName}&quot;?</AlertDialogTitle>
          <AlertDialogDescription>
            {cutsheetCount > 0
              ? `Removes the folder. The ${cutsheetCount} cutsheet${cutsheetCount === 1 ? "" : "s"} inside will become unfiled, not deleted.`
              : "Removes the empty folder."}
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
