import "server-only";
import { db } from "@/lib/db";

// Runtime app settings (admin-flippable, stored in the settings table).
// Missing row = the default here, so fresh databases and pre-migration
// backups behave sanely without seeding.

export function getSetting(key: string, fallback: string): string {
  const row = db.prepare<[string], { value: string }>("SELECT value FROM settings WHERE key = ?").get(key);
  return row?.value ?? fallback;
}

export function setSetting(key: string, value: string): void {
  db.prepare(
    `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now'))
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
  ).run(key, value);
}

// --- Send to Salesforce password gate ---------------------------------------
// The staged-rollout switch (admin panel → Salesforce): while ON, every
// "Send to Salesforce" click must confirm an ADMIN account's password before
// the push runs — so the integration can be live in prod while only the
// admin (or someone they've trained and trusted with the password) can use
// it. Flip OFF for the full rollout. DEFAULT ON: a freshly-activated
// integration starts locked.

export const REQUIRE_SF_PUSH_PASSWORD_KEY = "require_sf_push_password";

export function requireSfPushPassword(): boolean {
  return getSetting(REQUIRE_SF_PUSH_PASSWORD_KEY, "yes") !== "no";
}
