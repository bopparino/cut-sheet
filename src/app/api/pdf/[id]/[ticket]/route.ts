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
  { params }: { params: Promise<{ id: string; ticket: string }> },
) {
  const me = await requireApiUser();
  if (me instanceof Response) return me;

  const { id, ticket } = await params;
  const numeric = Number(id);
  if (!Number.isInteger(numeric)) return new NextResponse("bad id", { status: 400 });
  if (!VALID_TICKETS.has(ticket)) return new NextResponse("bad ticket", { status: 400 });

  // Verify the cutsheet exists before launching Puppeteer - otherwise the
  // print route renders a Next.js 404 page and Puppeteer happily prints it,
  // so the user downloads a "page not found" PDF.
  const exists = db
    .prepare<[number], { id: number }>(
      "SELECT id FROM cutsheets WHERE id = ? AND deleted_at IS NULL",
    )
    .get(numeric);
  if (!exists) return new NextResponse("cutsheet not found", { status: 404 });

  // Build the absolute URL for the print page using the incoming request's
  // host headers. Puppeteer runs in the same process, so this is a loopback
  // call back into Next.js - same auth context, same DB connection.
  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  // A TLS-terminating proxy sets x-forwarded-proto; without one, the actual
  // request scheme is the right answer (LAN IPs and 127.0.0.1 are plain http).
  const proto = h.get("x-forwarded-proto") ?? new URL(req.url).protocol.replace(":", "");
  const printUrl = `${proto}://${host}/print/${id}/${ticket}`;

  const pdf = await renderPdfFromUrl(printUrl);
  return new NextResponse(new Uint8Array(pdf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="cutsheet-${id}-${ticket}.pdf"`,
    },
  });
}
