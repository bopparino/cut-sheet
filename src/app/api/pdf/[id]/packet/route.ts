import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { PDFDocument } from "pdf-lib";
import { db } from "@/lib/db";
import { renderPdfFromUrl } from "@/lib/pdf";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LEGAL = { format: "Legal" as const, preferCSSPageSize: true };
const TAB = 72 * 11; // 11in in PDF points (short side of Tabloid)
const TAB_LONG = 72 * 17; // 17in

// The one-click shop packet: every printable document for a cutsheet merged
// into ONE PDF, each at its own paper size —
//   Cut Sheet (8.5×14) → Tickets (8.5×11) → Fittings (8.5×14) → Plans (11×17).
// The HTML docs are rendered by Puppeteer (reused browser) and the uploaded
// plan PDFs are embedded with pdf-lib, normalized to Tabloid. Printing this one
// file lets the shop driver auto-select trays by page size, like the old app.
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
  const base = `${proto}://${host}`;

  // Render the HTML docs at their native sizes (order set below at merge time).
  const [cutSheet, tickets, fittings] = await Promise.all([
    renderPdfFromUrl(`${base}/print/filled/${numeric}`, LEGAL),
    renderPdfFromUrl(`${base}/print/tickets/${numeric}`, { format: "Letter" }),
    renderPdfFromUrl(`${base}/print/fittings/${numeric}`, LEGAL),
  ]);

  const plans = db
    .prepare<[number], { blob: Buffer; filename: string }>(
      `SELECT blob, filename FROM attachments WHERE cutsheet_id = ? AND kind = 'plan'
       ORDER BY created_at ASC, id ASC`,
    )
    .all(numeric);

  const out = await PDFDocument.create();

  // HTML-rendered docs keep their own page sizes.
  for (const buf of [cutSheet, tickets, fittings]) {
    const src = await PDFDocument.load(buf);
    const copied = await out.copyPages(src, src.getPageIndices());
    copied.forEach((p) => out.addPage(p));
  }

  // Plans: normalize every page onto an 11×17 sheet, scaled to fit and
  // auto-oriented (landscape source → landscape Tabloid) so it fills the page.
  for (const plan of plans) {
    let planDoc: PDFDocument;
    try {
      planDoc = await PDFDocument.load(plan.blob, { ignoreEncryption: true });
    } catch {
      // Unreadable/encrypted plan: skip it rather than break the whole packet.
      console.warn(`packet ${numeric}: could not embed plan "${plan.filename}"`);
      continue;
    }
    const indices = planDoc.getPageIndices();
    const embedded = await out.embedPdf(plan.blob, indices);
    for (const ep of embedded) {
      const landscape = ep.width > ep.height;
      const pageW = landscape ? TAB_LONG : TAB;
      const pageH = landscape ? TAB : TAB_LONG;
      const page = out.addPage([pageW, pageH]);
      const scale = Math.min(pageW / ep.width, pageH / ep.height);
      const w = ep.width * scale;
      const hgt = ep.height * scale;
      page.drawPage(ep, { x: (pageW - w) / 2, y: (pageH - hgt) / 2, width: w, height: hgt });
    }
  }

  // ?paper=legal: flatten the whole packet onto 8.5x14 (matching orientation,
  // scaled to fit, centered). Browser print dialogs can't switch trays per
  // page - they force one paper size for the whole document - so this is the
  // variant the in-app Print button uses. The multi-size default stays for
  // print paths that CAN tray-switch (Acrobat's "choose paper source by PDF
  // page size", or a print-server queue configured the same way).
  const wantsLegal = new URL(req.url).searchParams.get("paper") === "legal";
  let final = out;
  if (wantsLegal) {
    const LGL = 72 * 8.5;
    const LGL_LONG = 72 * 14;
    const multi = await out.save();
    const norm = await PDFDocument.create();
    const pages = await norm.embedPdf(multi, out.getPageIndices());
    for (const ep of pages) {
      const landscape = ep.width > ep.height;
      const pageW = landscape ? LGL_LONG : LGL;
      const pageH = landscape ? LGL : LGL_LONG;
      const page = norm.addPage([pageW, pageH]);
      const scale = Math.min(pageW / ep.width, pageH / ep.height);
      const w = ep.width * scale;
      const hgt = ep.height * scale;
      page.drawPage(ep, { x: (pageW - w) / 2, y: (pageH - hgt) / 2, width: w, height: hgt });
    }
    final = norm;
  }

  const bytes = await final.save();

  // Audit: record who generated the shop packet (Send to Shop / Print Here).
  const me = await getCurrentUser();
  db.prepare("INSERT INTO print_events (cutsheet_id, user_id, kind) VALUES (?, ?, 'send_to_shop')").run(
    numeric,
    me?.id ?? null,
  );

  const download = new URL(req.url).searchParams.get("download") === "1";
  return new NextResponse(new Uint8Array(bytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="cutsheet-${numeric}-packet.pdf"`,
      "Cache-Control": "no-store, must-revalidate",
    },
  });
}
