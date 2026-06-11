import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { db } from "@/lib/db";

type CutsheetRow = {
  id: number;
  data: string;
  created_at: string;
  updated_at: string;
};

type LotRow = {
  id: number;
  lot: string | null;
  deliveryDate: string | null;
  propNumber: string | null;
  builder: string | null;
};

type SearchParams = {
  name?: string;
  builder?: string;
  lot?: string;
  deliveryFrom?: string;
  deliveryTo?: string;
};

const DUPLICATE_WINDOW_DAYS = 14;

export const dynamic = "force-dynamic";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const filters = {
    name: (sp.name ?? "").trim(),
    builder: (sp.builder ?? "").trim(),
    lot: (sp.lot ?? "").trim(),
    deliveryFrom: (sp.deliveryFrom ?? "").trim(),
    deliveryTo: (sp.deliveryTo ?? "").trim(),
  };

  // Build the WHERE clause dynamically. Each populated filter contributes one
  // AND clause + one named param; missing filters drop out entirely.
  // User-typed % and _ are LIKE wildcards — escape them so searches match
  // the literal text.
  const escapeLike = (s: string) => s.replace(/[\\%_]/g, "\\$&");
  const wheres: string[] = [];
  const params: Record<string, string> = {};
  if (filters.name) {
    wheres.push("LOWER(json_extract(data, '$.name')) LIKE @name ESCAPE '\\'");
    params.name = `%${escapeLike(filters.name.toLowerCase())}%`;
  }
  if (filters.builder) {
    wheres.push("LOWER(json_extract(data, '$.header.builder')) LIKE @builder ESCAPE '\\'");
    params.builder = `%${escapeLike(filters.builder.toLowerCase())}%`;
  }
  if (filters.lot) {
    wheres.push("json_extract(data, '$.header.lot') = @lot");
    params.lot = filters.lot;
  }
  if (filters.deliveryFrom) {
    wheres.push("json_extract(data, '$.header.deliveryDate') >= @deliveryFrom");
    params.deliveryFrom = filters.deliveryFrom;
  }
  if (filters.deliveryTo) {
    wheres.push("json_extract(data, '$.header.deliveryDate') <= @deliveryTo");
    params.deliveryTo = filters.deliveryTo;
  }

  // deleted_at IS NULL is always part of WHERE — soft-deleted cutsheets only
  // surface in /admin/trash.
  const allWheres = ["deleted_at IS NULL", ...wheres];
  const sql = `
    SELECT id, data, created_at, updated_at FROM cutsheets
    WHERE ${allWheres.join(" AND ")}
    ORDER BY updated_at DESC
    LIMIT 50
  `;
  const rows = db.prepare(sql).all(params) as CutsheetRow[];

  // Duplicate-lot detection runs against *all* cutsheets — a lot collision is
  // meaningful even when it falls outside the active filter window, otherwise
  // filtering by builder=ABC would hide a dup against builder=DEF.
  const dupLotIds = findDuplicateLotIds();

  const hasFilters =
    filters.name ||
    filters.builder ||
    filters.lot ||
    filters.deliveryFrom ||
    filters.deliveryTo;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Saved Cutsheets</h1>
        <Button asChild>
          <Link href="/form/new">New Cutsheet</Link>
        </Button>
      </div>

      <Card>
        <CardContent>
          <form method="get" action="/search" className="grid grid-cols-1 gap-3 sm:grid-cols-5">
            <FilterField label="Name" name="name" defaultValue={filters.name} />
            <FilterField label="Builder" name="builder" defaultValue={filters.builder} />
            <FilterField label="Lot" name="lot" defaultValue={filters.lot} />
            <FilterField
              label="Delivery From"
              name="deliveryFrom"
              type="date"
              defaultValue={filters.deliveryFrom}
            />
            <FilterField
              label="Delivery To"
              name="deliveryTo"
              type="date"
              defaultValue={filters.deliveryTo}
            />
            <div className="flex items-center gap-2 sm:col-span-5">
              <Button type="submit" size="sm">Filter</Button>
              {hasFilters && (
                <Button type="button" variant="outline" size="sm" asChild>
                  <Link href="/search">Clear</Link>
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {rows.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            {hasFilters ? (
              <>No cutsheets match these filters.</>
            ) : (
              <>
                No cutsheets yet.{" "}
                <Link href="/form/new" className="font-medium text-foreground underline">
                  Create one
                </Link>
                .
              </>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="p-0">
          <ul className="divide-y">
            {rows.map((row) => {
              const data = JSON.parse(row.data) as {
                name?: string;
                header?: {
                  lot?: string;
                  builder?: string;
                  project?: string;
                  deliveryDate?: string;
                };
              };
              const h = data.header ?? {};
              const title =
                (data.name ?? "").trim() ||
                [h.builder, h.project].filter(Boolean).join(" · ") ||
                `Cutsheet #${row.id}`;
              const meta = [h.lot ? `Lot ${h.lot}` : null, h.deliveryDate || null]
                .filter(Boolean)
                .join(" · ");
              const isDup = dupLotIds.has(row.id);
              return (
                <li key={row.id}>
                  <Link
                    href={`/form/${row.id}`}
                    className="flex items-center justify-between px-5 py-4 hover:bg-accent"
                  >
                    <div className="flex items-center gap-3">
                      <div>
                        <div className="font-medium">{title}</div>
                        {meta && <div className="text-xs text-muted-foreground">{meta}</div>}
                      </div>
                      {isDup && (
                        <span
                          title={`Another cutsheet shares this lot within ${DUPLICATE_WINDOW_DAYS} days`}
                          className="inline-flex shrink-0 items-center rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-amber-800"
                        >
                          Dup lot
                        </span>
                      )}
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

function FilterField({
  label,
  name,
  type = "text",
  defaultValue,
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} type={type} defaultValue={defaultValue} className="h-9" />
    </div>
  );
}

// Conservative dup rule: both cutsheets must have a delivery date, the dates
// must be within DUPLICATE_WINDOW_DAYS of each other, and the lot must match
// non-empty. Incomplete cutsheets (missing date or lot) never trigger the
// warning, which keeps the badge useful instead of noisy.
//
// Two exclusions keep multi-builder shops and multi-zone houses from
// drowning the badge in false positives:
// - same non-empty propNumber → these are zones of one house (the combined
//   house PDF depends on them sharing propNumber + lot), not duplicates
// - both builders non-empty and different → "Lot 12" is only unique within
//   a builder, so cross-builder collisions are coincidence, not dups
function findDuplicateLotIds(): Set<number> {
  const all = db
    .prepare(
      `SELECT id,
        json_extract(data, '$.header.lot') AS lot,
        json_extract(data, '$.header.deliveryDate') AS deliveryDate,
        json_extract(data, '$.header.propNumber') AS propNumber,
        json_extract(data, '$.header.builder') AS builder
      FROM cutsheets
      WHERE deleted_at IS NULL
        AND json_extract(data, '$.header.lot') IS NOT NULL
        AND json_extract(data, '$.header.lot') != ''
        AND json_extract(data, '$.header.deliveryDate') IS NOT NULL
        AND json_extract(data, '$.header.deliveryDate') != ''`,
    )
    .all() as LotRow[];

  const byLot = new Map<string, LotRow[]>();
  for (const r of all) {
    if (!r.lot) continue;
    const key = r.lot.trim();
    const list = byLot.get(key) ?? [];
    list.push(r);
    byLot.set(key, list);
  }

  const dups = new Set<number>();
  const windowMs = DUPLICATE_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  for (const group of byLot.values()) {
    if (group.length < 2) continue;
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        const x = group[i]!;
        const y = group[j]!;
        if (!x.deliveryDate || !y.deliveryDate) continue;
        const propX = (x.propNumber ?? "").trim();
        const propY = (y.propNumber ?? "").trim();
        if (propX && propX === propY) continue;
        const builderX = (x.builder ?? "").trim().toLowerCase();
        const builderY = (y.builder ?? "").trim().toLowerCase();
        if (builderX && builderY && builderX !== builderY) continue;
        const diff = Math.abs(
          new Date(x.deliveryDate).getTime() - new Date(y.deliveryDate).getTime(),
        );
        if (diff <= windowMs) {
          dups.add(x.id);
          dups.add(y.id);
        }
      }
    }
  }
  return dups;
}
