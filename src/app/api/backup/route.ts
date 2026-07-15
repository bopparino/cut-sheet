import { createReadStream } from "node:fs";
import { stat, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { Readable } from "node:stream";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Admin-only: download a consistent snapshot of the whole SQLite database
// (cutsheets, attachments, users, audit log - everything). This is the
// off-Railway layer of the backup story: Railway's volume backups die with
// the volume ("wiping a volume deletes all backups") and restore only into
// the same project, so a copy pulled through this endpoint is the one that
// survives anything. better-sqlite3's online backup API produces a valid
// snapshot even while the app is writing (WAL mode).
export async function GET() {
  const me = await getCurrentUser();
  if (!me || me.role !== "admin") return new NextResponse("admin only", { status: 403 });

  const stamp = new Date().toISOString().slice(0, 19).replace(/[T:]/g, "-");
  // randomUUID (not pid+timestamp) so two concurrent backups - two admins, or a
  // double-click - never compute the same path, which would interleave their
  // page writes into one corrupt file and let the first finisher unlink it out
  // from under the second. A corrupt snapshot downloads as a clean success, so
  // the collision must be impossible, not just unlikely.
  const tmp = join(tmpdir(), `cutsheets-backup-${randomUUID()}.db`);

  let size: number;
  try {
    await db.backup(tmp);
    size = (await stat(tmp)).size;
  } catch (err) {
    // If backup/stat fails, the close-handler that normally cleans up was never
    // wired, so remove any partial file here before bailing.
    await unlink(tmp).catch(() => {});
    console.error("backup failed:", err);
    return new NextResponse("backup failed", { status: 500 });
  }

  const stream = createReadStream(tmp);
  // The snapshot is a temp copy; remove it once the download finishes OR aborts
  // OR errors - all three end in "close".
  stream.once("close", () => {
    void unlink(tmp).catch(() => {});
  });

  return new NextResponse(Readable.toWeb(stream) as ReadableStream, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.sqlite3",
      "Content-Length": String(size),
      "Content-Disposition": `attachment; filename="cutsheets-${stamp}.db"`,
      "Cache-Control": "no-store",
    },
  });
}
