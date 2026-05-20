import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, Folder, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { BrowseViewToggle } from "@/components/folders/BrowseViewToggle";
import { CreateFolderForm } from "@/components/folders/CreateFolderForm";
import { DeleteFolderButton } from "@/components/folders/DeleteFolderButton";
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
  // Move target options: every folder except this one and its descendants.
  const moveOptions = allWithPaths
    .filter((f) => !isDescendantOrSelf(allFolders, f.id, folder.id))
    .sort((a, b) => a.path.localeCompare(b.path));

  const subfolders = db
    .prepare<[number], SubfolderRow>(
      `SELECT f.id, f.name,
              (SELECT COUNT(*) FROM cutsheets c
                 WHERE c.folder_id = f.id AND c.deleted_at IS NULL) AS cutsheet_count
       FROM folders f
       WHERE f.parent_id = ?
       ORDER BY f.name COLLATE NOCASE ASC`,
    )
    .all(numeric);

  const cutsheets = db
    .prepare<[number], CutsheetRow>(
      `SELECT id, data, updated_at FROM cutsheets
       WHERE deleted_at IS NULL AND folder_id = ?
       ORDER BY updated_at DESC`,
    )
    .all(numeric);

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
                {moveOptions.map((f) => (
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

      {subfolders.length === 0 && cutsheets.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            This folder is empty. Add a subfolder above, or move a cutsheet into
            it from the cutsheet toolbar.
          </CardContent>
        </Card>
      ) : view === "grid" ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {subfolders.map((f) => (
            <FolderTile key={f.id} folder={f} />
          ))}
          {cutsheets.map((row) => (
            <CutsheetTile key={row.id} row={row} />
          ))}
        </div>
      ) : (
        <Card className="p-0">
          <ul className="divide-y">
            {subfolders.map((f) => (
              <FolderListRow key={f.id} folder={f} />
            ))}
            {cutsheets.map((row) => (
              <CutsheetListRow key={row.id} row={row} />
            ))}
          </ul>
        </Card>
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

function cutsheetTitle(data: string, id: number): { title: string; meta: string | null } {
  const parsed = JSON.parse(data) as {
    name?: string;
    header?: { lot?: string; builder?: string; project?: string; deliveryDate?: string };
  };
  const h = parsed.header ?? {};
  const title =
    (parsed.name ?? "").trim() ||
    [h.builder, h.project].filter(Boolean).join(" · ") ||
    `Cutsheet #${id}`;
  const meta = [h.lot ? `Lot ${h.lot}` : null, h.deliveryDate || null]
    .filter(Boolean)
    .join(" · ");
  return { title, meta: meta || null };
}

function CutsheetTile({ row }: { row: CutsheetRow }) {
  const { title, meta } = cutsheetTitle(row.data, row.id);
  return (
    <Link
      href={`/form/${row.id}`}
      className="block transition-transform active:scale-[0.98]"
    >
      <Card className="h-full transition-colors hover:bg-accent">
        <CardContent className="flex h-full flex-col gap-1 py-4">
          <FileText className="mb-1 h-4 w-4 text-muted-foreground" />
          <div className="line-clamp-2 text-sm font-medium leading-snug">{title}</div>
          {meta && (
            <div className="line-clamp-1 text-xs text-muted-foreground">{meta}</div>
          )}
          <div className="mt-auto text-[10px] text-muted-foreground">
            Updated {row.updated_at}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function FolderTile({ folder }: { folder: SubfolderRow }) {
  return (
    <Link
      href={`/browse/${folder.id}`}
      className="block transition-transform active:scale-[0.98]"
    >
      <Card className="h-full transition-colors hover:bg-accent">
        <CardContent className="flex h-full flex-col gap-1 py-4">
          <Folder className="mb-1 h-4 w-4 text-muted-foreground" />
          <div className="line-clamp-2 text-sm font-medium leading-snug">{folder.name}</div>
          <div className="mt-auto text-[10px] text-muted-foreground">
            {folder.cutsheet_count}{" "}
            {folder.cutsheet_count === 1 ? "cutsheet" : "cutsheets"}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function CutsheetListRow({ row }: { row: CutsheetRow }) {
  const { title, meta } = cutsheetTitle(row.data, row.id);
  return (
    <li>
      <Link
        href={`/form/${row.id}`}
        className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-accent"
      >
        <div className="flex items-center gap-3">
          <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
          <div>
            <div className="font-medium">{title}</div>
            {meta && <div className="text-xs text-muted-foreground">{meta}</div>}
          </div>
        </div>
        <div className="text-xs text-muted-foreground">Updated {row.updated_at}</div>
      </Link>
    </li>
  );
}

function FolderListRow({ folder }: { folder: SubfolderRow }) {
  return (
    <li>
      <Link
        href={`/browse/${folder.id}`}
        className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-accent"
      >
        <div className="flex items-center gap-3">
          <Folder className="h-4 w-4 shrink-0 text-muted-foreground" />
          <div className="font-medium">{folder.name}</div>
        </div>
        <div className="text-xs text-muted-foreground">
          {folder.cutsheet_count}{" "}
          {folder.cutsheet_count === 1 ? "cutsheet" : "cutsheets"}
        </div>
      </Link>
    </li>
  );
}
