import { NextRequest, NextResponse } from "next/server";
import { verifyJWT } from "@/lib/auth/session";

/**
 * Pages and APIs a signed-out visitor may open. Each entry matches the path
 * itself and anything below it ("/venue" covers "/venue/abc"), never a mere
 * string prefix — "/" in particular matches only the home page. (It used to be
 * a startsWith check, which made "/" match every path and switched the gate off.)
 */
const PUBLIC_PATHS = [
  // Visitor site
  "/catalog",
  "/venue",
  "/faq",
  "/feedback",
  "/guest",
  "/offline",
  "/pwa",
  "/duty/display",
  "/unauthorized",
  // Sign-in
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/patron/login",
  "/patron/register",
  // APIs that serve visitors or authenticate themselves
  "/api/auth/forgot-password",
  "/api/auth/reset-password",
  "/api/public",
  "/api/offline",
  "/api/facilities/sanity",
  "/api/push/public-key",
  "/api/webhooks",
  "/api/cron",
];

function isPublic(pathname: string) {
  if (pathname === "/") return true;
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Skip static assets early
  if (pathname.startsWith("/_next") || pathname.includes(".")) {
    return NextResponse.next();
  }

  // ── Verify JWT ─────────────────────────────────────────────────────────────
  const token = req.cookies.get("cfms_token")?.value;
  const session = token ? await verifyJWT(token) : null;

  // ── Auth gate ──────────────────────────────────────────────────────────────
  if (!session && !isPublic(pathname)) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (pathname.startsWith("/patron")) {
      const patronLogin = new URL("/patron/login", req.url);
      patronLogin.searchParams.set("from", pathname);
      return NextResponse.redirect(patronLogin);
    }
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // ── Role-based route protection ────────────────────────────────────────────
  if (session) {
    if (pathname === "/login" || pathname === "/patron/login") {
      if (session.role === "PATRON") {
        return NextResponse.redirect(new URL("/patron/dashboard", req.url));
      }
      if (session.role === "SUPER_ADMIN") {
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    // Force password change for staff with temp passwords (skip when impersonating)
    if (
      session.mustChangePassword &&
      !session.impersonatedBy &&
      session.role !== "PATRON" &&
      pathname !== "/change-password" &&
      !pathname.startsWith("/api/auth/change-password") &&
      pathname !== "/login"
    ) {
      return NextResponse.redirect(new URL("/change-password", req.url));
    }

    if (pathname.startsWith("/patron") && session.role !== "PATRON") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    if (!pathname.startsWith("/patron") && session.role === "PATRON") {
      return NextResponse.redirect(new URL("/patron/dashboard", req.url));
    }
  }

  // ── Inject headers for downstream server components / actions ──────────────
  // Always strip identity headers from the incoming request first — they are
  // trusted downstream, so a client must never be able to supply them itself.
  const requestHeaders = new Headers(req.headers);
  requestHeaders.delete("x-user-id");
  requestHeaders.delete("x-user-role");
  if (session?.sub)    requestHeaders.set("x-user-id",          session.sub);
  if (session?.role)   requestHeaders.set("x-user-role",        session.role);

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
