import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { recheckDupFlags } from "@/lib/dupes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Admin-only bulk retention purge, driven by scripts/purge-cutsheets.mts
// (same cookie/session pattern as push-legacy). Three actions:
//
//   preview - classify every live sheet against a date cutoff + builder
//             match and return the full row list. NOTHING is written.
//             The script turns this into a CSV humans review in Excel.
//   execute - soft-delete an EXPLICIT id list (what was reviewed is what
//             is deleted; the server does not re-derive the match here).
//             Sheets land in /admin/trash exactly like a manual delete,
//             and every read path (browse/search/packets/pick tickets/
//             Salesforce) already filters deleted_at IS NULL, so a
//             trashed sheet cannot leak into any printout.
//   restore - undo: clear deleted_at for an explicit id list.
//
// Policy decided Aug 2026 (Austin): DATE = header.date, 30-day cutoff;
// KHOV purged regardless of date; sheets a human edited in the app
// (updated_by set) are NEVER auto-purged - they are listed in the preview
// as keep-edited so the admin can flip individual rows in the CSV.

const RequestSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("preview"),
    // Sheets whose parsed header.date is STRICTLY BEFORE this date match
    // the age rule. ISO YYYY-MM-DD.
    cutoffDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    // Case-insensitive substrings matched against header.builder - a sheet
    // matches the builder rule when any substring occurs in its builder.
    buildersLike: z.array(z.string().min(1)).max(20).default([]),
  }),
  z.object({
    action: z.literal("execute"),
    ids: z.array(z.number().int().positive()).min(1).max(5000),
  }),
  z.object({
    action: z.literal("restore"),
    ids: z.array(z.number().int().positive()).min(1).max(5000),
  }),
]);

// header.date is stored as ISO YYYY-MM-DD by the form's date input, but
// legacy-imported values could in principle carry other shapes - accept the
// same formats the dry-run audit used and treat anything else as unparseable
// (unparseable NEVER matches the age rule; deletion requires certainty).
function parseSheetDate(raw: string): string | null {
  const s = raw.trim();
  if (!s) return null;
  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s);
  if (m) return isoOrNull(m[1], m[2], m[3]);
  m = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec(s);
  if (m) return isoOrNull(m[3], m[1], m[2]);
  m = /^(\d{1,2})\/(\d{1,2})\/(\d{2})$/.exec(s);
  if (m) return isoOrNull(String(2000 + Number(m[3])), m[1], m[2]);
  return null;
}

function isoOrNull(y: string, mo: string, d: string): string | null {
  const yy = Number(y);
  const mm = Number(mo);
  const dd = Number(d);
  if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return null;
  return `${String(yy).padStart(4, "0")}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
}

type PreviewRow = {
  id: number;
  verdict: "purge" | "keep-edited" | "keep-undated";
  reason: string; // "old" | "builder" | "old+builder" | "no-date" | "bad-date"
  builder: string;
  project: string;
  houseType: string;
  lot: string;
  date: string;
  updatedAt: string;
  editedBy: string | null;
};

export async function POST(req: Request) {
  const me = await getCurrentUser();
  if (!me || me.role !== "admin") return new NextResponse("admin only", { status: 403 });

  let body: z.infer<typeof RequestSchema>;
  try {
    body = RequestSchema.parse(await req.json());
  } catch (err) {
    const msg = err instanceof z.ZodError ? err.issues[0]?.message : "unreadable JSON";
    return new NextResponse(`bad request: ${msg}`, { status: 400 });
  }

  if (body.action === "preview") {
    const needles = body.buildersLike.map((s) => s.toUpperCase());
    const rows = db
      .prepare<[], { id: number; data: string; updated_at: string; editedBy: string | null }>(
        `SELECT c.id, c.data, c.updated_at, u.username AS editedBy
         FROM cutsheets c LEFT JOIN users u ON u.id = c.updated_by
         WHERE c.deleted_at IS NULL
         ORDER BY c.id`,
      )
      .all();

    const out: PreviewRow[] = [];
    let notMatched = 0;
    for (const r of rows) {
      let header: Record<string, unknown> = {};
      try {
        const parsed = JSON.parse(r.data) as { header?: Record<string, unknown> };
        header = parsed.header ?? {};
      } catch {
        // Unparseable JSON blob: surface it as undated so a human sees it
        // rather than silently skipping.
      }
      const str = (k: string) => String(header[k] ?? "").trim();
      const builder = str("builder");
      const rawDate = str("date");
      const iso = parseSheetDate(rawDate);
      const isOld = iso !== null && iso < body.cutoffDate;
      const builderHit =
        needles.length > 0 && needles.some((n) => builder.toUpperCase().includes(n));

      let verdict: PreviewRow["verdict"] | null = null;
      let reason = "";
      if (isOld || builderHit) {
        reason = isOld && builderHit ? "old+builder" : isOld ? "old" : "builder";
        verdict = r.editedBy !== null ? "keep-edited" : "purge";
      } else if (iso === null) {
        // Not matched by any rule, but the sheet has no usable DATE - list
        // it so the admin knows the age rule can never touch it.
        verdict = "keep-undated";
        reason = rawDate === "" ? "no-date" : "bad-date";
      }

      if (verdict === null) {
        notMatched++;
        continue;
      }
      out.push({
        id: r.id,
        verdict,
        reason,
        builder,
        project: str("project"),
        houseType: str("houseType"),
        lot: str("lot"),
        date: rawDate,
        updatedAt: r.updated_at,
        editedBy: r.editedBy,
      });
    }

    const count = (v: PreviewRow["verdict"]) => out.filter((r) => r.verdict === v).length;
    return NextResponse.json({
      cutoffDate: body.cutoffDate,
      buildersLike: body.buildersLike,
      totals: {
        live: rows.length,
        purge: count("purge"),
        keepEdited: count("keep-edited"),
        keepUndated: count("keep-undated"),
        notMatched,
      },
      rows: out,
    });
  }

  // execute / restore - one transaction so a dropped connection can't leave
  // a half-applied purge, then a dup-flag recheck (same contract as every
  // other delete path: flags on gone sheets clear, partners re-evaluate).
  const ids = body.ids;
  const CHUNK = 500;
  let changed = 0;
  const stmt =
    body.action === "execute"
      ? db.prepare(
          `UPDATE cutsheets SET deleted_at = datetime('now')
           WHERE id IN (SELECT value FROM json_each(?)) AND deleted_at IS NULL`,
        )
      : db.prepare(
          `UPDATE cutsheets SET deleted_at = NULL
           WHERE id IN (SELECT value FROM json_each(?)) AND deleted_at IS NOT NULL`,
        );
  db.transaction(() => {
    for (let i = 0; i < ids.length; i += CHUNK) {
      changed += stmt.run(JSON.stringify(ids.slice(i, i + CHUNK))).changes;
    }
  })();
  recheckDupFlags(ids);

  return NextResponse.json(
    body.action === "execute"
      ? { deleted: changed, skipped: ids.length - changed }
      : { restored: changed, skipped: ids.length - changed },
  );
}
