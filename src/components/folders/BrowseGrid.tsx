"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Check, FileText, Folder } from "lucide-react";
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
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { bulkDelete, bulkMove } from "@/lib/actions";
import { formatDateTime } from "@/lib/utils";

export type FolderItem = { id: number; name: string; cutsheetCount: number };
export type CutsheetItem = {
  id: number;
  title: string;
  meta: string | null;
  updatedAt: string;
};
export type FolderOption = { id: number; path: string };

type Props = {
  folders: FolderItem[];
  cutsheets: CutsheetItem[];
  view: "grid" | "list";
  // Every folder in the DB with its full ancestor path, used to populate the
  // move-target dropdown.
  folderOptions: FolderOption[];
  // When provided, that folder is excluded from the move-target dropdown
  // (avoids "Move to the folder you're already in" as a no-op option).
  currentFolderId?: number;
};

// Two modes: browse (links navigate) and select (clicks toggle checkboxes).
// Action bar appears under the section header when select mode is on.
export function BrowseGrid({
  folders,
  cutsheets,
  view,
  folderOptions,
  currentFolderId,
}: Props) {
  const [selectMode, setSelectMode] = useState(false);
  const [selectedFolders, setSelectedFolders] = useState<Set<number>>(new Set());
  const [selectedCutsheets, setSelectedCutsheets] = useState<Set<number>>(new Set());
  const [moveOpen, setMoveOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const total = selectedFolders.size + selectedCutsheets.size;

  const toggleFolder = (id: number) =>
    setSelectedFolders((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const toggleCutsheet = (id: number) =>
    setSelectedCutsheets((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const exitSelect = () => {
    setSelectMode(false);
    setSelectedFolders(new Set());
    setSelectedCutsheets(new Set());
  };

  const moveTargets = folderOptions.filter((f) => f.id !== currentFolderId);

  const handleMove = (fd: FormData) => {
    startTransition(async () => {
      try {
        await bulkMove(fd);
        toast.success(`Moved ${total} item${total === 1 ? "" : "s"}.`);
        setMoveOpen(false);
        exitSelect();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Move failed.");
      }
    });
  };

  const handleDelete = () => {
    const fd = new FormData();
    selectedFolders.forEach((id) => fd.append("folder_id", String(id)));
    selectedCutsheets.forEach((id) => fd.append("cutsheet_id", String(id)));
    startTransition(async () => {
      try {
        await bulkDelete(fd);
        toast.success(`Deleted ${total} item${total === 1 ? "" : "s"}.`);
        setDeleteOpen(false);
        exitSelect();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Delete failed.");
      }
    });
  };

  return (
    <>
      {/* Action bar shown only while selecting. Lives above the grid so
          the affordances are visible without scrolling. */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        {selectMode ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium">
              {total} selected
            </span>
            <Button
              type="button"
              size="sm"
              disabled={total === 0 || isPending}
              onClick={() => setMoveOpen(true)}
            >
              Move…
            </Button>
            <Button
              type="button"
              size="sm"
              variant="destructive"
              disabled={total === 0 || isPending}
              onClick={() => setDeleteOpen(true)}
            >
              Delete
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={exitSelect}>
              Cancel
            </Button>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">
            {folders.length} folder{folders.length === 1 ? "" : "s"} ·{" "}
            {cutsheets.length} cutsheet{cutsheets.length === 1 ? "" : "s"}
          </span>
        )}

        {!selectMode && (folders.length > 0 || cutsheets.length > 0) && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setSelectMode(true)}
          >
            Select
          </Button>
        )}
      </div>

      {folders.length === 0 && cutsheets.length === 0 ? null : view === "grid" ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {folders.map((f) => (
            <FolderTile
              key={f.id}
              folder={f}
              selectMode={selectMode}
              selected={selectedFolders.has(f.id)}
              onToggle={() => toggleFolder(f.id)}
            />
          ))}
          {cutsheets.map((c) => (
            <CutsheetTile
              key={c.id}
              cutsheet={c}
              selectMode={selectMode}
              selected={selectedCutsheets.has(c.id)}
              onToggle={() => toggleCutsheet(c.id)}
            />
          ))}
        </div>
      ) : (
        <Card className="p-0">
          <ul className="divide-y">
            {folders.map((f) => (
              <FolderListRow
                key={f.id}
                folder={f}
                selectMode={selectMode}
                selected={selectedFolders.has(f.id)}
                onToggle={() => toggleFolder(f.id)}
              />
            ))}
            {cutsheets.map((c) => (
              <CutsheetListRow
                key={c.id}
                cutsheet={c}
                selectMode={selectMode}
                selected={selectedCutsheets.has(c.id)}
                onToggle={() => toggleCutsheet(c.id)}
              />
            ))}
          </ul>
        </Card>
      )}

      {/* Bulk move dialog */}
      <AlertDialog open={moveOpen} onOpenChange={setMoveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Move {total} item{total === 1 ? "" : "s"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Pick a destination folder. Cutsheets get re-filed; folders
              re-parent under the destination.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <form action={handleMove} className="space-y-3">
            {Array.from(selectedFolders).map((id) => (
              <input key={`f${id}`} type="hidden" name="folder_id" value={id} />
            ))}
            {Array.from(selectedCutsheets).map((id) => (
              <input key={`c${id}`} type="hidden" name="cutsheet_id" value={id} />
            ))}
            <select
              name="parent_id"
              defaultValue=""
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
              <option value="">Top level (no folder)</option>
              {moveTargets.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.path}
                </option>
              ))}
            </select>
            <AlertDialogFooter>
              <AlertDialogCancel type="button" disabled={isPending}>
                Cancel
              </AlertDialogCancel>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Moving…" : "Move"}
              </Button>
            </AlertDialogFooter>
          </form>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk delete confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete {total} item{total === 1 ? "" : "s"}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {selectedCutsheets.size > 0 && (
                <>
                  {selectedCutsheets.size} cutsheet
                  {selectedCutsheets.size === 1 ? "" : "s"} will be sent to
                  Trash.{" "}
                </>
              )}
              {selectedFolders.size > 0 && (
                <>
                  {selectedFolders.size} folder
                  {selectedFolders.size === 1 ? "" : "s"} will be permanently
                  removed. Subfolders cascade; cutsheets inside become
                  unfiled, not deleted.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isPending}
              className="bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/20"
            >
              {isPending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function FolderTile({
  folder,
  selectMode,
  selected,
  onToggle,
}: {
  folder: FolderItem;
  selectMode: boolean;
  selected: boolean;
  onToggle: () => void;
}) {
  const body = (
    <CardContent className="flex h-full flex-col gap-1 py-4">
      <div className="mb-1 flex items-center justify-between">
        <Folder className="h-4 w-4 text-muted-foreground" />
        {selectMode && <SelectIndicator selected={selected} />}
      </div>
      <div className="line-clamp-2 text-sm font-medium leading-snug">{folder.name}</div>
      <div className="mt-auto text-[10px] text-muted-foreground">
        {folder.cutsheetCount}{" "}
        {folder.cutsheetCount === 1 ? "cutsheet" : "cutsheets"}
      </div>
    </CardContent>
  );

  if (selectMode) {
    return (
      <button
        type="button"
        onClick={onToggle}
        className="block w-full text-left transition-transform active:scale-[0.98]"
      >
        <Card
          className={
            selected
              ? "h-full border-primary bg-primary/5 ring-2 ring-primary"
              : "h-full transition-colors hover:bg-accent"
          }
        >
          {body}
        </Card>
      </button>
    );
  }
  return (
    <Link
      href={`/browse/${folder.id}`}
      className="block transition-transform active:scale-[0.98]"
    >
      <Card className="h-full transition-colors hover:bg-accent">{body}</Card>
    </Link>
  );
}

function CutsheetTile({
  cutsheet,
  selectMode,
  selected,
  onToggle,
}: {
  cutsheet: CutsheetItem;
  selectMode: boolean;
  selected: boolean;
  onToggle: () => void;
}) {
  const body = (
    <CardContent className="flex h-full flex-col gap-1 py-4">
      <div className="mb-1 flex items-center justify-between">
        <FileText className="h-4 w-4 text-muted-foreground" />
        {selectMode && <SelectIndicator selected={selected} />}
      </div>
      <div className="line-clamp-2 text-sm font-medium leading-snug">
        {cutsheet.title}
      </div>
      {cutsheet.meta && (
        <div className="line-clamp-1 text-xs text-muted-foreground">{cutsheet.meta}</div>
      )}
      <div className="mt-auto text-[10px] text-muted-foreground">
        Updated {formatDateTime(cutsheet.updatedAt)}
      </div>
    </CardContent>
  );

  if (selectMode) {
    return (
      <button
        type="button"
        onClick={onToggle}
        className="block w-full text-left transition-transform active:scale-[0.98]"
      >
        <Card
          className={
            selected
              ? "h-full border-primary bg-primary/5 ring-2 ring-primary"
              : "h-full transition-colors hover:bg-accent"
          }
        >
          {body}
        </Card>
      </button>
    );
  }
  return (
    <Link
      href={`/form/${cutsheet.id}`}
      className="block transition-transform active:scale-[0.98]"
    >
      <Card className="h-full transition-colors hover:bg-accent">{body}</Card>
    </Link>
  );
}

function FolderListRow({
  folder,
  selectMode,
  selected,
  onToggle,
}: {
  folder: FolderItem;
  selectMode: boolean;
  selected: boolean;
  onToggle: () => void;
}) {
  const inner = (
    <>
      <div className="flex items-center gap-3">
        {selectMode && <SelectIndicator selected={selected} />}
        <Folder className="h-4 w-4 shrink-0 text-muted-foreground" />
        <div className="font-medium">{folder.name}</div>
      </div>
      <div className="text-xs text-muted-foreground">
        {folder.cutsheetCount}{" "}
        {folder.cutsheetCount === 1 ? "cutsheet" : "cutsheets"}
      </div>
    </>
  );
  if (selectMode) {
    return (
      <li>
        <button
          type="button"
          onClick={onToggle}
          className={`flex w-full items-center justify-between gap-3 px-5 py-3 text-left ${
            selected ? "bg-primary/5" : "hover:bg-accent"
          }`}
        >
          {inner}
        </button>
      </li>
    );
  }
  return (
    <li>
      <Link
        href={`/browse/${folder.id}`}
        className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-accent"
      >
        {inner}
      </Link>
    </li>
  );
}

function CutsheetListRow({
  cutsheet,
  selectMode,
  selected,
  onToggle,
}: {
  cutsheet: CutsheetItem;
  selectMode: boolean;
  selected: boolean;
  onToggle: () => void;
}) {
  const inner = (
    <>
      <div className="flex items-center gap-3">
        {selectMode && <SelectIndicator selected={selected} />}
        <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
        <div>
          <div className="font-medium">{cutsheet.title}</div>
          {cutsheet.meta && (
            <div className="text-xs text-muted-foreground">{cutsheet.meta}</div>
          )}
        </div>
      </div>
      <div className="text-xs text-muted-foreground">
        Updated {formatDateTime(cutsheet.updatedAt)}
      </div>
    </>
  );
  if (selectMode) {
    return (
      <li>
        <button
          type="button"
          onClick={onToggle}
          className={`flex w-full items-center justify-between gap-3 px-5 py-3 text-left ${
            selected ? "bg-primary/5" : "hover:bg-accent"
          }`}
        >
          {inner}
        </button>
      </li>
    );
  }
  return (
    <li>
      <Link
        href={`/form/${cutsheet.id}`}
        className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-accent"
      >
        {inner}
      </Link>
    </li>
  );
}

function SelectIndicator({ selected }: { selected: boolean }) {
  return (
    <span
      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
        selected
          ? "border-primary bg-primary text-primary-foreground"
          : "border-input bg-background"
      }`}
      aria-hidden
    >
      {selected && <Check className="h-3.5 w-3.5" />}
    </span>
  );
}
