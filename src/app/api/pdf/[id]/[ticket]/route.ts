import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { renderPdfFromUrl } from "@/lib/pdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_TICKETS = new Set(["stock", "custom", "truck"]);

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string; ticket: string }> },
) {
  const { id, ticket } = await params;
  if (!Number.isInteger(Number(id))) return new NextResponse("bad id", { status: 400 });
  if (!VALID_TICKETS.has(ticket)) return new NextResponse("bad ticket", { status: 400 });

  // Build the absolute URL for the print page using the incoming request's
  // host headers. Puppeteer runs in the same process, so this is a loopback
  // call back into Next.js — same auth context, same DB connection.
  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
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
