import "server-only";
import { db } from "@/lib/db";

// Read-only aggregates for the admin panel: system totals, storage, last
// backup, and per-user activity for SOP visibility. All derived live from the
// existing tables - nothing here writes.

const B = "COALESCE(TRIM(json_extract(data,'$.header.builder')),'')";
const P = "COALESCE(TRIM(json_extract(data,'$.header.project')),'')";
const HT = "COALESCE(TRIM(json_extract(data,'$.header.houseType')),'')";
const PROP = "COALESCE(TRIM(json_extract(data,'$.header.propNumber')),'')";

export type SystemStats = {
  cutsheets: number;
  builders: number;
  subdivisions: number;
  houseTypes: number;
  houses: number; // distinct non-empty property numbers
  attachments: number;
  attachmentBytes: number;
  dbBytes: number;
  users: number;
  lastBackup: { at: string; sizeBytes: number; by: string | null } | null;
};

export function getSystemStats(): SystemStats {
  const live = "FROM cutsheets WHERE deleted_at IS NULL";
  const counts = db
    .prepare<[], { cutsheets: number; builders: number; subdivisions: number; houseTypes: number; houses: number }>(
      `SELECT COUNT(*) AS cutsheets,
              COUNT(DISTINCT ${B}) FILTER (WHERE ${B} != '') AS builders,
              COUNT(DISTINCT ${B} || '|' || ${P}) FILTER (WHERE ${B} != '') AS subdivisions,
              COUNT(DISTINCT ${B} || '|' || ${P} || '|' || ${HT}) FILTER (WHERE ${B} != '') AS houseTypes,
              COUNT(DISTINCT ${PROP}) FILTER (WHERE ${PROP} != '') AS houses
       ${live}`,
    )
    .get() ?? { cutsheets: 0, builders: 0, subdivisions: 0, houseTypes: 0, houses: 0 };

  const att = db
    .prepare<[], { n: number; bytes: number }>(
      "SELECT COUNT(*) AS n, COALESCE(SUM(size), 0) AS bytes FROM attachments",
    )
    .get() ?? { n: 0, bytes: 0 };

  const pageCount = db.pragma("page_count", { simple: true }) as number;
  const pageSize = db.pragma("page_size", { simple: true }) as number;

  const users = (db.prepare("SELECT COUNT(*) AS n FROM users").get() as { n: number }).n;

  const lastBackup = db
    .prepare<[], { at: string; sizeBytes: number; by: string | null }>(
      `SELECT be.created_at AS at, be.size_bytes AS sizeBytes, u.display_name AS by
       FROM backup_events be LEFT JOIN users u ON u.id = be.user_id
       ORDER BY be.created_at DESC LIMIT 1`,
    )
    .get() ?? null;

  return {
    ...counts,
    attachments: att.n,
    attachmentBytes: att.bytes,
    dbBytes: pageCount * pageSize,
    users,
    lastBackup,
  };
}

export type UserActivity = {
  id: number;
  username: string;
  displayName: string;
  role: string;
  lastLoginAt: string | null;
  created: number; // cutsheets this user created
  edited: number; // cutsheets last edited by this user
  sent: number; // packets/sends by this user
};

export function getUserActivity(): UserActivity[] {
  return db
    .prepare<[], UserActivity>(
      `SELECT u.id AS id, u.username AS username, u.display_name AS displayName,
              u.role AS role, u.last_login_at AS lastLoginAt,
              (SELECT COUNT(*) FROM cutsheets c WHERE c.created_by = u.id AND c.deleted_at IS NULL) AS created,
              (SELECT COUNT(*) FROM cutsheets c WHERE c.updated_by = u.id AND c.deleted_at IS NULL) AS edited,
              (SELECT COUNT(*) FROM print_events pe WHERE pe.user_id = u.id
                 AND pe.kind IN ('send_to_shop','shop_packet','foreman_packet')) AS sent
       FROM users u
       ORDER BY u.role DESC, u.last_login_at DESC NULLS LAST, u.username COLLATE NOCASE ASC`,
    )
    .all();
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let v = bytes / 1024;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(v >= 100 || i === 0 ? 0 : 1)} ${units[i]}`;
}
