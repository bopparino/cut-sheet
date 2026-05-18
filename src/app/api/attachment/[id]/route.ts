import { db } from "@/lib/db";

type Row = { mime: string; blob: Buffer; filename: string };

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const numeric = Number(id);
  if (!Number.isInteger(numeric)) return new Response("bad id", { status: 400 });

  const row = db
    .prepare<[number], Row>("SELECT mime, blob, filename FROM attachments WHERE id = ?")
    .get(numeric);

  if (!row) return new Response("not found", { status: 404 });

  // better-sqlite3 returns BLOB as a Node Buffer; Response expects a web stream
  // or BodyInit, and Uint8Array satisfies that with no extra copy.
  return new Response(new Uint8Array(row.blob), {
    headers: {
      "Content-Type": row.mime,
      "Cache-Control": "private, max-age=3600",
      "Content-Disposition": `inline; filename="${encodeURIComponent(row.filename)}"`,
    },
  });
}
