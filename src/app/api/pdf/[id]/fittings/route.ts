import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { renderPdfFromUrl } from "@/lib/pdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Fitting drawings → Legal (8.5×14) PDF. Renders /print/fittings/[id] (the
// tiled contact sheet) the same way the other ticket PDFs are produced. Static
// `fittings` segment wins over the sibling /api/pdf/[id]/[ticket] dynamic route.
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const numeric = Number(id);
  if (!Number.isInteger(numeric)) return new NextResponse("bad id", { status: 400 });

  const exists = db
    .prepare<[number], { id: number }>(
      "SELECT id FROM cutsheets WHERE id = ? AND deleted_at IS NULL",
    )
    .get(numeric);
  if (!exists) return new NextResponse("cutsheet not found", { status: 404 });

  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? new URL(req.url).protocol.replace(":", "");
  const printUrl = `${proto}://${host}/print/fittings/${numeric}`;

  const pdf = await renderPdfFromUrl(printUrl, {
    format: "Legal",
    preferCSSPageSize: true,
    margin: { top: "0.25in", right: "0.25in", bottom: "0.25in", left: "0.25in" },
  });
  return new NextResponse(new Uint8Array(pdf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="cutsheet-${numeric}-fittings.pdf"`,
      "Cache-Control": "no-store, must-revalidate",
    },
  });
}
