import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { renderPdfFromUrl } from "@/lib/pdf";
import { requireApiUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Digitally-filled cut sheet → 8.5x14 Legal PDF. Renders /print/filled/[id]
// (the new cut-sheet design populated with this cutsheet's values) the same
// way /api/pdf/blank2 renders the blank master, so the filled copy prints
// identically - just with the numbers in. Vector output, not an image.
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const me = await requireApiUser();
  if (me instanceof Response) return me;

  const { id } = await params;
  const numeric = Number(id);
  if (!Number.isInteger(numeric)) {
    return new NextResponse("Invalid id", { status: 400 });
  }
  const exists = db
    .prepare<[number], { id: number }>(
      "SELECT id FROM cutsheets WHERE id = ? AND deleted_at IS NULL",
    )
    .get(numeric);
  if (!exists) return new NextResponse("Not found", { status: 404 });

  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? new URL(req.url).protocol.replace(":", "");
  const printUrl = `${proto}://${host}/print/filled/${numeric}`;

  const pdf = await renderPdfFromUrl(printUrl, {
    format: "Legal",
    preferCSSPageSize: true,
    margin: { top: "0.25in", right: "0.25in", bottom: "0.25in", left: "0.25in" },
  });
  return new NextResponse(new Uint8Array(pdf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="cutsheet-${numeric}-filled.pdf"`,
      "Cache-Control": "no-store, must-revalidate",
    },
  });
}
