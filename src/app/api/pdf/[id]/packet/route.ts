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
//   ?kind=shop    (default) - Cut Sheet x2 -> Pick Tickets -> Fittings x2
//   ?kind=foreman           - Cut Sheet -> Trim Pull -> Fittings -> Plans
// The shop copies print back-to-back per document (sheet, sheet, ..., fittings,
// fittings) so the stack splits into handout copies in one pass at the printer;
// each doc renders once and the PDF pages embed twice. HTML docs render via
// Puppeteer (reused browser); uploaded plan PDFs are embedded with pdf-lib.
// Letter tickets center on Legal; landscape plan pages go on landscape Legal,
// scaled to fit.
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const me = await getCurrentUser();
  if (!me) return new NextResponse("unauthorized", { status: 401 });

  const { id } = await params;
  const numeric = Number(id);
  if (!Number.isInteger(numeric)) return new NextResponse("bad id", { status: 400 });

  const kind = new URL(req.url).searchParams.get("kind") === "foreman" ? "foreman" : "shop";

  const exists = db
    .prepare<[number], { id: number; prop: string | null }>(
      "SELECT id, TRIM(json_extract(data, '$.header.propNumber')) AS prop FROM cutsheets WHERE id = ? AND deleted_at IS NULL",
    )
    .get(numeric);
  if (!exists) return new NextResponse("cutsheet not found", { status: 404 });

  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? new URL(req.url).protocol.replace(":", "");
  const base = `${proto}://${host}`;

  // Pick ticket + trim = the WHOLE house: consolidated across every cutsheet
  // sharing this property number (all zones + options). Keyed by property
  // number, so a sheet with no property number falls back to its own per-sheet
  // document - the one thing we can build without a house key.
  const pickUrl = exists.prop
    ? `${base}/print/pick/${encodeURIComponent(exists.prop)}`
    : `${base}/print/tickets/${numeric}`;
  const trimUrl = exists.prop
    ? `${base}/print/trimpull/${encodeURIComponent(exists.prop)}`
    : `${base}/print/trim/${numeric}`;

  // Render the packet's HTML docs (merge order = array order).
  const docUrls =
    kind === "foreman"
      ? [
          { url: `${base}/print/filled/${numeric}`, opts: LEGAL },
          { url: trimUrl, opts: LEGAL },
          { url: `${base}/print/fittings/${numeric}`, opts: LEGAL },
        ]
      : [
          { url: `${base}/print/filled/${numeric}`, opts: LEGAL, copies: 2 },
          { url: pickUrl, opts: { format: "Letter" as const } },
          { url: `${base}/print/fittings/${numeric}`, opts: LEGAL, copies: 2 },
        ];
  const docs = await Promise.all(docUrls.map((d) => renderPdfFromUrl(d.url, d.opts)));

  const out = await PDFDocument.create();
  const addOnLegal = async (source: Uint8Array | Buffer) => {
    // ignoreEncryption lets us embed permissions-encrypted (but readable) plan
    // PDFs - a common architectural export. Pass the loaded document (not the
    // raw bytes) to embedPdf so it copies pages from `src` instead of re-
    // loading the bytes without the flag and throwing EncryptedPDFError.
    const src = await PDFDocument.load(source, { ignoreEncryption: true });
    const pages = await out.embedPdf(src, src.getPageIndices());
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

  for (const [i, buf] of docs.entries()) {
    const copies = "copies" in docUrls[i] ? (docUrls[i].copies ?? 1) : 1;
    for (let c = 0; c < copies; c++) await addOnLegal(buf);
  }

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
        // The embed itself is the operation that can throw on a truly
        // unreadable plan, so it must be INSIDE the try - otherwise one bad
        // plan 500s the entire foreman packet instead of being skipped.
        await addOnLegal(plan.blob);
      } catch {
        console.warn(`packet ${numeric}: could not embed plan "${plan.filename}"`);
      }
    }
  }

  const bytes = await out.save();

  // Audit: record who printed which packet (shows as "Last sent by" on the sheet).
  // `me` is the authed user from the gate at the top of the handler.
  db.prepare("INSERT INTO print_events (cutsheet_id, user_id, kind) VALUES (?, ?, ?)").run(
    numeric,
    me.id,
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
