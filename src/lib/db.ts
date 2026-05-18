import "server-only";
import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

const DEFAULT_PATH = "./data/cutsheets.db";

declare global {
  // eslint-disable-next-line no-var
  var __cutsheetDb: Database.Database | undefined;
}

function openDb(): Database.Database {
  const path = process.env.DATABASE_PATH ?? DEFAULT_PATH;
  mkdirSync(dirname(path), { recursive: true });
  const db = new Database(path);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  migrate(db);
  return db;
}

function migrate(db: Database.Database): void {
  // Bootstrap (idempotent). New DBs land at the latest constraint set in one
  // shot; old DBs no-op here and the versioned migrations below catch them up.
  db.exec(`
    CREATE TABLE IF NOT EXISTS cutsheets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      data TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      deleted_at TEXT
    );

    CREATE TABLE IF NOT EXISTS attachments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cutsheet_id INTEGER NOT NULL REFERENCES cutsheets(id) ON DELETE CASCADE,
      kind TEXT NOT NULL CHECK (kind IN ('drawing', 'image', 'document')),
      filename TEXT NOT NULL,
      mime TEXT NOT NULL,
      size INTEGER NOT NULL,
      blob BLOB NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_attachments_cutsheet ON attachments(cutsheet_id);
  `);

  // Versioned migrations. user_version defaults to 0 on fresh DBs and on
  // any DB that predates this versioning scheme.
  const version = db.pragma("user_version", { simple: true }) as number;

  if (version < 1) {
    // The pre-versioning CHECK constraint only allowed 'drawing' and 'image'.
    // SQLite can't alter CHECK constraints in place — rebuild the table only
    // if the stored DDL hasn't already been updated by the bootstrap above.
    const tableInfo = db
      .prepare(
        "SELECT sql FROM sqlite_master WHERE type='table' AND name='attachments'",
      )
      .get() as { sql: string } | undefined;
    if (tableInfo && !tableInfo.sql.includes("'document'")) {
      db.exec(`
        CREATE TABLE attachments_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          cutsheet_id INTEGER NOT NULL REFERENCES cutsheets(id) ON DELETE CASCADE,
          kind TEXT NOT NULL CHECK (kind IN ('drawing', 'image', 'document')),
          filename TEXT NOT NULL,
          mime TEXT NOT NULL,
          size INTEGER NOT NULL,
          blob BLOB NOT NULL,
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
        INSERT INTO attachments_new SELECT * FROM attachments;
        DROP TABLE attachments;
        ALTER TABLE attachments_new RENAME TO attachments;
        CREATE INDEX IF NOT EXISTS idx_attachments_cutsheet ON attachments(cutsheet_id);
      `);
    }
    db.pragma("user_version = 1");
  }

  if (version < 2) {
    // Soft-delete: cutsheets get a deleted_at column. Existing rows are
    // alive (NULL). Hidden admin panel at /admin/trash can restore or
    // permanently purge anything that landed in the bin.
    const cols = db.prepare("PRAGMA table_info(cutsheets)").all() as Array<{
      name: string;
    }>;
    if (!cols.some((c) => c.name === "deleted_at")) {
      db.exec("ALTER TABLE cutsheets ADD COLUMN deleted_at TEXT");
    }
    db.pragma("user_version = 2");
  }
}

// Cache the connection across HMR reloads in dev. In prod, Next.js serverless
// would reopen per request — but we deploy as a long-running Node process, so
// one connection per server lifetime is correct.
export const db: Database.Database = globalThis.__cutsheetDb ?? openDb();
if (process.env.NODE_ENV !== "production") globalThis.__cutsheetDb = db;
