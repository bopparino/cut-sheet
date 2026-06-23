import Link from "next/link";
import { FileText, Search as SearchIcon, Plus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { BrowseViewToggle } from "@/components/folders/BrowseViewToggle";
import { CreateFolderForm } from "@/components/folders/CreateFolderForm";
import {
  BrowseGrid,
  type CutsheetItem,
  type FolderItem,
} from "@/components/folders/BrowseGrid";
import { db } from "@/lib/db";
import { listAllFolders, subtreeCutsheetCounts, withPaths } from "@/lib/folders";

type CutsheetRow = {
  id: number;
  data: string;
  folder_id: number | null;
  updated_at: string;
};
type FolderRow = { id: number; name: string };

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
       WHERE deleted_at IS NULL ORDER BY updated_at DESC LIMIT 5`,
    )
    .all();

  const folderRows = db
    .prepare<[], FolderRow>(
      `SELECT f.id, f.name FROM folders f
       WHERE f.parent_id IS NULL ORDER BY f.name COLLATE NOCASE ASC`,
    )
    .all();
  const counts = subtreeCutsheetCounts();

  const unfiledRows = db
    .prepare<[], CutsheetRow>(
      `SELECT id, data, folder_id, updated_at FROM cutsheets
       WHERE deleted_at IS NULL AND folder_id IS NULL
       ORDER BY updated_at DESC LIMIT 50`,
    )
    .all();

  const totalFolders =
    db.prepare<[], { n: number }>("SELECT COUNT(*) AS n FROM folders").get()?.n ?? 0;
  const totalCutsheets =
    db
      .prepare<[], { n: number }>(
        "SELECT COUNT(*) AS n FROM cutsheets WHERE deleted_at IS NULL",
      )
      .get()?.n ?? 0;

  const folders: FolderItem[] = folderRows.map((f) => ({
    id: f.id,
    name: f.name,
    cutsheetCount: counts.get(f.id) ?? 0,
  }));
  const cutsheets: CutsheetItem[] = unfiledRows.map((r) => toCutsheetItem(r));

  const folderOptions = withPaths(listAllFolders())
    .map((f) => ({ id: f.id, path: f.path }))
    .sort((a, b) => a.path.localeCompare(b.path));

  return (
    <div>
      <header className="sticky top-0 z-20 flex items-center gap-4 border-b border-border bg-background/85 px-8 py-4 backdrop-blur">
        <div className="min-w-0">
          <h1 className="text-xl font-bold tracking-tight">Browse</h1>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {totalFolders.toLocaleString()} folders · {totalCutsheets.toLocaleString()} cutsheets
          </p>
        </div>
        <form action="/search" className="relative ml-auto hidden max-w-md flex-1 sm:block">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            name="name"
            placeholder="Search by name, builder, lot…"
            className="h-10 w-full rounded-lg border border-input bg-card pl-9 pr-3 text-sm outline-none transition-shadow focus:border-ring focus:ring-2 focus:ring-ring/30"
          />
        </form>
        <Link
          href="/form/new"
          className="btn-glow inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-sm font-semibold text-primary-foreground"
        >
          <Plus className="h-4 w-4" /> New Cutsheet
        </Link>
      </header>

      <div className="space-y-10 px-8 py-7">
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
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {recent.map((row) => (
                <RecentTile key={row.id} row={row} />
              ))}
            </div>
          )}
        </section>

        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-2">
            <SectionHeader title="Folders" />
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
    </div>
  );
}

function SectionHeader({ title }: { title: string }) {
  return <h2 className="label-caps">{title}</h2>;
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
  return { id: row.id, title, meta: h.lot ? `Lot ${h.lot}` : null, updatedAt: row.updated_at };
}

function RecentTile({ row }: { row: CutsheetRow }) {
  const item = toCutsheetItem(row);
  return (
    <Link href={`/form/${item.id}`} className="block transition-transform active:scale-[0.99]">
      <Card className="h-full transition-colors hover:border-primary/40 hover:bg-accent/40">
        <CardContent className="flex h-full flex-col gap-2 py-4">
          <div className="flex items-start justify-between">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <FileText className="h-4 w-4" />
            </span>
            {item.meta && (
              <span className="font-mono-data rounded-md bg-secondary px-1.5 py-0.5 text-[10px] text-muted-foreground">
                {item.meta}
              </span>
            )}
          </div>
          <div className="line-clamp-2 text-sm font-semibold leading-snug">{item.title}</div>
          <div className="mt-auto text-[10px] text-muted-foreground">Updated {item.updatedAt}</div>
        </CardContent>
      </Card>
    </Link>
  );
}
