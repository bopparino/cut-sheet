import { db } from "@/lib/db";
import { CutsheetSchema } from "@/lib/schema";
import { ariyaAuthError } from "@/lib/ariya";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET one full cut sheet by id: complete parsed payload plus attachment
// metadata. Blobs stay out — Ariya reasons over the form, not the photos.
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = ariyaAuthError(req);
  if (denied) return denied;

  const { id } = await params;
  const numId = Number(id);
  if (!Number.isInteger(numId)) return Response.json({ error: "Bad id" }, { status: 400 });

  const row = db
    .prepare<[number], { id: number; data: string; created_at: string; updated_at: string }>(
      "SELECT id, data, created_at, updated_at FROM cutsheets WHERE id = ? AND deleted_at IS NULL",
    )
    .get(numId);
  if (!row) return Response.json({ error: "Not found" }, { status: 404 });

  let data;
  try {
    data = CutsheetSchema.parse(JSON.parse(row.data));
  } catch {
    return Response.json({ error: "Sheet failed to parse" }, { status: 500 });
  }

  const attachments = db
    .prepare<[number], { id: number; kind: string; filename: string; mime: string; size: number }>(
      "SELECT id, kind, filename, mime, size FROM attachments WHERE cutsheet_id = ?",
    )
    .all(numId);

  return Response.json({
    id: row.id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    data,
    attachments,
  });
}
