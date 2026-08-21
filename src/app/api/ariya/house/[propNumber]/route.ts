import { ariyaAuthError, houseReport } from "@/lib/ariya";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET the whole-house view behind one property number: every sheet on the
// prop, whether they truly form one house, and combined non-zero quantities.
export async function GET(req: Request, { params }: { params: Promise<{ propNumber: string }> }) {
  const denied = ariyaAuthError(req);
  if (denied) return denied;

  const { propNumber } = await params;
  const report = houseReport(decodeURIComponent(propNumber));
  if ("error" in report) return Response.json(report, { status: 404 });
  return Response.json(report);
}
