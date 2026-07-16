import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { CutsheetSchema, type Cutsheet } from "@/lib/schema";
import { ConsolidatedTrimPullSheet } from "@/components/print/ConsolidatedTrimPullSheet";

type Row = { id: number; data: string };

// The whole-house trim pull sheet: the four trim sections summed across every
// cutsheet sharing this property number, keeping the zone columns. Driven by
// property number (Kimmy's rule), sheets ordered main-first.
export default async function HouseTrimPage({
  params,
}: {
  params: Promise<{ propNumber: string }>;
}) {
  const { propNumber } = await params;
  const prop = decodeURIComponent(propNumber).trim();
  if (!prop) notFound();

  const rows = db
    .prepare<[string], Row>(
      `SELECT id, data FROM cutsheets
       WHERE deleted_at IS NULL
         AND TRIM(json_extract(data, '$.header.propNumber')) = ?
       ORDER BY
         CAST(json_extract(data, '$.header.zone') AS INTEGER) ASC,
         json_extract(data, '$.header.zone') ASC,
         id ASC`,
    )
    .all(prop);

  const sheets: Cutsheet[] = rows
    .map((r) => {
      const parsed = CutsheetSchema.safeParse(JSON.parse(r.data));
      return parsed.success ? parsed.data : null;
    })
    .filter((x): x is Cutsheet => x !== null);

  if (sheets.length === 0) notFound();

  return <ConsolidatedTrimPullSheet sheets={sheets} />;
}

export const dynamic = "force-dynamic";
