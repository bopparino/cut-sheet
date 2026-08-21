import { ariyaAuthError, stats, type AriyaFilters, type StatsGroupBy } from "@/lib/ariya";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const GROUP_BYS = new Set(["builder", "project", "region", "foreman", "year"]);

// POST { groupBy, ...filters } — grouped sheet/house counts for "how many /
// who's biggest / per year" questions. Top 50 groups by sheet count.
export async function POST(req: Request) {
  const denied = ariyaAuthError(req);
  if (denied) return denied;

  let body: AriyaFilters & { groupBy?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Body must be JSON" }, { status: 400 });
  }

  const groupBy = body.groupBy ?? "";
  if (!GROUP_BYS.has(groupBy)) {
    return Response.json({ error: `groupBy must be one of: ${[...GROUP_BYS].join(", ")}` }, { status: 400 });
  }
  return Response.json(stats(groupBy as StatsGroupBy, body));
}
