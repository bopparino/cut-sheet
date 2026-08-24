import { aggregate, ariyaAuthError, type AriyaFilters } from "@/lib/ariya";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST { path, ...filters } — returns aggregate data as a downloadable CSV.
export async function POST(req: Request) {
  const denied = ariyaAuthError(req);
  if (denied) return denied;

  let body: AriyaFilters & { path?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Body must be JSON" }, { status: 400 });
  }

  const result = aggregate(body.path ?? "", body);
  if ("error" in result) return Response.json(result, { status: 400 });

  // Build CSV
  const lines: string[] = [];
  lines.push("Item,Quantity");

  if (result.kind === "total") {
    lines.push(`Total,${result.total}`);
  } else {
    for (const [key, qty] of Object.entries(result.totals)) {
      lines.push(`"${key}",${qty}`);
    }
    lines.push(`"Grand Total",${result.grandTotal}`);
  }

  const csv = lines.join("\n");
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": 'attachment; filename="aggregate.csv"',
    },
  });
}
