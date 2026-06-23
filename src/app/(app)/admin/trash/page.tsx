import { Info } from "lucide-react";
import { TrashRowActions } from "@/components/cutsheet/TrashRowActions";
import { db } from "@/lib/db";

type TrashRow = { id: number; data: string; deleted_at: string; updated_at: string };

export const dynamic = "force-dynamic";

export default function TrashPage() {
  const rows = db
    .prepare<[], TrashRow>(
      `SELECT id, data, deleted_at, updated_at FROM cutsheets
       WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC LIMIT 200`,
    )
    .all();

  return (
    <div>
      <header className="sticky top-0 z-20 border-b border-border bg-background/85 px-8 py-4 backdrop-blur">
        <p className="label-caps">Admin</p>
        <h1 className="text-xl font-bold tracking-tight">Trash</h1>
      </header>

      <div className="px-8 py-7">
        <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            Deleted cutsheets are kept here as a safety net —{" "}
            <span className="font-semibold text-foreground">nothing is ever truly gone</span> until
            purged. Restore one to put it back where it was.
          </p>
        </div>

        {rows.length === 0 ? (
          <div className="rounded-xl border border-border bg-card py-12 text-center text-sm text-muted-foreground">
            Trash is empty.
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/50">
                  <th className="label-caps px-5 py-2.5 text-left">Cutsheet</th>
                  <th className="label-caps px-5 py-2.5 text-left">Lot</th>
                  <th className="label-caps px-5 py-2.5 text-left">Deleted</th>
                  <th className="label-caps px-5 py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
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
                  return (
                    <tr key={row.id} className="transition-colors hover:bg-accent/30">
                      <td className="px-5 py-3.5 font-semibold">{title}</td>
                      <td className="font-mono-data px-5 py-3.5 text-muted-foreground">{h.lot || "—"}</td>
                      <td className="font-mono-data px-5 py-3.5 text-muted-foreground">{row.deleted_at}</td>
                      <td className="px-5 py-3.5">
                        <div className="flex justify-end">
                          <TrashRowActions cutsheetId={row.id} title={title} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
