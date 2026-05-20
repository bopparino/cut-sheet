import Link from "next/link";
import { FileText } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { BrowseViewToggle } from "@/components/folders/BrowseViewToggle";
import { CreateFolderForm } from "@/components/folders/CreateFolderForm";
import {
  BrowseGrid,
  type CutsheetItem,
  type FolderItem,
} from "@/components/folders/BrowseGrid";
import { db } from "@/lib/db";
import { listAllFolders, withPaths } from "@/lib/folders";

type CutsheetRow = {
  id: number;
  data: string;
  folder_id: number | null;
  updated_at: string;
};
type FolderRow = { id: number; name: string; cutsheet_count: number };

export const dynamic = "force-dynamic";

export default async function BrowsePage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const sp = await searchParams;
  const view: "grid" | "list" = sp.view === "list" ? "list" : "grid";

  const recent = db
    .prepare<[], CutsheetRow>(
      `SELECT id, data, folder_id, updated_at FROM cutsheets
       WHERE deleted_at IS NULL
       ORDER BY updated_at DESC
       LIMIT 5`,
    )
    .all();

  const folderRows = db
    .prepare<[], FolderRow>(
      `SELECT f.id, f.name,
              (SELECT COUNT(*) FROM cutsheets c
                 WHERE c.folder_id = f.id AND c.deleted_at IS NULL) AS cutsheet_count
       FROM folders f
       WHERE f.parent_id IS NULL
       ORDER BY f.name COLLATE NOCASE ASC`,
    )
    .all();

  const unfiledRows = db
    .prepare<[], CutsheetRow>(
      `SELECT id, data, folder_id, updated_at FROM cutsheets
       WHERE deleted_at IS NULL AND folder_id IS NULL
       ORDER BY updated_at DESC
       LIMIT 50`,
    )
    .all();

  const folders: FolderItem[] = folderRows.map((f) => ({
    id: f.id,
    name: f.name,
    cutsheetCount: f.cutsheet_count,
  }));
  const cutsheets: CutsheetItem[] = unfiledRows.map((r) => toCutsheetItem(r));

  const folderOptions = withPaths(listAllFolders())
    .map((f) => ({ id: f.id, path: f.path }))
    .sort((a, b) => a.path.localeCompare(b.path));

  return (
    <div className="space-y-10">
      <section className="space-y-3">
        <SectionHeader title="Recent" />
        {recent.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              No cutsheets yet.{" "}
              <Link href="/form/new" className="font-medium text-foreground underline">
                Create one
              </Link>
              .
            </CardContent>
          </Card>
        ) : view === "grid" ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {recent.map((row) => (
              <RecentTile key={row.id} row={row} />
            ))}
          </div>
        ) : (
          <Card className="p-0">
            <ul className="divide-y">
              {recent.map((row) => (
                <RecentListRow key={row.id} row={row} />
              ))}
            </ul>
          </Card>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <SectionHeader title="Browse" />
          <div className="flex items-center gap-3">
            <CreateFolderForm />
            <BrowseViewToggle value={view} />
          </div>
        </div>

        {folders.length === 0 && cutsheets.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              Nothing here yet. Create a folder above or start a new cutsheet.
            </CardContent>
          </Card>
        ) : (
          <BrowseGrid
            folders={folders}
            cutsheets={cutsheets}
            view={view}
            folderOptions={folderOptions}
          />
        )}
      </section>
    </div>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
      {title}
    </h2>
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

// Recent section is read-only (no selection). Keeping these inline since
// BrowseGrid is built around the selectable model.
function RecentTile({ row }: { row: CutsheetRow }) {
  const item = toCutsheetItem(row);
  return (
    <Link
      href={`/form/${item.id}`}
      className="block transition-transform active:scale-[0.98]"
    >
      <Card className="h-full transition-colors hover:bg-accent">
        <CardContent className="flex h-full flex-col gap-1 py-4">
          <FileText className="mb-1 h-4 w-4 text-muted-foreground" />
          <div className="line-clamp-2 text-sm font-medium leading-snug">
            {item.title}
          </div>
          {item.meta && (
            <div className="line-clamp-1 text-xs text-muted-foreground">{item.meta}</div>
          )}
          <div className="mt-auto text-[10px] text-muted-foreground">
            Updated {item.updatedAt}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function RecentListRow({ row }: { row: CutsheetRow }) {
  const item = toCutsheetItem(row);
  return (
    <li>
      <Link
        href={`/form/${item.id}`}
        className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-accent"
      >
        <div className="flex items-center gap-3">
          <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
          <div>
            <div className="font-medium">{item.title}</div>
            {item.meta && (
              <div className="text-xs text-muted-foreground">{item.meta}</div>
            )}
          </div>
        </div>
        <div className="text-xs text-muted-foreground">Updated {item.updatedAt}</div>
      </Link>
    </li>
  );
}
