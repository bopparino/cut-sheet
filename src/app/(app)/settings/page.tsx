import { requireUser } from "@/lib/auth";
import { updateProfile, changePassword, logoutAction } from "@/lib/user-actions";

export const dynamic = "force-dynamic";

const ERRORS: Record<string, string> = {
  current: "Your current password was not correct.",
  short: "New password must be at least 6 characters.",
  match: "The new passwords did not match.",
};
const SAVED: Record<string, string> = {
  name: "Name updated.",
  password: "Password changed.",
};

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const user = await requireUser();
  const sp = await searchParams;
  const savedMsg = sp.saved ? SAVED[sp.saved] : null;
  const errorMsg = sp.error ? ERRORS[sp.error] : null;

  return (
    <div>
      <header className="sticky top-0 z-20 flex items-center gap-4 border-b border-border bg-background/90 px-8 py-[18px] backdrop-blur">
        <div className="min-w-0">
          <h1 className="text-[21px] font-bold tracking-[-0.02em] text-foreground">Settings</h1>
          <p className="font-mono-data mt-0.5 text-[12px] text-[var(--text-3)]">
            Signed in as {user.username}
          </p>
        </div>
        <form action={logoutAction} className="ml-auto">
          <button
            type="submit"
            className="inline-flex h-9 items-center rounded-sm border border-input bg-card px-4 text-[13px] font-semibold text-foreground hover:bg-accent"
          >
            Log out
          </button>
        </form>
      </header>

      <div className="max-w-2xl space-y-6 px-8 py-7">
        {savedMsg && (
          <p className="rounded-sm border px-4 py-2.5 text-[13.5px] font-semibold" style={{ background: "var(--fill)", borderColor: "var(--border)", color: "var(--text-1)" }}>
            {savedMsg}
          </p>
        )}
        {errorMsg && (
          <p className="rounded-sm px-4 py-2.5 text-[13.5px] font-semibold" style={{ background: "var(--warn-bg)", color: "var(--danger-fg)" }}>
            {errorMsg}
          </p>
        )}

        {/* Display name */}
        <section className="rounded-sm border border-border bg-card p-5">
          <h2 className="text-[15px] font-bold text-foreground">Your name</h2>
          <p className="font-mono-data mt-0.5 text-[12px] text-[var(--text-3)]">
            This is the name shown on cut sheets you create and print.
          </p>
          <form action={updateProfile} className="mt-4 flex flex-wrap items-end gap-3">
            <label className="flex flex-1 flex-col gap-1.5" style={{ minWidth: 220 }}>
              <span className="label-caps">Display name</span>
              <input
                name="displayName"
                defaultValue={user.displayName}
                className="h-10 rounded-sm border border-input bg-card px-3 text-[14px] outline-none"
              />
            </label>
            <button type="submit" className="btn-glow h-10 rounded-sm bg-primary px-5 text-[13.5px] font-semibold text-primary-foreground">
              Save name
            </button>
          </form>
        </section>

        {/* Password */}
        <section className="rounded-sm border border-border bg-card p-5">
          <h2 className="text-[15px] font-bold text-foreground">Password</h2>
          <p className="font-mono-data mt-0.5 text-[12px] text-[var(--text-3)]">
            Enter your current password, then your new one twice.
          </p>
          <form action={changePassword} className="mt-4 grid gap-3 sm:grid-cols-3">
            <label className="flex flex-col gap-1.5">
              <span className="label-caps">Current password</span>
              <input name="current" type="password" autoComplete="current-password" className="h-10 rounded-sm border border-input bg-card px-3 text-[14px] outline-none" />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="label-caps">New password</span>
              <input name="next" type="password" autoComplete="new-password" className="h-10 rounded-sm border border-input bg-card px-3 text-[14px] outline-none" />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="label-caps">Confirm new</span>
              <input name="confirm" type="password" autoComplete="new-password" className="h-10 rounded-sm border border-input bg-card px-3 text-[14px] outline-none" />
            </label>
            <div className="sm:col-span-3">
              <button type="submit" className="btn-glow h-10 rounded-sm bg-primary px-5 text-[13.5px] font-semibold text-primary-foreground">
                Change password
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}
