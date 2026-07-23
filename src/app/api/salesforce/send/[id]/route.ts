import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { verifyPassword } from "@/lib/password";
import { requireSfPushPassword } from "@/lib/settings";
import {
  SalesforceError,
  findLotByProp,
  salesforceConfig,
  uploadPdfToRecord,
} from "@/lib/salesforce";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/salesforce/send/[id] — push this sheet's WHOLE-HOUSE packets
// (shop + foreman, the exact PDFs the print buttons produce) onto the
// matching Salesforce Lot record as two Files. Re-sends version the same two
// Files rather than piling up new ones.
//
// Dormant until Salesforce env vars are set (503, and the UI button that
// calls this doesn't render). See src/lib/salesforce.ts and SALESFORCE.md.
//
// The packets are fetched from our own packet endpoint with the caller's
// cookie — the same internal-loopback-with-forwarded-auth pattern the
// Puppeteer renderer uses — so this route can never drift from what the
// print buttons produce, and the print_events "Last sent by" attribution
// updates for free.

// Legacy import placeholder prop numbers name no real house (and certainly
// no Salesforce lot) — refuse before doing any work.
const PLACEHOLDER_PROPS = new Set(["999999999", "0"]);

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const cfg = salesforceConfig();
  if (!cfg) {
    return NextResponse.json(
      { error: "Salesforce sending is not configured on this server." },
      { status: 503 },
    );
  }

  // Staged-rollout gate (admin panel → Salesforce → "Require SF Push
  // Password"): while ON, the caller must confirm an ADMIN account's password
  // with every push. Enforced HERE, server-side — hiding the prompt in the UI
  // would not protect anything. The check runs before any Salesforce work.
  if (requireSfPushPassword()) {
    const body = (await req.json().catch(() => ({}))) as { password?: string };
    const password = typeof body.password === "string" ? body.password : "";
    if (!password) {
      return NextResponse.json(
        { error: "Sending to Salesforce requires the push password.", passwordRequired: true },
        { status: 403 },
      );
    }
    const admins = db
      .prepare<[], { password_hash: string }>("SELECT password_hash FROM users WHERE role = 'admin'")
      .all();
    const ok = admins.some((a) => verifyPassword(password, a.password_hash));
    if (!ok) {
      // Flat delay keeps casual guessing slow without a rate-limit table.
      await new Promise((r) => setTimeout(r, 750));
      return NextResponse.json(
        { error: "Incorrect push password.", passwordRequired: true },
        { status: 403 },
      );
    }
  }

  const { id } = await params;
  const numeric = Number(id);
  if (!Number.isInteger(numeric)) return NextResponse.json({ error: "bad id" }, { status: 400 });

  const sheet = db
    .prepare<[number], { id: number; prop: string | null; builder: string | null; projectCode: string | null }>(
      `SELECT id,
              TRIM(json_extract(data, '$.header.propNumber')) AS prop,
              TRIM(json_extract(data, '$.header.builder')) AS builder,
              TRIM(json_extract(data, '$.header.projectCode')) AS projectCode
       FROM cutsheets WHERE id = ? AND deleted_at IS NULL`,
    )
    .get(numeric);
  if (!sheet) return NextResponse.json({ error: "cutsheet not found" }, { status: 404 });

  const prop = (sheet.prop ?? "").trim();
  if (!prop) {
    return NextResponse.json(
      { error: "This sheet has no Prop #, so there is no Salesforce lot to send it to." },
      { status: 400 },
    );
  }
  if (PLACEHOLDER_PROPS.has(prop)) {
    return NextResponse.json(
      { error: `Prop # ${prop} is a legacy placeholder — it doesn't name a real lot.` },
      { status: 400 },
    );
  }

  try {
    // 1. Find the lot. Loud failure beats guessing.
    const lookup = await findLotByProp(cfg, prop);
    if (lookup.status === "none") {
      return NextResponse.json(
        { error: `No Salesforce lot found with Prop # ${prop}.` },
        { status: 404 },
      );
    }
    if (lookup.status === "multiple") {
      return NextResponse.json(
        { error: `Salesforce has ${lookup.count} lots with Prop # ${prop} — refusing to guess. Fix the duplicates in Salesforce first.` },
        { status: 409 },
      );
    }
    const lot = lookup.lot;

    // Warn-only sanity checks: the lot mirrors builder + project code, but
    // formatting drifts ("D.R. Horton" vs "D. R. Horton - Capital Division"),
    // so mismatches inform the user rather than block the send.
    const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "");
    const warnings: string[] = [];
    if (sheet.builder && lot.builder && !norm(lot.builder).includes(norm(sheet.builder)) && !norm(sheet.builder).includes(norm(lot.builder))) {
      warnings.push(`Builder differs: sheet says "${sheet.builder}", Salesforce lot says "${lot.builder}".`);
    }
    if (sheet.projectCode && lot.projectCode && norm(sheet.projectCode) !== norm(lot.projectCode)) {
      warnings.push(`Project code differs: sheet says "${sheet.projectCode}", Salesforce lot says "${lot.projectCode}".`);
    }

    // 2. Build both packets via our own endpoint with the caller's cookie.
    const h = await headers();
    const host = h.get("host") ?? "localhost:3000";
    const proto = h.get("x-forwarded-proto") ?? new URL(req.url).protocol.replace(":", "");
    const base = `${proto}://${host}`;
    const cookie = h.get("cookie") ?? "";

    const fetchPacket = async (kind: "shop" | "foreman"): Promise<Buffer> => {
      const res = await fetch(`${base}/api/pdf/${numeric}/packet?kind=${kind}`, {
        headers: { cookie },
        signal: AbortSignal.timeout(180_000),
      });
      if (!res.ok) throw new SalesforceError(`Building the ${kind} packet failed (${res.status}).`);
      return Buffer.from(await res.arrayBuffer());
    };
    // Sequential on purpose: each packet render already fans out to a
    // Chromium page pool; two packets at once doubles the load on the small
    // prod box for little wall-clock gain.
    const shopPdf = await fetchPacket("shop");
    const foremanPdf = await fetchPacket("foreman");

    // 3. Upload both. Titles are keyed by prop, so any sheet of the house
    // re-sending versions the same two Files on the lot.
    const files = [
      { kind: "shop_packet" as const, title: `Shop Packet — Prop ${prop}`, filename: `prop-${prop}-shop-packet.pdf`, pdf: shopPdf },
      { kind: "foreman_packet" as const, title: `Foreman Packet — Prop ${prop}`, filename: `prop-${prop}-foreman-packet.pdf`, pdf: foremanPdf },
    ];
    const results = [];
    for (const f of files) {
      const up = await uploadPdfToRecord(cfg, lot.id, f.title, f.filename, f.pdf);
      db.prepare(
        `INSERT INTO sf_send_events (cutsheet_id, user_id, prop_number, sf_lot_id, kind, content_document_id, new_version)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      ).run(numeric, me.id, prop, lot.id, f.kind, up.contentDocumentId, up.newVersion ? 1 : 0);
      results.push({ kind: f.kind, contentDocumentId: up.contentDocumentId, newVersion: up.newVersion, bytes: f.pdf.byteLength });
    }

    return NextResponse.json({
      ok: true,
      lot: { id: lot.id, prop: lot.prop, lotNumber: lot.lotNumber, builder: lot.builder, projectCode: lot.projectCode, address: lot.address },
      files: results,
      warnings,
    });
  } catch (err) {
    const msg = err instanceof SalesforceError ? err.message : "Sending to Salesforce failed unexpectedly.";
    if (!(err instanceof SalesforceError)) console.error("salesforce send:", err);
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
