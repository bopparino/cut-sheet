import { loginAction } from "@/lib/user-actions";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center gap-2.5 px-1">
          <span className="font-mono-data flex h-10 w-10 items-center justify-center rounded-sm bg-[var(--ink)] text-[12px] font-semibold tracking-[0.04em] text-white">
            MET
          </span>
          <span className="leading-tight">
            <span className="block text-[16px] font-bold tracking-tight text-foreground">Cut Sheet</span>
            <span className="label-caps mt-0.5 block">Metcalfe HVAC</span>
          </span>
        </div>

        <form action={loginAction} className="space-y-4 rounded-sm border border-border bg-card p-6">
          <div>
            <h1 className="text-[18px] font-bold tracking-[-0.01em] text-foreground">Sign in</h1>
            <p className="font-mono-data mt-0.5 text-[12px] text-[var(--text-3)]">
              Enter your username and password.
            </p>
          </div>

          {error && (
            <p
              className="rounded-sm px-3 py-2 text-[13px] font-semibold"
              style={{ background: "var(--warn-bg)", color: "var(--danger-fg)" }}
            >
              Wrong username or password.
            </p>
          )}

          <label className="block space-y-1.5">
            <span className="label-caps">Username</span>
            <input
              name="username"
              autoFocus
              autoComplete="username"
              className="h-10 w-full rounded-sm border border-input bg-card px-3 text-[14px] outline-none"
            />
          </label>
          <label className="block space-y-1.5">
            <span className="label-caps">Password</span>
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              className="h-10 w-full rounded-sm border border-input bg-card px-3 text-[14px] outline-none"
            />
          </label>

          <button
            type="submit"
            className="btn-glow h-10 w-full rounded-sm bg-primary text-[14px] font-semibold text-primary-foreground"
          >
            Sign in
          </button>
        </form>

        <p className="font-mono-data mt-4 text-center text-[11px] text-[var(--text-ghost)]">Cut Sheet v1.5</p>
      </div>
    </div>
  );
}
