import "server-only";
import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { hashPassword } from "@/lib/password";

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
    CREATE TABLE IF NOT EXISTS folders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      parent_id INTEGER REFERENCES folders(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_folders_parent ON folders(parent_id);

    CREATE TABLE IF NOT EXISTS cutsheets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      data TEXT NOT NULL,
      folder_id INTEGER REFERENCES folders(id) ON DELETE SET NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      deleted_at TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_cutsheets_folder ON cutsheets(folder_id);

    CREATE TABLE IF NOT EXISTS attachments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cutsheet_id INTEGER NOT NULL REFERENCES cutsheets(id) ON DELETE CASCADE,
      kind TEXT NOT NULL CHECK (kind IN ('drawing', 'image', 'document', 'plan')),
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
    // SQLite can't alter CHECK constraints in place - rebuild the table only
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

  if (version < 3) {
    // Folders: cutsheets gain a nullable folder_id pointing at the folders
    // table. The bootstrap above already creates folders and the index for
    // fresh DBs; this guard adds the column to existing DBs in place.
    // ON DELETE SET NULL - deleting a folder unfiles its cutsheets, not
    // deletes them. That matches user expectation ("folder organization is
    // separate from cutsheet existence").
    const cols = db.prepare("PRAGMA table_info(cutsheets)").all() as Array<{
      name: string;
    }>;
    if (!cols.some((c) => c.name === "folder_id")) {
      db.exec(
        "ALTER TABLE cutsheets ADD COLUMN folder_id INTEGER REFERENCES folders(id) ON DELETE SET NULL",
      );
    }
    db.exec("CREATE INDEX IF NOT EXISTS idx_cutsheets_folder ON cutsheets(folder_id)");
    db.pragma("user_version = 3");
  }

  if (version < 4) {
    // Subfolders: folders gain a nullable parent_id pointing at folders.id.
    // ON DELETE CASCADE - deleting a folder takes its subfolders with it.
    // Cutsheets within any of those folders still revert to unfiled via the
    // existing cutsheets.folder_id ON DELETE SET NULL, so no cutsheet is
    // ever destroyed by folder deletion at any depth.
    const cols = db.prepare("PRAGMA table_info(folders)").all() as Array<{
      name: string;
    }>;
    if (!cols.some((c) => c.name === "parent_id")) {
      db.exec(
        "ALTER TABLE folders ADD COLUMN parent_id INTEGER REFERENCES folders(id) ON DELETE CASCADE",
      );
    }
    db.exec("CREATE INDEX IF NOT EXISTS idx_folders_parent ON folders(parent_id)");
    db.pragma("user_version = 4");
  }

  if (version < 5) {
    // Plans: house-plan PDFs get their own attachment kind so they can be
    // uploaded/listed separately and appended to the print packet at 11x17.
    // SQLite can't alter a CHECK in place - rebuild the table only if the
    // stored DDL doesn't already allow 'plan'.
    const tableInfo = db
      .prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='attachments'")
      .get() as { sql: string } | undefined;
    if (tableInfo && !tableInfo.sql.includes("'plan'")) {
      db.exec(`
        CREATE TABLE attachments_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          cutsheet_id INTEGER NOT NULL REFERENCES cutsheets(id) ON DELETE CASCADE,
          kind TEXT NOT NULL CHECK (kind IN ('drawing', 'image', 'document', 'plan')),
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
    db.pragma("user_version = 5");
  }

  if (version < 6) {
    // Accounts: the app moves behind a login. Users, opaque server-side
    // sessions, a print (send-to-shop) audit log, and created/updated
    // attribution on cutsheets. Seed the first admin if there are no users.
    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE COLLATE NOCASE,
        display_name TEXT NOT NULL DEFAULT '',
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS sessions (
        token TEXT PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        expires_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

      CREATE TABLE IF NOT EXISTS print_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        cutsheet_id INTEGER REFERENCES cutsheets(id) ON DELETE SET NULL,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        kind TEXT NOT NULL DEFAULT 'send_to_shop',
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);

    const cols = db.prepare("PRAGMA table_info(cutsheets)").all() as Array<{ name: string }>;
    if (!cols.some((c) => c.name === "created_by")) {
      db.exec("ALTER TABLE cutsheets ADD COLUMN created_by INTEGER REFERENCES users(id) ON DELETE SET NULL");
    }
    if (!cols.some((c) => c.name === "updated_by")) {
      db.exec("ALTER TABLE cutsheets ADD COLUMN updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL");
    }

    const userCount = (db.prepare("SELECT COUNT(*) AS n FROM users").get() as { n: number }).n;
    if (userCount === 0) {
      const username = process.env.ADMIN_USERNAME || "acantrell";
      const password = process.env.ADMIN_PASSWORD || "AllMight02@";
      db.prepare(
        "INSERT INTO users (username, display_name, password_hash, role) VALUES (?, ?, ?, 'admin')",
      ).run(username, username, hashPassword(password));
    }

    db.pragma("user_version = 6");
  }
}

// Lazy: open on first access. `next build` imports every route module to
// collect page data - if we opened at module-load, multiple build workers
// would race to acquire the WAL-mode lock and one would explode with
// SQLITE_BUSY. Deferring keeps the build pure; the connection only opens
// when a request handler actually touches the DB.
//
// Cached on globalThis so HMR reloads in dev reuse the connection. In prod
// it's a long-running Node process anyway, so one connection per lifetime.
export function getDb(): Database.Database {
  if (globalThis.__cutsheetDb) return globalThis.__cutsheetDb;
  const opened = openDb();
  globalThis.__cutsheetDb = opened;
  return opened;
}

// Backward-compat: `db.prepare(...)` keeps working at every existing call
// site. The Proxy defers `getDb()` until the first property access, so just
// `import { db }` is free.
export const db: Database.Database = new Proxy({} as Database.Database, {
  get(_target, prop) {
    const real = getDb();
    const value = Reflect.get(real, prop) as unknown;
    return typeof value === "function" ? (value as (...a: unknown[]) => unknown).bind(real) : value;
  },
}) as Database.Database;
