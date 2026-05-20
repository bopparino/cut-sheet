"use client";

import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createFolder } from "@/lib/actions";

// Toggles between a + New folder button and an inline name input. Keeps the
// browse-page chrome minimal until the user actually wants to create one.
// `parentId` is hidden form data so the same component creates root folders
// on /browse and subfolders on /browse/[id].
export function CreateFolderForm({ parentId }: { parentId?: number }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  const close = () => {
    setOpen(false);
    if (inputRef.current) inputRef.current.value = "";
  };

  if (!open) {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => {
          setOpen(true);
          setTimeout(() => inputRef.current?.focus(), 0);
        }}
      >
        <Plus className="mr-1 h-4 w-4" />
        New folder
      </Button>
    );
  }

  return (
    <form
      action={(fd) => {
        const name = String(fd.get("name") ?? "").trim();
        if (!name) {
          toast.error("Folder name is required.");
          return;
        }
        startTransition(async () => {
          try {
            await createFolder(fd);
            toast.success(`Folder "${name}" created.`);
            close();
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "Create failed.");
          }
        });
      }}
      className="flex items-center gap-2"
    >
      {parentId != null && <input type="hidden" name="parent_id" value={parentId} />}
      <Input
        ref={inputRef}
        name="name"
        placeholder="Folder name"
        disabled={isPending}
        className="h-9 w-48"
        onKeyDown={(e) => {
          if (e.key === "Escape") close();
        }}
      />
      <Button type="submit" size="sm" disabled={isPending}>
        {isPending ? "Creating…" : "Create"}
      </Button>
      <Button type="button" variant="ghost" size="sm" onClick={close} disabled={isPending}>
        <X className="h-4 w-4" />
      </Button>
    </form>
  );
}
