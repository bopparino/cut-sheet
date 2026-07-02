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
  // Match everything except the login page, Next internals, and static files
  // (anything with a dot, e.g. favicon.ico or images).
  matcher: ["/((?!login|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
