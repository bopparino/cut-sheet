"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/password";
import { createSession, destroySession, getCurrentUser, requireUser, requireAdmin } from "@/lib/auth";
import { setSetting, REQUIRE_SF_PUSH_PASSWORD_KEY } from "@/lib/settings";

type UserRow = { id: number; username: string; display_name: string; password_hash: string; role: string };

function adminCount(): number {
  return (db.prepare("SELECT COUNT(*) AS n FROM users WHERE role = 'admin'").get() as { n: number }).n;
}

// ----- Session -----------------------------------------------------------------

export async function loginAction(formData: FormData) {
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const user = db
    .prepare<[string], UserRow>("SELECT * FROM users WHERE username = ? COLLATE NOCASE")
    .get(username);
  if (!user || !verifyPassword(password, user.password_hash)) {
    redirect("/login?error=1");
  }
  await createSession(user.id);
  redirect("/browse");
}

export async function logoutAction() {
  await destroySession();
  redirect("/login");
}

// ----- Self service ------------------------------------------------------------

export async function updateProfile(formData: FormData) {
  const me = await requireUser();
  const displayName = String(formData.get("displayName") ?? "").trim();
  db.prepare("UPDATE users SET display_name = ? WHERE id = ?").run(displayName, me.id);
  revalidatePath("/settings");
  redirect("/settings?saved=name");
}

export async function changePassword(formData: FormData) {
  const me = await requireUser();
  const current = String(formData.get("current") ?? "");
  const next = String(formData.get("next") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  const row = db.prepare<[number], UserRow>("SELECT * FROM users WHERE id = ?").get(me.id);
  if (!row || !verifyPassword(current, row.password_hash)) {
    redirect("/settings?error=current");
  }
  if (next.length < 6) redirect("/settings?error=short");
  if (next !== confirm) redirect("/settings?error=match");
  db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(hashPassword(next), me.id);
  redirect("/settings?saved=password");
}

// ----- Admin: user management --------------------------------------------------

export async function createUser(formData: FormData) {
  await requireAdmin();
  const username = String(formData.get("username") ?? "").trim();
  const displayName = String(formData.get("displayName") ?? "").trim() || username;
  const password = String(formData.get("password") ?? "");
  const role = String(formData.get("role") ?? "user") === "admin" ? "admin" : "user";
  if (!username) redirect("/admin?error=username");
  if (password.length < 6) redirect("/admin?error=short");
  const exists = db.prepare("SELECT id FROM users WHERE username = ? COLLATE NOCASE").get(username);
  if (exists) redirect("/admin?error=taken");
  db.prepare(
    "INSERT INTO users (username, display_name, password_hash, role) VALUES (?, ?, ?, ?)",
  ).run(username, displayName, hashPassword(password), role);
  revalidatePath("/admin");
  redirect("/admin?saved=created");
}

export async function updateUser(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) redirect("/admin");
  const displayName = String(formData.get("displayName") ?? "").trim();
  const role = String(formData.get("role") ?? "user") === "admin" ? "admin" : "user";
  const target = db.prepare<[number], UserRow>("SELECT * FROM users WHERE id = ?").get(id);
  if (!target) redirect("/admin");
  // Do not let the last admin be demoted to a regular user.
  if (target.role === "admin" && role === "user" && adminCount() <= 1) {
    redirect("/admin?error=lastadmin");
  }
  db.prepare("UPDATE users SET display_name = ?, role = ? WHERE id = ?").run(displayName, role, id);
  revalidatePath("/admin");
  redirect("/admin?saved=updated");
}

export async function resetPassword(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get("id"));
  const password = String(formData.get("password") ?? "");
  if (!Number.isInteger(id)) redirect("/admin");
  if (password.length < 6) redirect("/admin?error=short");
  db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(hashPassword(password), id);
  revalidatePath("/admin");
  redirect("/admin?saved=reset");
}

export async function deleteUser(formData: FormData) {
  const me = await requireAdmin();
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) redirect("/admin");
  if (id === me.id) redirect("/admin?error=self");
  const target = db.prepare<[number], UserRow>("SELECT * FROM users WHERE id = ?").get(id);
  if (!target) redirect("/admin");
  if (target.role === "admin" && adminCount() <= 1) redirect("/admin?error=lastadmin");
  db.prepare("DELETE FROM users WHERE id = ?").run(id);
  revalidatePath("/admin");
  redirect("/admin?saved=deleted");
}

// ----- Admin: app settings ------------------------------------------------------

// The Send-to-Salesforce staged-rollout switch (admin panel → Salesforce).
// "yes" = every push must confirm an admin account's password; "no" = the
// button works for everyone (full rollout).
export async function updateSfPushPasswordSetting(formData: FormData) {
  await requireAdmin();
  const value = String(formData.get("require") ?? "yes") === "no" ? "no" : "yes";
  setSetting(REQUIRE_SF_PUSH_PASSWORD_KEY, value);
  revalidatePath("/admin");
  redirect("/admin?saved=sfgate");
}

// Re-exported for pages that want the current user without importing auth directly.
export { getCurrentUser };
