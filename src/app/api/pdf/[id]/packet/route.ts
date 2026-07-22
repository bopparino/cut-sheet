import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { PDFDocument } from "pdf-lib";
import { db } from "@/lib/db";
import { houseSheets } from "@/lib/house";
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
// the whole thing correctly with no tray games.
//
// A packet covers the WHOLE HOUSE: every cutsheet sharing the property number
// (all zones + option sheets), grouped by zone — each sheet's Cut Sheets then
// its fittings pages, zone after zone, single copy of everything — and, on the
// shop packet, the three consolidated pick tickets at the end:
//   ?kind=shop    (default) - [Cut Sheets -> Fittings] per zone -> Pick Tickets
//   ?kind=foreman           - [Cut Sheets -> Fittings] per zone -> Plans
//   ?zone=N                 - only that zone's sheets, with pick tickets
//                             consolidated over just that zone (the
//                             couldn't-get-permits case: build one zone now).
// houseSheets() vets the set — imported library sheets reuse property numbers
// across placeholders, and summing those prints garbage — so a sheet whose
// property number doesn't name one real house falls back to its own per-sheet
// documents, the exact packet the shop got before consolidation existed.
// HTML docs render via Puppeteer (reused browser); uploaded plan PDFs are
// embedded with pdf-lib. Letter tickets center on Legal; landscape plan pages
// go on landscape Legal, scaled to fit.
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const me = await getCurrentUser();
  if (!me) return new NextResponse("unauthorized", { status: 401 });

  const { id } = await params;
  const numeric = Number(id);
  if (!Number.isInteger(numeric)) return new NextResponse("bad id", { status: 400 });

  const query = new URL(req.url).searchParams;
  const kind = query.get("kind") === "foreman" ? "foreman" : "shop";
  const zone = (query.get("zone") ?? "").trim();

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

  // The vetted whole-house set, in zone order. With ?zone= it narrows to that
  // zone's sheets (a zone can span several sheets: base + option sheets). If
  // the property number doesn't name one real house — or the zone filter
  // matches nothing — fall back to just the clicked sheet with its own
  // per-sheet tickets.
  const houseAll = exists.prop ? houseSheets(exists.prop) : null;
  const house = zone && houseAll
    ? houseAll.filter((s) => (s.data.header.zone ?? "").trim() === zone)
    : houseAll;
  const consolidated = !!house && house.length > 0;
  const sheetIds = consolidated ? house!.map((s) => s.id) : [numeric];

  const pickUrl = consolidated
    ? `${base}/print/pick/${encodeURIComponent(exists.prop!)}${zone ? `?zone=${encodeURIComponent(zone)}` : ""}`
    : `${base}/print/tickets/${numeric}`;

  // A sheet with no picked fittings and no legacy drawing images would print a
  // "No fittings" placeholder page — fine on a single sheet, noise when an
  // 8-zone house prints. Skip the fittings doc for those sheets.
  const hasFittings = (sid: number): boolean => {
    const fit = db
      .prepare<[number], { n: number }>(
        "SELECT COALESCE(json_array_length(data, '$.fittings'), 0) AS n FROM cutsheets WHERE id = ?",
      )
      .get(sid);
    if ((fit?.n ?? 0) > 0) return true;
    const img = db
      .prepare<[number], { n: number }>(
        "SELECT COUNT(*) AS n FROM attachments WHERE cutsheet_id = ? AND kind = 'image'",
      )
      .get(sid);
    return (img?.n ?? 0) > 0;
  };

  // Render order = merge order: each sheet's Cut Sheets then its fittings,
  // zone by zone; the shop packet closes with the consolidated pick tickets.
  const docUrls: Array<{ url: string; opts: Parameters<typeof renderPdfFromUrl>[1] }> = [];
  for (const sid of sheetIds) {
    docUrls.push({ url: `${base}/print/filled/${sid}`, opts: LEGAL });
    if (hasFittings(sid)) docUrls.push({ url: `${base}/print/fittings/${sid}`, opts: LEGAL });
  }
  if (kind === "shop") docUrls.push({ url: pickUrl, opts: { format: "Letter" as const } });

  // Bounded concurrency: an 8-zone house is ~17 documents, and rendering them
  // all at once would stack that many Chromium pages on the small prod box.
  const docs: Buffer[] = new Array(docUrls.length);
  const POOL = 4;
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(POOL, docUrls.length) }, async () => {
      while (next < docUrls.length) {
        const i = next++;
        docs[i] = await renderPdfFromUrl(docUrls[i].url, docUrls[i].opts);
      }
    }),
  );

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

  for (const buf of docs) await addOnLegal(buf);

  // Plans ride only in the foreman packet, scaled from 11x17 onto Legal —
  // gathered from every sheet in the packet, in the same zone order.
  if (kind === "foreman") {
    for (const sid of sheetIds) {
      const plans = db
        .prepare<[number], { blob: Buffer; filename: string }>(
          `SELECT blob, filename FROM attachments WHERE cutsheet_id = ? AND kind = 'plan'
           ORDER BY created_at ASC, id ASC`,
        )
        .all(sid);
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
  }

  const bytes = await out.save();

  // Audit: record who printed which packet (shows as "Last sent by" on the sheet).
  // `me` is the authed user from the gate at the top of the handler.
  db.prepare("INSERT INTO print_events (cutsheet_id, user_id, kind) VALUES (?, ?, ?)").run(
    numeric,
    me.id,
    kind === "foreman" ? "foreman_packet" : "shop_packet",
  );

  const download = query.get("download") === "1";
  const zoneTag = zone ? `-zone-${zone.replace(/[^\w.-]+/g, "_")}` : "";
  return new NextResponse(new Uint8Array(bytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="cutsheet-${numeric}-${kind}${zoneTag}-packet.pdf"`,
      "Cache-Control": "no-store, must-revalidate",
    },
  });
}
