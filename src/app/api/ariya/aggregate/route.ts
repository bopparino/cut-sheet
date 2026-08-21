import { aggregate, ariyaAuthError, type AriyaFilters } from "@/lib/ariya";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST { path, ...filters } — path is "/"-separated (size keys contain dots),
// e.g. "stock/duct60/8x16" for one size, "stock/duct60" for every size at
// once. Sums across every non-deleted sheet matching the filters.
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
  return Response.json(result);
}
