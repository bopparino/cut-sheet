import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { renderPdfFromUrl } from "@/lib/pdf";
import { requireApiUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_TICKETS = new Set(["stock", "custom", "truck"]);

export async function GET(
  req: Request,
  {
    params,
  }: {
    params: Promise<{ propNumber: string; lot: string; ticket: string }>;
  },
) {
  const me = await requireApiUser();
  if (me instanceof Response) return me;

  const { propNumber, lot, ticket } = await params;
  if (!propNumber || !lot) return new NextResponse("missing identifiers", { status: 400 });
  if (!VALID_TICKETS.has(ticket)) return new NextResponse("bad ticket", { status: 400 });

  // Confirm at least one cutsheet exists for the house before launching
  // Puppeteer; otherwise the print page would render its own 404 and Chromium
  // would print that as a PDF.
  const count = db
    .prepare<[string, string], { n: number }>(
      `SELECT COUNT(*) AS n FROM cutsheets
       WHERE deleted_at IS NULL
         AND json_extract(data, '$.header.propNumber') = ?
         AND json_extract(data, '$.header.lot') = ?`,
    )
    .get(propNumber, lot);

  if (!count || count.n === 0) {
    return new NextResponse("no cutsheets found for this house", { status: 404 });
  }

  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  // A TLS-terminating proxy sets x-forwarded-proto; without one, the actual
  // request scheme is the right answer (LAN IPs and 127.0.0.1 are plain http).
  const proto = h.get("x-forwarded-proto") ?? new URL(req.url).protocol.replace(":", "");
  const printUrl = `${proto}://${host}/print/house/${encodeURIComponent(propNumber)}/${encodeURIComponent(lot)}/${ticket}`;

  const pdf = await renderPdfFromUrl(printUrl);
  return new NextResponse(new Uint8Array(pdf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="house-${encodeURIComponent(propNumber)}-${encodeURIComponent(lot)}-${ticket}.pdf"`,
    },
  });
}
