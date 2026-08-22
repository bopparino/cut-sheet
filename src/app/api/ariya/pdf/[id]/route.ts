import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { renderPdfFromUrl } from "@/lib/pdf";
import { ariyaAuthError } from "@/lib/ariya";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// The filled cut sheet as a PDF, for Ariya's in-chat citations. Output only:
// this is the same vector Legal render the app's print button makes, and the
// viewer never touches the editor. Archived sheets render too — most of what
// Ariya cites is history. Auth is the Ariya bearer token; the loopback print
// fetch carries the render-pass header instead of a session cookie.
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = ariyaAuthError(req);
  if (denied) return denied;

  const { id } = await params;
  const numeric = Number(id);
  if (!Number.isInteger(numeric)) return new NextResponse("Invalid id", { status: 400 });

  const exists = db
    .prepare<[number], { id: number }>("SELECT id FROM cutsheets WHERE id = ?")
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
    extraHeaders: { "x-ariya-render": process.env.ARIYA_API_TOKEN ?? "" },
  });
  return new NextResponse(new Uint8Array(pdf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="cutsheet-${numeric}.pdf"`,
      "Cache-Control": "no-store, must-revalidate",
    },
  });
}
