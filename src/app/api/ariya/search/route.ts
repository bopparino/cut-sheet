import { ariyaAuthError, loadSheets, summarize, textMatch, type AriyaFilters } from "@/lib/ariya";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST { builder?, project?, projectCode?, propNumber?, lot?, region?,
//        foreman?, createdFrom?, createdTo?, text?, limit? }
// Returns sheet summaries (no quantities — get /sheet/[id] for the full form).
export async function POST(req: Request) {
  const denied = ariyaAuthError(req);
  if (denied) return denied;

  let body: AriyaFilters & { limit?: number };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Body must be JSON" }, { status: 400 });
  }

  const limit = Math.min(Math.max(Number(body.limit) || 25, 1), 100);
  const sheets = loadSheets(body);

  if (body.text) {
    const matches = textMatch(sheets, body.text).slice(0, limit);
    return Response.json({
      totalMatched: matches.length,
      results: matches.map((m) => ({ ...summarize(m.sheet), snippet: m.snippet })),
    });
  }

  return Response.json({
    totalMatched: sheets.length,
    results: sheets.slice(0, limit).map(summarize),
  });
}
