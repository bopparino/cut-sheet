import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { renderPdfFromUrl } from "@/lib/pdf";
import { requireApiUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Whole-house pick ticket PDF: the three consolidated tickets (stock, custom,
// truck) summed across every cutsheet sharing this property number. Renders
// /print/pick/[propNumber] on Letter, the same paper the per-sheet pick
// tickets use.
export async function GET(req: Request, { params }: { params: Promise<{ propNumber: string }> }) {
  const me = await requireApiUser();
  if (me instanceof Response) return me;

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
    return new NextResponse("no cutsheets found for this property number", { status: 404 });
  }

  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? new URL(req.url).protocol.replace(":", "");
  // ?zone=N narrows the tickets to one zone's sheets (see the print page).
  const zone = (new URL(req.url).searchParams.get("zone") ?? "").trim();
  const printUrl = `${proto}://${host}/print/pick/${encodeURIComponent(prop)}${
    zone ? `?zone=${encodeURIComponent(zone)}` : ""
  }`;

  const pdf = await renderPdfFromUrl(printUrl, { format: "Letter" });
  const download = new URL(req.url).searchParams.get("download") === "1";
  return new NextResponse(new Uint8Array(pdf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="house-${encodeURIComponent(prop)}-pick-tickets.pdf"`,
      "Cache-Control": "no-store, must-revalidate",
    },
  });
}
