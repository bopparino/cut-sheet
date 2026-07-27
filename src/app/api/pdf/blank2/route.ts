import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { renderPdfFromUrl } from "@/lib/pdf";
import { requireApiUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Renders /print/blank2 (the updated two-page pad revision) on Legal
// (8.5" × 14" portrait). Mirrors /api/pdf/blank exactly - same paper, same tight
// margins - so the new revision drops in alongside the old master without any
// printer-side changes. Output is a true vector PDF (Chromium renders the HTML
// print page), so it stays crisp at any scale instead of pixelating like an
// embedded image would.
export async function GET(req: Request) {
  const me = await requireApiUser();
  if (me instanceof Response) return me;

  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  // A TLS-terminating proxy sets x-forwarded-proto; without one, the actual
  // request scheme is the right answer (LAN IPs and 127.0.0.1 are plain http).
  const proto =
    h.get("x-forwarded-proto") ?? new URL(req.url).protocol.replace(":", "");
  const printUrl = `${proto}://${host}/print/blank2`;

  // preferCSSPageSize lets the print page's @page rule lock the size,
  // so identical output whether printed via this endpoint or Cmd-P from
  // the browser. Format is a fallback if the page doesn't declare @page.
  const pdf = await renderPdfFromUrl(printUrl, {
    format: "Legal",
    preferCSSPageSize: true,
    // Must match the @page CSS margin — Chromium builds disagree on which
    // wins when the pdf() option and CSS differ (prod clipped page tops).
    margin: { top: "0.25in", right: "0.25in", bottom: "0.25in", left: "0.25in" },
  });
  return new NextResponse(new Uint8Array(pdf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'inline; filename="cutsheet-blank2-template.pdf"',
      // The master is regenerated from the print page on every hit, so never
      // let a browser serve a stale copy - otherwise a revised pad keeps
      // showing the old layout until a hard refresh.
      "Cache-Control": "no-store, must-revalidate",
    },
  });
}
