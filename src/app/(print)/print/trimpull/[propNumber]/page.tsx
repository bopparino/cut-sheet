import { notFound } from "next/navigation";
import { houseSheets } from "@/lib/house";
import { ConsolidatedTrimPullSheet } from "@/components/print/ConsolidatedTrimPullSheet";

// The whole-house trim pull sheet: the four trim sections summed across every
// cutsheet sharing this property number, keeping the zone columns. houseSheets()
// decides whether the property number really names one house (imported library
// sheets reuse numbers across option variants and placeholders); when it
// doesn't, this 404s and the packet route prints the per-sheet trim pull.
export default async function HouseTrimPage({
  params,
}: {
  params: Promise<{ propNumber: string }>;
}) {
  const { propNumber } = await params;
  const sheets = houseSheets(decodeURIComponent(propNumber));
  if (!sheets) notFound();

  return <ConsolidatedTrimPullSheet sheets={sheets.map((s) => s.data)} />;
}

export const dynamic = "force-dynamic";
