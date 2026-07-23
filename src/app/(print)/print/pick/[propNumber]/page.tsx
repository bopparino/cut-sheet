import { notFound } from "next/navigation";
import type { TicketKind } from "@/lib/schema";
import { houseSheets } from "@/lib/house";
import { ConsolidatedTicketSheet } from "@/components/print/ConsolidatedTicketSheet";

// The whole-house pick ticket: three consolidated tickets (stock, custom,
// truck) summed across every cutsheet sharing this property number - zones and
// options together, exactly what the shop pulls for one house. houseSheets()
// decides whether the property number really names one house (imported
// library sheets reuse numbers across option variants and placeholders);
// when it doesn't, this 404s and the packet route prints per-sheet tickets.
//
// ?zone=N narrows the sum to that zone's sheets (base + option sheets sharing
// the zone) for the print-one-zone workflow — the tickets then say so, loudly,
// so the shop never mistakes a zone pull for the whole house.
export default async function HousePickTicketPage({
  params,
  searchParams,
}: {
  params: Promise<{ propNumber: string }>;
  searchParams: Promise<{ zone?: string }>;
}) {
  const { propNumber } = await params;
  const { zone } = await searchParams;
  const all = houseSheets(decodeURIComponent(propNumber));
  if (!all) notFound();

  const zoneNorm = (zone ?? "").trim();
  const sheets = zoneNorm
    ? all.filter((s) => (s.data.header.zone ?? "").trim() === zoneNorm)
    : all;
  if (sheets.length === 0) notFound();

  const tickets: TicketKind[] = ["stock", "custom", "truck"];

  return (
    <div>
      {tickets.map((ticket, i) => (
        <ConsolidatedTicketSheet
          key={ticket}
          sheets={sheets.map((s) => s.data)}
          ticket={ticket}
          zone={zoneNorm || undefined}
          pageBreakBefore={i > 0}
        />
      ))}
    </div>
  );
}

export const dynamic = "force-dynamic";
