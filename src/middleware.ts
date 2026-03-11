import { NextRequest, NextResponse } from "next/server";
import { verifyJWT } from "@/lib/auth/session";

const PUBLIC_PATHS = [
  "/",
  "/catalog",
  "/guest",
  "/pay",
  "/pwa",
  "/login",
  "/register",
  "/patron/login",
  "/patron/register",
  "/api/webhooks",
  "/api/payments/callback",
  "/_next",
  "/favicon.ico",
  "/robots.txt",
];

function isPublic(pathname: string) {
  return PUBLIC_PATHS.some((p) => pathname.startsWith(p));
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

    // Force password change for staff with temp passwords
    if (
      session.mustChangePassword &&
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
  const requestHeaders = new Headers(req.headers);
  if (session?.sub)    requestHeaders.set("x-user-id",          session.sub);
  if (session?.role)   requestHeaders.set("x-user-role",        session.role);

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
