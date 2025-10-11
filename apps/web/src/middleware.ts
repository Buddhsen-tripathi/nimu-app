import { NextRequest, NextResponse } from "next/server";
import { auth } from "./lib/auth";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public routes
  if (
    pathname === "/" ||
    pathname.startsWith("/api/auth/") ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.startsWith("/public/")
  ) {
    return NextResponse.next();
  }

  // Protect dashboard routes
  if (pathname.startsWith("/dashboard")) {
    try {
      // Convert Next.js headers to a format Better Auth can use
      const headers = new Headers();
      request.headers.forEach((value, key) => {
        headers.set(key, value);
      });

      const session = await auth.api.getSession({
        headers,
      });

      // If no session, redirect to landing page with login modal
      if (!session) {
        const url = request.nextUrl.clone();
        url.pathname = "/";
        url.searchParams.set("auth", "login");
        return NextResponse.redirect(url);
      }

      // User is authenticated, allow access
      return NextResponse.next();
    } catch (error) {
      console.error("Auth middleware error:", error);
      // On error, redirect to login
      const url = request.nextUrl.clone();
      url.pathname = "/";
      url.searchParams.set("auth", "login");
      return NextResponse.redirect(url);
    }
  }

  // For all other routes, allow access
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
