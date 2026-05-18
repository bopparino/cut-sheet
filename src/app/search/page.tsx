import Link from "next/link";
import { db } from "@/lib/db";

type CutsheetRow = {
  id: number;
  data: string;
  created_at: string;
  updated_at: string;
};

export const dynamic = "force-dynamic";

export default function SearchPage() {
  const rows = db
    .prepare<[], CutsheetRow>("SELECT id, data, created_at, updated_at FROM cutsheets ORDER BY updated_at DESC LIMIT 50")
    .all();

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">Saved Cutsheets</h1>
      {rows.length === 0 ? (
        <p className="text-muted-foreground">
          No cutsheets yet.{" "}
          <Link href="/form/new" className="underline">
            Create one
          </Link>
          .
        </p>
      ) : (
        <ul className="divide-y rounded-lg border">
          {rows.map((row) => {
            const data = JSON.parse(row.data) as { header?: { lot?: string; builder?: string } };
            const label = data.header?.lot
              ? `Lot ${data.header.lot}${data.header.builder ? ` · ${data.header.builder}` : ""}`
              : `Cutsheet #${row.id}`;
            return (
              <li key={row.id}>
                <Link
                  href={`/form/${row.id}`}
                  className="flex items-center justify-between px-4 py-3 hover:bg-accent"
                >
                  <span>{label}</span>
                  <span className="text-xs text-muted-foreground">
                    Updated {row.updated_at}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
