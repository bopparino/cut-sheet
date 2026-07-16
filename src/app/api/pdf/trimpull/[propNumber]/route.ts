import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { renderPdfFromUrl } from "@/lib/pdf";
import { requireApiUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LEGAL = {
  format: "Legal" as const,
  preferCSSPageSize: true,
  margin: { top: "0.25in", right: "0.25in", bottom: "0.25in", left: "0.25in" },
};

// Whole-house trim pull sheet PDF: the four trim sections summed across every
// cutsheet sharing this property number, zone columns kept. Renders
// /print/trimpull/[propNumber] on Legal, like the per-sheet trim sheet.
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
  const printUrl = `${proto}://${host}/print/trimpull/${encodeURIComponent(prop)}`;

  const pdf = await renderPdfFromUrl(printUrl, LEGAL);
  const download = new URL(req.url).searchParams.get("download") === "1";
  return new NextResponse(new Uint8Array(pdf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="house-${encodeURIComponent(prop)}-trim-pull.pdf"`,
      "Cache-Control": "no-store, must-revalidate",
    },
  });
}
