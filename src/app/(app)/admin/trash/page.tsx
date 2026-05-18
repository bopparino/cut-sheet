import { Card, CardContent } from "@/components/ui/card";
import { TrashRowActions } from "@/components/cutsheet/TrashRowActions";
import { db } from "@/lib/db";

type TrashRow = {
  id: number;
  data: string;
  deleted_at: string;
  updated_at: string;
};

export const dynamic = "force-dynamic";

// Hidden admin trash. No nav link — accessible by typing /admin/trash. The
// soft-delete safety net behind the "irreversible" message users see on the
// form-page delete dialog.
export default function TrashPage() {
  const rows = db
    .prepare<[], TrashRow>(
      `SELECT id, data, deleted_at, updated_at
       FROM cutsheets
       WHERE deleted_at IS NOT NULL
       ORDER BY deleted_at DESC
       LIMIT 200`,
    )
    .all();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Trash</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Soft-deleted cutsheets. Restore brings them back to /search. Purge is the
          hard delete — no recovery after that.
        </p>
      </div>

      {rows.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Trash is empty.
          </CardContent>
        </Card>
      ) : (
        <Card className="p-0">
          <ul className="divide-y">
            {rows.map((row) => {
              const data = JSON.parse(row.data) as {
                name?: string;
                header?: { builder?: string; project?: string; lot?: string };
              };
              const h = data.header ?? {};
              const title =
                (data.name ?? "").trim() ||
                [h.builder, h.project].filter(Boolean).join(" · ") ||
                `Cutsheet #${row.id}`;
              const meta = [h.lot ? `Lot ${h.lot}` : null, `Deleted ${row.deleted_at}`]
                .filter(Boolean)
                .join(" · ");
              return (
                <li
                  key={row.id}
                  className="flex items-center justify-between gap-3 px-5 py-4"
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{title}</div>
                    <div className="truncate text-xs text-muted-foreground">{meta}</div>
                  </div>
                  <TrashRowActions cutsheetId={row.id} title={title} />
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </div>
  );
}
