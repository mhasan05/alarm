import { NextResponse, type NextRequest } from "next/server";
import { HOME, parseSession, roleForPath, SESSION_COOKIE } from "@/lib/session";

/**
 * Route protection: each portal opens only for its own role. Signed-out visitors go to the login page
 * (and come back after signing in); a signed-in user opening another role's portal goes home.
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const session = parseSession(request.cookies.get(SESSION_COOKIE)?.value);

  if ((pathname === "/login" || pathname === "/forgot-password") && session) {
    return NextResponse.redirect(new URL(HOME[session.role], request.url));
  }

  const role = roleForPath(pathname);
  if (!role) return NextResponse.next();

  if (!session) {
    const login = new URL("/login", request.url);
    login.searchParams.set("next", pathname + search);
    return NextResponse.redirect(login);
  }

  if (session.role !== role) {
    const home = new URL(HOME[session.role], request.url);
    home.searchParams.set("denied", pathname);
    return NextResponse.redirect(home);
  }

  return NextResponse.next();
}

export const config = {
  // Skip Next internals and static files.
  matcher: ["/((?!_next/|icon.png|apple-icon.png|logo.png|robots.txt|.*\\.(?:png|jpg|svg|ico|webmanifest|js|css)$).*)"],
};
