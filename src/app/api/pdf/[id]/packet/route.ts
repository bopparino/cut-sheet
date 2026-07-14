import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { PDFDocument } from "pdf-lib";
import { db } from "@/lib/db";
import { renderPdfFromUrl } from "@/lib/pdf";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Margin MUST equal the @page margin in LEGAL_PAGE_CSS (0.25in): when the
// pdf() margin option and the CSS margin disagree, which one wins depends on
// the Chromium build — prod's system Chromium shifted every page up ~0.15in
// (0.4in default − 0.25in CSS) and clipped the top of the cut sheets.
const LEGAL = {
  format: "Legal" as const,
  preferCSSPageSize: true,
  margin: { top: "0.25in", right: "0.25in", bottom: "0.25in", left: "0.25in" },
};
const LGL = 72 * 8.5;
const LGL_LONG = 72 * 14;

// The one-click packets, one PDF each, EVERY page normalized to Legal
// (8.5x14) - the office standardized on Legal so any printer/browser prints
// the whole thing correctly with no tray games:
//   ?kind=shop    (default) - Cut Sheet -> Pick Tickets -> Fittings
//   ?kind=foreman           - Cut Sheet -> Trim Pull -> Fittings -> Plans
// HTML docs render via Puppeteer (reused browser); uploaded plan PDFs are
// embedded with pdf-lib. Letter tickets center on Legal; landscape plan pages
// go on landscape Legal, scaled to fit.
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const numeric = Number(id);
  if (!Number.isInteger(numeric)) return new NextResponse("bad id", { status: 400 });

  const kind = new URL(req.url).searchParams.get("kind") === "foreman" ? "foreman" : "shop";

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

  // Render the packet's HTML docs (merge order = array order).
  const docUrls =
    kind === "foreman"
      ? [
          { url: `${base}/print/filled/${numeric}`, opts: LEGAL },
          { url: `${base}/print/trim/${numeric}`, opts: LEGAL },
          { url: `${base}/print/fittings/${numeric}`, opts: LEGAL },
        ]
      : [
          { url: `${base}/print/filled/${numeric}`, opts: LEGAL },
          { url: `${base}/print/tickets/${numeric}`, opts: { format: "Letter" as const } },
          { url: `${base}/print/fittings/${numeric}`, opts: LEGAL },
        ];
  const docs = await Promise.all(docUrls.map((d) => renderPdfFromUrl(d.url, d.opts)));

  const out = await PDFDocument.create();
  const addOnLegal = async (source: Uint8Array | Buffer) => {
    const src = await PDFDocument.load(source);
    const pages = await out.embedPdf(source, src.getPageIndices());
    for (const ep of pages) {
      const landscape = ep.width > ep.height;
      const pageW = landscape ? LGL_LONG : LGL;
      const pageH = landscape ? LGL : LGL_LONG;
      const page = out.addPage([pageW, pageH]);
      const scale = Math.min(pageW / ep.width, pageH / ep.height, 1);
      const w = ep.width * scale;
      const hgt = ep.height * scale;
      page.drawPage(ep, { x: (pageW - w) / 2, y: (pageH - hgt) / 2, width: w, height: hgt });
    }
  };

  for (const buf of docs) await addOnLegal(buf);

  // Plans ride only in the foreman packet, scaled from 11x17 onto Legal.
  if (kind === "foreman") {
    const plans = db
      .prepare<[number], { blob: Buffer; filename: string }>(
        `SELECT blob, filename FROM attachments WHERE cutsheet_id = ? AND kind = 'plan'
         ORDER BY created_at ASC, id ASC`,
      )
      .all(numeric);
    for (const plan of plans) {
      try {
        await PDFDocument.load(plan.blob, { ignoreEncryption: true });
      } catch {
        // Unreadable/encrypted plan: skip it rather than break the whole packet.
        console.warn(`packet ${numeric}: could not embed plan "${plan.filename}"`);
        continue;
      }
      await addOnLegal(plan.blob);
    }
  }

  const bytes = await out.save();

  // Audit: record who printed which packet (shows as "Last sent by" on the sheet).
  const me = await getCurrentUser();
  db.prepare("INSERT INTO print_events (cutsheet_id, user_id, kind) VALUES (?, ?, ?)").run(
    numeric,
    me?.id ?? null,
    kind === "foreman" ? "foreman_packet" : "shop_packet",
  );

  const download = new URL(req.url).searchParams.get("download") === "1";
  return new NextResponse(new Uint8Array(bytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="cutsheet-${numeric}-${kind}-packet.pdf"`,
      "Cache-Control": "no-store, must-revalidate",
    },
  });
}
