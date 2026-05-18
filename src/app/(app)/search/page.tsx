import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
    .prepare<
      [],
      CutsheetRow
    >("SELECT id, data, created_at, updated_at FROM cutsheets ORDER BY updated_at DESC LIMIT 50")
    .all();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Saved Cutsheets</h1>
        <Button asChild>
          <Link href="/form/new">New Cutsheet</Link>
        </Button>
      </div>

      {rows.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No cutsheets yet.{" "}
            <Link href="/form/new" className="font-medium text-foreground underline">
              Create one
            </Link>
            .
          </CardContent>
        </Card>
      ) : (
        <Card className="p-0">
          <ul className="divide-y">
            {rows.map((row) => {
              const data = JSON.parse(row.data) as {
                header?: { lot?: string; builder?: string; project?: string; deliveryDate?: string };
              };
              const h = data.header ?? {};
              const title =
                [h.builder, h.project].filter(Boolean).join(" · ") || `Cutsheet #${row.id}`;
              const meta = [h.lot ? `Lot ${h.lot}` : null, h.deliveryDate || null]
                .filter(Boolean)
                .join(" · ");
              return (
                <li key={row.id}>
                  <Link
                    href={`/form/${row.id}`}
                    className="flex items-center justify-between px-5 py-4 hover:bg-accent"
                  >
                    <div>
                      <div className="font-medium">{title}</div>
                      {meta && <div className="text-xs text-muted-foreground">{meta}</div>}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Updated {row.updated_at}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </div>
  );
}
