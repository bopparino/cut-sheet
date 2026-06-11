import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { BrowseViewToggle } from "@/components/folders/BrowseViewToggle";
import { CreateFolderForm } from "@/components/folders/CreateFolderForm";
import { DeleteFolderButton } from "@/components/folders/DeleteFolderButton";
import {
  BrowseGrid,
  type CutsheetItem,
  type FolderItem,
} from "@/components/folders/BrowseGrid";
import { db } from "@/lib/db";
import { ancestorChain, isDescendantOrSelf, listAllFolders, withPaths } from "@/lib/folders";
import { moveFolder, renameFolder } from "@/lib/actions";

type Folder = { id: number; name: string; parent_id: number | null };
type CutsheetRow = { id: number; data: string; updated_at: string };
type SubfolderRow = { id: number; name: string; cutsheet_count: number };

export const dynamic = "force-dynamic";

export default async function FolderPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ view?: string }>;
}) {
  const { id } = await params;
  const numeric = Number(id);
  if (!Number.isInteger(numeric)) notFound();

  const folder = db
    .prepare<[number], Folder>(
      "SELECT id, name, parent_id FROM folders WHERE id = ?",
    )
    .get(numeric);
  if (!folder) notFound();

  const sp = await searchParams;
  const view: "grid" | "list" = sp.view === "list" ? "list" : "grid";

  const allFolders = listAllFolders();
  const breadcrumb = ancestorChain(allFolders, folder.id);
  const allWithPaths = withPaths(allFolders);
  const moveTargetForThisFolder = allWithPaths
    .filter((f) => !isDescendantOrSelf(allFolders, f.id, folder.id))
    .sort((a, b) => a.path.localeCompare(b.path));

  const subfolderRows = db
    .prepare<[number], SubfolderRow>(
      `SELECT f.id, f.name,
              (SELECT COUNT(*) FROM cutsheets c
                 WHERE c.folder_id = f.id AND c.deleted_at IS NULL) AS cutsheet_count
       FROM folders f
       WHERE f.parent_id = ?
       ORDER BY f.name COLLATE NOCASE ASC`,
    )
    .all(numeric);

  const cutsheetRows = db
    .prepare<[number], CutsheetRow>(
      `SELECT id, data, updated_at FROM cutsheets
       WHERE deleted_at IS NULL AND folder_id = ?
       ORDER BY updated_at DESC`,
    )
    .all(numeric);

  const folders: FolderItem[] = subfolderRows.map((f) => ({
    id: f.id,
    name: f.name,
    cutsheetCount: f.cutsheet_count,
  }));
  const cutsheets: CutsheetItem[] = cutsheetRows.map((r) => toCutsheetItem(r));

  const folderOptions = allWithPaths
    .map((f) => ({ id: f.id, path: f.path }))
    .sort((a, b) => a.path.localeCompare(b.path));

  const rename = renameFolder.bind(null, folder.id);
  const move = moveFolder.bind(null, folder.id);

  return (
    <div className="space-y-6">
      <Breadcrumbs chain={breadcrumb} />

      <div className="flex flex-wrap items-end justify-between gap-3">
        <form action={rename} className="flex flex-1 items-center gap-2">
          <Input
            name="name"
            defaultValue={folder.name}
            aria-label="Folder name"
            className="h-10 max-w-md text-xl font-semibold tracking-tight"
          />
          <Button type="submit" size="sm" variant="outline">
            Rename
          </Button>
        </form>
        <div className="flex flex-wrap items-center gap-3">
          <form action={move} className="flex items-center gap-1.5">
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
              Move to
              <select
                name="parent_id"
                defaultValue={folder.parent_id == null ? "" : String(folder.parent_id)}
                className="h-8 rounded-md border border-input bg-background px-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              >
                <option value="">Top level</option>
                {moveTargetForThisFolder.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.path}
                  </option>
                ))}
              </select>
            </label>
            <Button type="submit" size="sm" variant="outline">
              Move
            </Button>
          </form>
          <BrowseViewToggle value={view} />
          <DeleteFolderButton
            folderId={folder.id}
            folderName={folder.name}
            cutsheetCount={cutsheets.length}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <CreateFolderForm parentId={folder.id} />
      </div>

      {folders.length === 0 && cutsheets.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            This folder is empty. Add a subfolder above, or move a cutsheet into
            it from the cutsheet toolbar.
          </CardContent>
        </Card>
      ) : (
        <BrowseGrid
          key={folder.id}
          folders={folders}
          cutsheets={cutsheets}
          view={view}
          folderOptions={folderOptions}
          currentFolderId={folder.id}
        />
      )}
    </div>
  );
}

function Breadcrumbs({ chain }: { chain: Folder[] }) {
  return (
    <nav className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
      <Link href="/browse" className="hover:text-foreground">
        Browse
      </Link>
      {chain.map((f, i) => {
        const isLast = i === chain.length - 1;
        return (
          <span key={f.id} className="flex items-center gap-1">
            <ChevronRight className="h-3.5 w-3.5" />
            {isLast ? (
              <span className="text-foreground">{f.name}</span>
            ) : (
              <Link href={`/browse/${f.id}`} className="hover:text-foreground">
                {f.name}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}

function toCutsheetItem(row: CutsheetRow): CutsheetItem {
  const parsed = JSON.parse(row.data) as {
    name?: string;
    header?: { lot?: string; builder?: string; project?: string; deliveryDate?: string };
  };
  const h = parsed.header ?? {};
  const title =
    (parsed.name ?? "").trim() ||
    [h.builder, h.project].filter(Boolean).join(" · ") ||
    `Cutsheet #${row.id}`;
  const meta = [h.lot ? `Lot ${h.lot}` : null, h.deliveryDate || null]
    .filter(Boolean)
    .join(" · ");
  return {
    id: row.id,
    title,
    meta: meta || null,
    updatedAt: row.updated_at,
  };
}
