import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { randomBytes } from "node:crypto";
import { db } from "@/lib/db";

// Opaque server-side sessions. The cookie holds a random token that only
// matches a row in the sessions table, so there is nothing to forge - a bad
// token simply finds no session. Real validation lives here (with the DB);
// the edge middleware only does a cheap cookie-presence gate.

export const SESSION_COOKIE = "cutsheet_session";
const MAX_AGE_S = 60 * 60 * 24 * 30; // 30 days

export type Role = "user" | "admin";
export type SessionUser = { id: number; username: string; displayName: string; role: Role };

export async function createSession(userId: number): Promise<void> {
  const token = randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + MAX_AGE_S * 1000).toISOString();
  db.prepare("INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)").run(token, userId, expires);
  // Durable last-login stamp for the admin panel (sessions get pruned on
  // logout/expiry, so we can't derive it from the sessions table).
  db.prepare("UPDATE users SET last_login_at = datetime('now') WHERE id = ?").run(userId);
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_S,
  });
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) db.prepare("DELETE FROM sessions WHERE token = ?").run(token);
  jar.delete(SESSION_COOKIE);
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const row = db
    .prepare(
      `SELECT u.id AS id, u.username AS username, u.display_name AS displayName,
              u.role AS role, s.expires_at AS expiresAt
       FROM sessions s JOIN users u ON u.id = s.user_id
       WHERE s.token = ?`,
    )
    .get(token) as
    | { id: number; username: string; displayName: string; role: Role; expiresAt: string }
    | undefined;
  if (!row) return null;
  if (new Date(row.expiresAt).getTime() < Date.now()) {
    db.prepare("DELETE FROM sessions WHERE token = ?").run(token);
    return null;
  }
  return { id: row.id, username: row.username, displayName: row.displayName, role: row.role };
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== "admin") redirect("/browse");
  return user;
}

// API-route guard. Returns the user, or a 401 Response to return as-is when
// there's no live session. Routes must call this themselves: the edge
// middleware only checks that a session cookie is PRESENT, not that its token
// maps to a live session, so it is not an identity check. Usage:
//   const me = await requireApiUser();
//   if (me instanceof Response) return me;
export async function requireApiUser(): Promise<SessionUser | Response> {
  const user = await getCurrentUser();
  if (!user) return new Response("unauthorized", { status: 401 });
  return user;
}
