import { TrashRowActions } from "@/components/cutsheet/TrashRowActions";
import { db } from "@/lib/db";
import { relativeTime } from "@/lib/utils";

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
      <header className="sticky top-0 z-20 border-b border-border bg-background/90 px-8 py-[18px] backdrop-blur">
        <h1 className="text-[21px] font-bold tracking-[-0.02em] text-foreground">Trash</h1>
        <p className="font-mono-data mt-0.5 text-[12px] text-[var(--text-3)]">
          {rows.length} item{rows.length === 1 ? "" : "s"} · deleted cutsheets are restorable until purged
        </p>
      </header>

      <div className="px-8 py-7">
        {rows.length === 0 ? (
          <div className="rounded-sm border border-border bg-card py-12 text-center text-[13.5px] text-[var(--text-2)]">
            Trash is empty.
          </div>
        ) : (
          <div className="overflow-hidden rounded-sm border border-border bg-card">
            <div className="grid grid-cols-[60px_minmax(0,1fr)_150px_auto] items-center gap-4 border-b border-border bg-[var(--row-tint)] px-5 py-2.5">
              <span className="label-caps">ID</span>
              <span className="label-caps">Cutsheet</span>
              <span className="label-caps">Deleted</span>
              <span />
            </div>
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
              const meta = [h.lot ? `Lot ${h.lot}` : null, h.builder || null].filter(Boolean).join(" · ");
              return (
                <div
                  key={row.id}
                  className="grid grid-cols-[60px_minmax(0,1fr)_150px_auto] items-center gap-4 border-b border-[var(--divider)] px-5 py-3.5 transition-colors last:border-0 hover:bg-[var(--row-tint)]"
                >
                  <span className="font-mono-data text-[12px] text-[var(--text-3)]">#{row.id}</span>
                  <div className="min-w-0">
                    <div className="truncate text-[14px] font-semibold text-foreground">{title}</div>
                    {meta && <div className="font-mono-data truncate text-[12px] text-[var(--text-3)]">{meta}</div>}
                  </div>
                  <span className="font-mono-data text-[12px] text-[var(--text-3)]">{relativeTime(row.deleted_at)}</span>
                  <div className="flex justify-end">
                    <TrashRowActions cutsheetId={row.id} title={title} />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <p className="font-mono-data mt-4 max-w-2xl text-[11.5px] leading-relaxed text-[var(--text-3)]">
          Deleting a folder unfiles its cutsheets instead of destroying them. They move to Unfiled
          (Imports) in Browse, not here.
        </p>
      </div>
    </div>
  );
}
