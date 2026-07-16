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
export default async function HousePickTicketPage({
  params,
}: {
  params: Promise<{ propNumber: string }>;
}) {
  const { propNumber } = await params;
  const sheets = houseSheets(decodeURIComponent(propNumber));
  if (!sheets) notFound();

  const tickets: TicketKind[] = ["stock", "custom", "truck"];

  return (
    <div>
      {tickets.map((ticket, i) => (
        <ConsolidatedTicketSheet
          key={ticket}
          sheets={sheets.map((s) => s.data)}
          ticket={ticket}
          pageBreakBefore={i > 0}
        />
      ))}
    </div>
  );
}

export const dynamic = "force-dynamic";
