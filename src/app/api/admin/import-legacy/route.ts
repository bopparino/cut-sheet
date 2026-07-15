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
    .min(1)
    .max(1000),
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
  const hasKey = db.prepare("SELECT 1 FROM legacy_imports WHERE key = ?");
  const insertSheet = db.prepare(
    `INSERT INTO cutsheets (data, folder_id, created_at, updated_at)
     VALUES (?, ?, COALESCE(?, datetime('now')), COALESCE(?, datetime('now')))`,
  );
  const recordImport = db.prepare("INSERT INTO legacy_imports (key, cutsheet_id) VALUES (?, ?)");

  let imported = 0;
  let skipped = 0;
  let foldersCreated = 0;

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

    for (const s of bundle.sheets) {
      if (hasKey.get(s.key)) {
        skipped++;
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
  });
  run();

  return NextResponse.json({ imported, skipped, foldersCreated });
}
