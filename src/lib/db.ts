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

    -- Dup-flag scratch table (see src/lib/dupes.ts). Created here so that
    -- module never has to touch the db at import time - opening the DB
    -- guarantees the table exists.
    CREATE TABLE IF NOT EXISTS dup_flags (
      cutsheet_id INTEGER PRIMARY KEY REFERENCES cutsheets(id) ON DELETE CASCADE,
      kind TEXT NOT NULL CHECK (kind IN ('exact', 'likely')),
      match_id INTEGER NOT NULL
    );
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
    // uploaded/listed separately and appended to the print packet (normalized
    // to portrait Legal at merge time).
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
      // OR IGNORE: `next build` collects page data in several worker
      // PROCESSES; each one that touches the db opens a fresh build-container
      // DB and runs this migration concurrently. The count check above isn't
      // atomic across processes, so two workers can both see 0 and both
      // insert - the loser used to die with UNIQUE(users.username) and take
      // the whole build down with it.
      db.prepare(
        "INSERT OR IGNORE INTO users (username, display_name, password_hash, role) VALUES (?, ?, ?, 'admin')",
      ).run(username, username, hashPassword(password));
    }

    db.pragma("user_version = 6");
  }

  if (version < 7) {
    // Admin visibility: when each user last logged in, and a log of database
    // backups (the /api/backup endpoint records one row per download) so the
    // admin panel can show "last backup" without guessing.
    const ucols = db.prepare("PRAGMA table_info(users)").all() as Array<{ name: string }>;
    if (!ucols.some((c) => c.name === "last_login_at")) {
      db.exec("ALTER TABLE users ADD COLUMN last_login_at TEXT");
    }
    db.exec(`
      CREATE TABLE IF NOT EXISTS backup_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        size_bytes INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);
    db.pragma("user_version = 7");
  }

  if (version < 8) {
    // Salesforce send ledger: one row per packet PDF pushed onto a Salesforce
    // Lot record (scaffolded July 2026, dormant until the env vars are set —
    // see SALESFORCE.md). The table exists either way so history is never
    // lost to a feature flag.
    db.exec(`
      CREATE TABLE IF NOT EXISTS sf_send_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        cutsheet_id INTEGER REFERENCES cutsheets(id) ON DELETE SET NULL,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        prop_number TEXT NOT NULL DEFAULT '',
        sf_lot_id TEXT NOT NULL DEFAULT '',
        kind TEXT NOT NULL CHECK (kind IN ('shop_packet', 'foreman_packet')),
        content_document_id TEXT NOT NULL DEFAULT '',
        new_version INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_sf_send_events_cutsheet ON sf_send_events(cutsheet_id);
      CREATE INDEX IF NOT EXISTS idx_sf_send_events_prop ON sf_send_events(prop_number);
    `);
    db.pragma("user_version = 8");
  }

  if (version < 9) {
    // App settings the admin can flip at runtime (vs env vars, which need a
    // redeploy). First tenant: require_sf_push_password — the staged-rollout
    // gate on Send to Salesforce (src/lib/settings.ts holds the defaults).
    db.exec(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);
    db.pragma("user_version = 9");
  }

  if (version < 10) {
    // The shop's redrawn July 2026 master sheet added a plain-box drawing at
    // position 26, shifting the catalog tail: old f26 (latch box) is now f27,
    // old f27 (merged angle pair) is now f28, old f28 (plate) is now f29.
    // Renumber the picked fittings on every existing sheet so each row keeps
    // pointing at the SAME drawing it was placed on. Descending order so the
    // renames can't collide. System migration: updated_at/updated_by stay
    // untouched — this is not a user edit.
    const remap: Array<[string, string]> = [["f28", "f29"], ["f27", "f28"], ["f26", "f27"]];
    const rows = db
      .prepare<[], { id: number; data: string }>("SELECT id, data FROM cutsheets")
      .all();
    const write = db.prepare("UPDATE cutsheets SET data = ? WHERE id = ?");
    for (const row of rows) {
      let parsed: { fittings?: Array<{ type?: string }> };
      try {
        parsed = JSON.parse(row.data);
      } catch {
        continue; // schema-invalid rows are handled elsewhere; never brick bootstrap
      }
      const fittings = parsed.fittings;
      if (!Array.isArray(fittings)) continue;
      let touched = false;
      for (const [from, to] of remap) {
        for (const f of fittings) {
          if (f && f.type === from) {
            f.type = to;
            touched = true;
          }
        }
      }
      if (touched) write.run(JSON.stringify(parsed), row.id);
    }
    db.pragma("user_version = 10");
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
