import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { renderPdfFromUrl } from "@/lib/pdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Renders /print/blank at 8.5" × 14" (Legal) for the print-shop pad master.
// Tighter margins than the per-cutsheet PDFs since pads usually trim closer
// to the edge; the print company can bleed-trim from there.
export async function GET() {
  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  const proto =
    h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const printUrl = `${proto}://${host}/print/blank`;

  const pdf = await renderPdfFromUrl(printUrl, {
    format: "Legal",
    margin: { top: "0.25in", right: "0.25in", bottom: "0.25in", left: "0.25in" },
  });
  return new NextResponse(new Uint8Array(pdf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'inline; filename="cutsheet-blank-template.pdf"',
    },
  });
}
