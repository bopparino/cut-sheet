import Link from "next/link";
import { Folder, FileText } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { BrowseViewToggle } from "@/components/folders/BrowseViewToggle";
import { CreateFolderForm } from "@/components/folders/CreateFolderForm";
import { db } from "@/lib/db";

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

  const folders = db
    .prepare<[], FolderRow>(
      `SELECT f.id, f.name,
              (SELECT COUNT(*) FROM cutsheets c
                 WHERE c.folder_id = f.id AND c.deleted_at IS NULL) AS cutsheet_count
       FROM folders f
       ORDER BY f.name COLLATE NOCASE ASC`,
    )
    .all();

  const unfiled = db
    .prepare<[], CutsheetRow>(
      `SELECT id, data, folder_id, updated_at FROM cutsheets
       WHERE deleted_at IS NULL AND folder_id IS NULL
       ORDER BY updated_at DESC
       LIMIT 50`,
    )
    .all();

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
              <CutsheetTile key={row.id} row={row} />
            ))}
          </div>
        ) : (
          <CutsheetList rows={recent} />
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

        {folders.length === 0 && unfiled.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              Nothing here yet. Create a folder above or start a new cutsheet.
            </CardContent>
          </Card>
        ) : view === "grid" ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {folders.map((f) => (
              <FolderTile key={f.id} folder={f} />
            ))}
            {unfiled.map((row) => (
              <CutsheetTile key={row.id} row={row} />
            ))}
          </div>
        ) : (
          <Card className="p-0">
            <ul className="divide-y">
              {folders.map((f) => (
                <FolderListRow key={f.id} folder={f} />
              ))}
              {unfiled.map((row) => (
                <CutsheetListRow key={row.id} row={row} />
              ))}
            </ul>
          </Card>
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
    <Link href={`/form/${row.id}`} className="block transition-transform active:scale-[0.98]">
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

function FolderTile({ folder }: { folder: FolderRow }) {
  return (
    <Link href={`/browse/${folder.id}`} className="block transition-transform active:scale-[0.98]">
      <Card className="h-full transition-colors hover:bg-accent">
        <CardContent className="flex h-full flex-col gap-1 py-4">
          <Folder className="mb-1 h-4 w-4 text-muted-foreground" />
          <div className="line-clamp-2 text-sm font-medium leading-snug">{folder.name}</div>
          <div className="mt-auto text-[10px] text-muted-foreground">
            {folder.cutsheet_count} {folder.cutsheet_count === 1 ? "cutsheet" : "cutsheets"}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function CutsheetList({ rows }: { rows: CutsheetRow[] }) {
  return (
    <Card className="p-0">
      <ul className="divide-y">
        {rows.map((row) => (
          <CutsheetListRow key={row.id} row={row} />
        ))}
      </ul>
    </Card>
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

function FolderListRow({ folder }: { folder: FolderRow }) {
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
