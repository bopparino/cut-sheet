import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Cheap edge gate: if there is no session cookie, send pages to /login and 401
// API calls. This runs on the edge and cannot touch the database, so it only
// checks that a cookie is present. The real check (does the token match a live
// session) happens server-side in getCurrentUser(). The cookie name is
// hardcoded here on purpose so this file never imports the server-only auth
// module (which pulls in better-sqlite3 and would break on the edge).
const SESSION_COOKIE = "cutsheet_session";

export function middleware(req: NextRequest) {
  if (req.cookies.has(SESSION_COOKIE)) return NextResponse.next();

  const { pathname } = req.nextUrl;
  if (pathname.startsWith("/api/")) {
    return new NextResponse("Unauthorized", { status: 401 });
  }
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  return NextResponse.redirect(url);
}

export const config = {
  // Match everything except the login page, the Railway healthcheck endpoint,
  // the Ariya read API, Next internals, and static files (anything with a dot,
  // e.g. favicon.ico or images). /api/health must stay open: Railway's
  // healthcheck sends no session cookie, so gating it would 401 every check
  // and the deploy never goes live. /api/ariya does its own Bearer-token auth
  // (see src/lib/ariya.ts) — Ariya is a service, it has no session cookie.
  // /print/* is exempt here because its own layout runs the REAL DB-backed
  // session check (stronger than this cookie-presence gate) and additionally
  // honors the Ariya render-pass header; edge env access proved flaky in dev,
  // so that decision lives in the Node runtime where env is dependable.
  matcher: ["/((?!login|api/health|api/ariya|print|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
