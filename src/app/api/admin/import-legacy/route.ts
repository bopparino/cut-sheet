import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { CutsheetSchema } from "@/lib/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Admin-only sink for legacy Access imports. scripts/import-legacy.mts
// assembles the old tbl_Cut_Sheet_Library_* exports into ready Cutsheet
// objects locally (--emit bundle.json); scripts/push-legacy.mts POSTs the
// bundle here in chunks. All the mapping cleverness stays in the script -
// this route only validates, files, and inserts, and the legacy_imports
// ledger (keyed propNumber|CutSheet#|BUILDER) makes every chunk idempotent,
// so a dropped connection or a re-run never duplicates a sheet.

const BundleSchema = z.object({
  // "update" refreshes already-imported sheets in place from the incoming
  // data (Access wins) — but ONLY sheets that are already in the ledger AND
  // that no user has edited in the app (updated_by IS NULL): a refresh must
  // never insert surprise sheets or clobber human work. The default keeps
  // the original insert-if-unknown / skip-if-known behavior.
  mode: z.enum(["insert", "update"]).optional(),
  // Explicit override for the edited-sheet guard: cutsheet ids the admin has
  // REVIEWED (diffed against the incoming data) and chosen to refresh anyway.
  // Named ids only - there is deliberately no "force all" switch.
  forceEditedIds: z.array(z.number().int()).max(5000).optional(),
  sheets: z
    .array(
      z.object({
        key: z.string().min(1),
        builder: z.string(),
        createdAt: z.string().nullable().optional(),
        updatedAt: z.string().nullable().optional(),
        cutsheet: CutsheetSchema,
      }),
    )
    .max(1000)
    .optional(),
  // Fittings whiteboard drawings extracted from the .mdb files
  // (scripts/extract-drawings.py), addressed by ledger key. Upserted by
  // (cutsheet, filename) so re-pushes refresh rather than duplicate.
  attachments: z
    .array(
      z.object({
        key: z.string().min(1),
        filename: z.string().min(1),
        mime: z.string().default("image/png"),
        dataBase64: z.string().min(1).max(4_000_000),
      }),
    )
    .max(200)
    .optional(),
});

const ALPHABET = Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i));
const builderLetter = (builder: string) => {
  const first = builder.trim().charAt(0).toUpperCase();
  return first >= "A" && first <= "Z" ? first : "#";
};

export async function POST(req: Request) {
  const me = await getCurrentUser();
  if (!me || me.role !== "admin") return new NextResponse("admin only", { status: 403 });

  let bundle: z.infer<typeof BundleSchema>;
  try {
    bundle = BundleSchema.parse(await req.json());
  } catch (err) {
    const msg = err instanceof z.ZodError ? err.issues[0]?.message : "unreadable JSON";
    return new NextResponse(`bad bundle: ${msg}`, { status: 400 });
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS legacy_imports (
      key TEXT PRIMARY KEY,
      cutsheet_id INTEGER NOT NULL REFERENCES cutsheets(id) ON DELETE CASCADE
    );
  `);

  const findFolder = db.prepare("SELECT id FROM folders WHERE name = ? AND parent_id IS ?");
  const insertFolder = db.prepare("INSERT INTO folders (name, parent_id) VALUES (?, ?)");
  const keyRow = db.prepare("SELECT cutsheet_id FROM legacy_imports WHERE key = ?");
  const insertSheet = db.prepare(
    `INSERT INTO cutsheets (data, folder_id, created_at, updated_at)
     VALUES (?, ?, COALESCE(?, datetime('now')), COALESCE(?, datetime('now')))`,
  );
  const updateSheet = db.prepare(
    "UPDATE cutsheets SET data = ?, updated_at = COALESCE(?, updated_at) WHERE id = ?",
  );
  const recordImport = db.prepare("INSERT INTO legacy_imports (key, cutsheet_id) VALUES (?, ?)");
  const deleteAttachment = db.prepare(
    "DELETE FROM attachments WHERE cutsheet_id = ? AND filename = ?",
  );
  const insertAttachment = db.prepare(
    `INSERT INTO attachments (cutsheet_id, kind, filename, mime, size, blob)
     VALUES (?, 'image', ?, ?, ?, ?)`,
  );

  const editedBy = db.prepare(
    "SELECT updated_by AS by FROM cutsheets WHERE id = ?",
  );

  const updateMode = bundle.mode === "update";
  let imported = 0;
  let updated = 0;
  let skipped = 0;
  let foldersCreated = 0;
  let attached = 0;
  let unmatched = 0;
  // Update-mode safety reporting: which known sheets were left alone because
  // a user edited them in the app, and how many incoming sheets had no ledger
  // entry (never inserted in update mode - a refresh is not an import).
  const skippedEdited: number[] = [];
  let unknownSkipped = 0;

  const run = db.transaction(() => {
    const folder = (name: string, parentId: number | null): number => {
      const found = findFolder.get(name, parentId) as { id: number } | undefined;
      if (found) return found.id;
      foldersCreated++;
      return Number(insertFolder.run(name, parentId).lastInsertRowid);
    };

    // Same tree the CLI importer builds: empty A-Z at the top level for
    // day-to-day filing, imported sheets under IMPORTS > letter > builder.
    for (const l of ALPHABET) folder(l, null);
    const importsId = folder("IMPORTS", null);

    for (const s of bundle.sheets ?? []) {
      const known = keyRow.get(s.key) as { cutsheet_id: number } | undefined;
      if (known) {
        if (updateMode) {
          // Human edits win over Access: a sheet someone touched in the app
          // is reported, not refreshed - unless the admin reviewed it and
          // named its id in forceEditedIds.
          const edit = editedBy.get(known.cutsheet_id) as { by: number | null } | undefined;
          if (edit && edit.by != null && !bundle.forceEditedIds?.includes(known.cutsheet_id)) {
            skippedEdited.push(known.cutsheet_id);
          } else {
            updateSheet.run(JSON.stringify(s.cutsheet), s.updatedAt ?? null, known.cutsheet_id);
            updated++;
          }
        } else {
          skipped++;
        }
        continue;
      }
      if (updateMode) {
        // A refresh is not an import: keys the ledger doesn't know (sources
        // that were never imported, or Access rows whose identity changed
        // since import) are counted and reported, never inserted.
        unknownSkipped++;
        continue;
      }
      const letterId = folder(builderLetter(s.builder), importsId);
      const builderId = folder(s.builder.trim() || "(no builder)", letterId);
      const res = insertSheet.run(
        JSON.stringify(s.cutsheet),
        builderId,
        s.createdAt ?? null,
        s.updatedAt ?? null,
      );
      recordImport.run(s.key, Number(res.lastInsertRowid));
      imported++;
    }

    for (const a of bundle.attachments ?? []) {
      const known = keyRow.get(a.key) as { cutsheet_id: number } | undefined;
      if (!known) {
        unmatched++;
        continue;
      }
      const blob = Buffer.from(a.dataBase64, "base64");
      deleteAttachment.run(known.cutsheet_id, a.filename);
      insertAttachment.run(known.cutsheet_id, a.filename, a.mime, blob.length, blob);
      attached++;
    }
  });
  run();

  return NextResponse.json({
    imported,
    updated,
    skipped,
    foldersCreated,
    attached,
    unmatched,
    unknownSkipped,
    skippedEdited,
  });
}
