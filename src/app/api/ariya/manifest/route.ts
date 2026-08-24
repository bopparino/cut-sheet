import { ariyaAuthError, type AriyaFilters } from "@/lib/ariya";
import { buildManifest } from "@/lib/manifest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST { deliveryFrom?, deliveryTo?, builder?, project?, text?, ... } —
// returns a grouped packing list of every non-zero component across matched sheets.
export async function POST(req: Request) {
  const denied = ariyaAuthError(req);
  if (denied) return denied;

  let body: AriyaFilters;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Body must be JSON" }, { status: 400 });
  }

  const manifest = buildManifest(body);
  return Response.json(manifest);
}
