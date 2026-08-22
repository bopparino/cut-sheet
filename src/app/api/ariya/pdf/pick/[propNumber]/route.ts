import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { renderPdfFromUrl } from "@/lib/pdf";
import { ariyaAuthError } from "@/lib/ariya";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Whole-house pick-ticket packet for Ariya's house cards — the same Letter
// render as /api/pdf/pick, behind the Ariya bearer token instead of a
// session. Live sheets only (the pick print page consolidates active work);
// archived-only props 404 and the card simply omits the button.
export async function GET(req: Request, { params }: { params: Promise<{ propNumber: string }> }) {
  const denied = ariyaAuthError(req);
  if (denied) return denied;

  const { propNumber } = await params;
  const prop = decodeURIComponent(propNumber).trim();
  if (!prop) return new NextResponse("missing property number", { status: 400 });

  const count = db
    .prepare<[string], { n: number }>(
      `SELECT COUNT(*) AS n FROM cutsheets
       WHERE deleted_at IS NULL AND TRIM(json_extract(data, '$.header.propNumber')) = ?`,
    )
    .get(prop);
  if (!count || count.n === 0) {
    return new NextResponse("no active cutsheets for this property number", { status: 404 });
  }

  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? new URL(req.url).protocol.replace(":", "");
  const printUrl = `${proto}://${host}/print/pick/${encodeURIComponent(prop)}`;

  const pdf = await renderPdfFromUrl(printUrl, {
    format: "Letter",
    extraHeaders: { "x-ariya-render": process.env.ARIYA_API_TOKEN ?? "" },
  });
  return new NextResponse(new Uint8Array(pdf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="house-${encodeURIComponent(prop)}-pick-tickets.pdf"`,
      "Cache-Control": "no-store, must-revalidate",
    },
  });
}
