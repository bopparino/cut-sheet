import Link from "next/link";
import { Trash2 } from "lucide-react";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { createUser, updateUser, resetPassword, deleteUser, updateSfPushPasswordSetting } from "@/lib/user-actions";
import { relativeTime, formatDateTime } from "@/lib/utils";
import { getSystemStats, getUserActivity, formatBytes } from "@/lib/admin-stats";
import { salesforceEnabled } from "@/lib/salesforce";
import { requireSfPushPassword } from "@/lib/settings";

export const dynamic = "force-dynamic";

type UserRow = { id: number; username: string; display_name: string; role: string; created_at: string };
type EventRow = { created_at: string; cutsheet_id: number | null; uname: string | null; udisp: string | null; cdata: string | null };

const ERRORS: Record<string, string> = {
  username: "A username is required.",
  short: "Password must be at least 6 characters.",
  taken: "That username is already taken.",
  lastadmin: "You cannot remove or demote the last admin.",
  self: "You cannot delete your own account.",
};
const SAVED: Record<string, string> = {
  created: "User created.",
  updated: "User saved.",
  reset: "Password reset.",
  deleted: "User deleted.",
  sfgate: "Salesforce push setting saved.",
};

function cutsheetTitle(cdata: string | null, id: number | null): string {
  if (!cdata) return id ? `Cutsheet #${id}` : "(deleted)";
  try {
    const d = JSON.parse(cdata) as { name?: string; header?: { builder?: string; project?: string } };
    const h = d.header ?? {};
    return (d.name ?? "").trim() || [h.builder, h.project].filter(Boolean).join(" · ") || `Cutsheet #${id}`;
  } catch {
    return `Cutsheet #${id}`;
  }
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const me = await requireAdmin();
  const sp = await searchParams;
  const savedMsg = sp.saved ? SAVED[sp.saved] : null;
  const errorMsg = sp.error ? ERRORS[sp.error] : null;

  const users = db
    .prepare<[], UserRow>("SELECT id, username, display_name, role, created_at FROM users ORDER BY role DESC, username COLLATE NOCASE ASC")
    .all();

  const events = db
    .prepare<[], EventRow>(
      `SELECT pe.created_at AS created_at, pe.cutsheet_id AS cutsheet_id,
              u.username AS uname, u.display_name AS udisp, c.data AS cdata
       FROM print_events pe
       LEFT JOIN users u ON u.id = pe.user_id
       LEFT JOIN cutsheets c ON c.id = pe.cutsheet_id
       WHERE pe.kind IN ('send_to_shop', 'shop_packet', 'foreman_packet')
       ORDER BY pe.created_at DESC LIMIT 50`,
    )
    .all();

  const stats = getSystemStats();
  const activity = getUserActivity();

  // Salesforce: live/dormant status, the push-password gate, recent sends.
  const sfLive = salesforceEnabled();
  const sfGate = requireSfPushPassword();
  type SfEventRow = {
    created_at: string;
    prop_number: string;
    kind: string;
    new_version: number;
    uname: string | null;
    udisp: string | null;
  };
  const sfEvents = db
    .prepare<[], SfEventRow>(
      `SELECT se.created_at, se.prop_number, se.kind, se.new_version,
              u.username AS uname, u.display_name AS udisp
       FROM sf_send_events se
       LEFT JOIN users u ON u.id = se.user_id
       ORDER BY se.created_at DESC, se.id DESC LIMIT 30`,
    )
    .all();

  return (
    <div>
      <header className="sticky top-0 z-20 flex items-center gap-4 border-b border-border bg-background/90 px-8 py-[18px] backdrop-blur">
        <div className="min-w-0">
          <h1 className="text-[21px] font-bold tracking-[-0.02em] text-foreground">Admin</h1>
          <p className="font-mono-data mt-0.5 text-[12px] text-[var(--text-3)]">
            {stats.users} user{stats.users === 1 ? "" : "s"} · {stats.cutsheets.toLocaleString()} cutsheets
          </p>
        </div>
        <Link href="/admin/trash" className="ml-auto inline-flex h-9 items-center gap-1.5 rounded-sm border border-input bg-card px-4 text-[13px] font-semibold text-foreground hover:bg-accent">
          <Trash2 className="h-4 w-4" /> Trash
        </Link>
      </header>

      <div className="space-y-7 px-8 py-7">
        {savedMsg && (
          <p className="rounded-sm border border-border px-4 py-2.5 text-[13.5px] font-semibold" style={{ background: "var(--fill)" }}>{savedMsg}</p>
        )}
        {errorMsg && (
          <p className="rounded-sm px-4 py-2.5 text-[13.5px] font-semibold" style={{ background: "var(--warn-bg)", color: "var(--danger-fg)" }}>{errorMsg}</p>
        )}

        {/* System stats */}
        <section className="space-y-3">
          <h2 className="label-caps">System</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <Stat label="Cutsheets" value={stats.cutsheets.toLocaleString()} />
            <Stat label="Houses" value={stats.houses.toLocaleString()} hint="distinct property #" />
            <Stat label="Builders" value={stats.builders.toLocaleString()} />
            <Stat label="Subdivisions" value={stats.subdivisions.toLocaleString()} />
            <Stat label="House types" value={stats.houseTypes.toLocaleString()} />
            <Stat label="Attachments" value={stats.attachments.toLocaleString()} hint={formatBytes(stats.attachmentBytes)} />
            <Stat label="Database size" value={formatBytes(stats.dbBytes)} />
            <Stat
              label="Last backup"
              value={stats.lastBackup ? relativeTime(stats.lastBackup.at) : "never"}
              hint={
                stats.lastBackup
                  ? `${formatBytes(stats.lastBackup.sizeBytes)}${stats.lastBackup.by ? ` · ${stats.lastBackup.by}` : ""}`
                  : "download one below"
              }
              warn={!stats.lastBackup}
            />
          </div>
        </section>

        {/* Team activity (SOP visibility) */}
        <section className="space-y-3">
          <h2 className="label-caps">Team activity</h2>
          <div className="overflow-x-auto rounded-sm border border-border bg-card">
            <div className="grid min-w-[560px] grid-cols-[minmax(140px,1fr)_90px_140px_78px_78px_78px] items-center gap-3 border-b border-border bg-[var(--row-tint)] px-[18px] py-2.5">
              <span className="label-caps">User</span>
              <span className="label-caps">Role</span>
              <span className="label-caps">Last login</span>
              <span className="label-caps text-right">Created</span>
              <span className="label-caps text-right">Edited</span>
              <span className="label-caps text-right">Sent</span>
            </div>
            {activity.map((a) => (
              <div
                key={a.id}
                className="grid min-w-[560px] grid-cols-[minmax(140px,1fr)_90px_140px_78px_78px_78px] items-center gap-3 border-b border-[var(--divider)] px-[18px] py-3 last:border-0"
              >
                <span className="min-w-0">
                  <span className="block truncate text-[13.5px] font-semibold text-foreground">{a.displayName || a.username}</span>
                  <span className="font-mono-data block truncate text-[11px] text-[var(--text-3)]">{a.username}</span>
                </span>
                <span className="font-mono-data text-[11px] uppercase text-[var(--text-2)]">{a.role}</span>
                <span className="font-mono-data text-[12px] text-[var(--text-2)]" title={a.lastLoginAt ? formatDateTime(a.lastLoginAt) : ""}>
                  {a.lastLoginAt ? relativeTime(a.lastLoginAt) : "—"}
                </span>
                <span className="font-mono-data text-right text-[13px] text-foreground">{a.created.toLocaleString()}</span>
                <span className="font-mono-data text-right text-[13px] text-foreground">{a.edited.toLocaleString()}</span>
                <span className="font-mono-data text-right text-[13px] text-foreground">{a.sent.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Add user */}
        <section className="space-y-3">
          <h2 className="label-caps">Add user</h2>
          <form action={createUser} className="flex flex-wrap items-end gap-3 rounded-sm border border-border bg-card p-[18px]">
            <Labeled label="Username" className="min-w-[150px] flex-1">
              <input name="username" autoComplete="off" className="h-10 w-full rounded-sm border border-input bg-card px-3 text-[14px] outline-none" />
            </Labeled>
            <Labeled label="Display name" className="min-w-[150px] flex-1">
              <input name="displayName" autoComplete="off" className="h-10 w-full rounded-sm border border-input bg-card px-3 text-[14px] outline-none" />
            </Labeled>
            <Labeled label="Password" className="min-w-[150px] flex-1">
              <input name="password" type="text" autoComplete="off" className="h-10 w-full rounded-sm border border-input bg-card px-3 text-[14px] outline-none" />
            </Labeled>
            <Labeled label="Role" className="w-[120px]">
              <RoleSelect name="role" value="user" />
            </Labeled>
            <button type="submit" className="btn-glow h-10 rounded-sm bg-primary px-5 text-[13.5px] font-semibold text-primary-foreground">Add</button>
          </form>
        </section>

        {/* Users */}
        <section className="space-y-3">
          <h2 className="label-caps">Users</h2>
          <div className="overflow-hidden rounded-sm border border-border bg-card">
            {users.map((u) => (
              <div key={u.id} className="flex flex-wrap items-end gap-3 border-b border-[var(--divider)] px-[18px] py-3.5 last:border-0">
                <div className="min-w-[160px] flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[14px] font-semibold text-foreground">{u.username}</span>
                    <span className="font-mono-data rounded-sm border border-border bg-[var(--fill)] px-1.5 py-px text-[10px] uppercase text-[var(--text-2)]">{u.role}</span>
                    {u.id === me.id && <span className="font-mono-data text-[10px] text-[var(--text-3)]">you</span>}
                  </div>
                  <div className="font-mono-data mt-0.5 text-[11px] text-[var(--text-3)]">created {relativeTime(u.created_at)}</div>
                </div>

                {/* Edit name + role */}
                <form action={updateUser} className="flex items-end gap-2">
                  <input type="hidden" name="id" value={u.id} />
                  <Labeled label="Name" className="w-[150px]">
                    <input name="displayName" defaultValue={u.display_name} className="h-9 w-full rounded-sm border border-input bg-card px-2.5 text-[13px] outline-none" />
                  </Labeled>
                  <Labeled label="Role" className="w-[104px]">
                    <RoleSelect name="role" value={u.role} />
                  </Labeled>
                  <button type="submit" className="h-9 rounded-sm border border-input bg-card px-3 text-[12.5px] font-semibold text-foreground hover:bg-accent">Save</button>
                </form>

                {/* Reset password */}
                <form action={resetPassword} className="flex items-end gap-2">
                  <input type="hidden" name="id" value={u.id} />
                  <Labeled label="New password" className="w-[150px]">
                    <input name="password" type="text" autoComplete="off" placeholder="reset to…" className="h-9 w-full rounded-sm border border-input bg-card px-2.5 text-[13px] outline-none" />
                  </Labeled>
                  <button type="submit" className="h-9 rounded-sm border border-input bg-card px-3 text-[12.5px] font-semibold text-foreground hover:bg-accent">Reset</button>
                </form>

                {/* Delete */}
                <form action={deleteUser}>
                  <input type="hidden" name="id" value={u.id} />
                  <button type="submit" className="h-9 rounded-sm border border-input bg-card px-3 text-[12.5px] font-semibold text-[var(--danger-fg)] hover:bg-accent">Delete</button>
                </form>
              </div>
            ))}
          </div>
        </section>

        {/* Salesforce: rollout gate + push audit log */}
        <section className="space-y-3">
          <h2 className="label-caps">Salesforce</h2>
          <div className="flex flex-wrap items-center gap-4 rounded-sm border border-border bg-card px-[18px] py-4">
            <div className="min-w-0 flex-1">
              <p className="text-[13.5px] font-semibold text-foreground">
                Send to Salesforce is{" "}
                {sfLive ? (
                  <span className="text-foreground">LIVE</span>
                ) : (
                  <span className="text-[var(--text-2)]">dormant (Salesforce env vars not set)</span>
                )}
              </p>
              <p className="mt-0.5 text-[12.5px] text-[var(--text-2)]">
                While the push password is required, every &ldquo;Send to Salesforce&rdquo; click must
                confirm an admin account&rsquo;s password before anything is pushed. Turn it off for
                the full rollout once the team is trained.
              </p>
            </div>
            <form action={updateSfPushPasswordSetting} className="flex items-end gap-2">
              <Labeled label="Require SF Push Password" className="w-[180px]">
                <select
                  name="require"
                  defaultValue={sfGate ? "yes" : "no"}
                  className="h-9 w-full rounded-sm border border-input bg-card px-2 text-[13px] outline-none"
                >
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
              </Labeled>
              <button type="submit" className="h-9 rounded-sm border border-input bg-card px-3 text-[12.5px] font-semibold text-foreground hover:bg-accent">
                Save
              </button>
            </form>
          </div>
          {sfEvents.length > 0 && (
            <div className="overflow-hidden rounded-sm border border-border bg-card">
              {sfEvents.map((e, i) => (
                <div key={i} className="flex items-center gap-3 border-b border-[var(--divider)] px-[18px] py-2.5 last:border-0">
                  <span className="font-mono-data w-[64px] shrink-0 text-[11.5px] text-[var(--text-3)]">{relativeTime(e.created_at)}</span>
                  <span className="min-w-0 flex-1 truncate text-[13.5px] text-foreground">
                    Prop {e.prop_number} · {e.kind === "shop_packet" ? "Shop Packet" : "Foreman Packet"}
                  </span>
                  <span className="font-mono-data shrink-0 rounded-sm border border-border bg-[var(--fill)] px-1.5 py-px text-[10px] uppercase text-[var(--text-2)]">
                    {e.new_version ? "new version" : "new file"}
                  </span>
                  <span className="font-mono-data shrink-0 text-[12px] text-[var(--text-2)]">{e.udisp || e.uname || "unknown"}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Backups */}
        <section className="space-y-3">
          <h2 className="label-caps">Backups</h2>
          <div className="flex flex-wrap items-center gap-4 rounded-sm border border-border bg-card px-[18px] py-4">
            <div className="min-w-0 flex-1">
              <p className="text-[13.5px] font-semibold text-foreground">Download a database snapshot</p>
              <p className="mt-0.5 text-[12.5px] text-[var(--text-2)]">
                Everything in one file - cutsheets, attachments, users, audit log. Keep a copy off
                Railway; volume backups don&rsquo;t survive the volume itself.
              </p>
            </div>
            <a
              href="/api/backup"
              className="btn-glow h-10 shrink-0 rounded-sm bg-primary px-5 text-[13.5px] font-semibold leading-10 text-primary-foreground"
            >
              Download backup
            </a>
          </div>
        </section>

        {/* Send-to-Shop audit log */}
        <section className="space-y-3">
          <h2 className="label-caps">Recent Send to Shop</h2>
          {events.length === 0 ? (
            <p className="rounded-sm border border-border bg-card px-4 py-6 text-center text-[13.5px] text-[var(--text-2)]">Nothing sent to shop yet.</p>
          ) : (
            <div className="overflow-hidden rounded-sm border border-border bg-card">
              {events.map((e, i) => (
                <div key={i} className="flex items-center gap-3 border-b border-[var(--divider)] px-[18px] py-2.5 last:border-0">
                  <span className="font-mono-data w-[64px] shrink-0 text-[11.5px] text-[var(--text-3)]">{relativeTime(e.created_at)}</span>
                  <span className="min-w-0 flex-1 truncate text-[13.5px] text-foreground">{cutsheetTitle(e.cdata, e.cutsheet_id)}</span>
                  <span className="font-mono-data shrink-0 text-[12px] text-[var(--text-2)]">{e.udisp || e.uname || "unknown"}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function Stat({ label, value, hint, warn }: { label: string; value: string; hint?: string; warn?: boolean }) {
  return (
    <div className="rounded-sm border border-border bg-card px-3.5 py-3">
      <div className="label-caps">{label}</div>
      <div className={`font-mono-data mt-1 text-[19px] font-semibold ${warn ? "text-[var(--danger-fg)]" : "text-foreground"}`}>
        {value}
      </div>
      {hint ? <div className="font-mono-data mt-0.5 truncate text-[11px] text-[var(--text-3)]">{hint}</div> : null}
    </div>
  );
}

function Labeled({ label, className, children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <label className={`flex flex-col gap-1.5 ${className ?? ""}`}>
      <span className="label-caps">{label}</span>
      {children}
    </label>
  );
}

function RoleSelect({ name, value }: { name: string; value: string }) {
  return (
    <select name={name} defaultValue={value === "admin" ? "admin" : "user"} className="h-9 w-full rounded-sm border border-input bg-card px-2 text-[13px] outline-none">
      <option value="user">User</option>
      <option value="admin">Admin</option>
    </select>
  );
}
