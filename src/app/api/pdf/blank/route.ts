import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { renderPdfFromUrl } from "@/lib/pdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Renders /print/blank at 11" × 17" (Tabloid portrait) for the print-shop
// pad master. The shop's printer has 11x17 loaded so we use all of it for
// readability instead of cramming on Legal. Tight margins so the design
// gets close to the trim edge.
export async function GET(req: Request) {
  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  // A TLS-terminating proxy sets x-forwarded-proto; without one, the actual
  // request scheme is the right answer (LAN IPs and 127.0.0.1 are plain http).
  const proto =
    h.get("x-forwarded-proto") ?? new URL(req.url).protocol.replace(":", "");
  const printUrl = `${proto}://${host}/print/blank`;

  // preferCSSPageSize lets the print page's @page rule lock the size,
  // so identical output whether printed via this endpoint or Cmd-P from
  // the browser. Format is a fallback if the page doesn't declare @page.
  const pdf = await renderPdfFromUrl(printUrl, {
    format: "Legal",
    preferCSSPageSize: true,
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
