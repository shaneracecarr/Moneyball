import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if the route needs protection
  if (pathname.startsWith("/dashboard") || pathname.startsWith("/leagues") || pathname.startsWith("/mock-draft") || pathname.startsWith("/my-teams") || pathname.startsWith("/players")) {
    // Check for session token in cookies
    const sessionToken =
      request.cookies.get("authjs.session-token")?.value ||
      request.cookies.get("__Secure-authjs.session-token")?.value;

    if (!sessionToken) {
      const url = new URL("/login", request.url);
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/leagues/:path*", "/mock-draft/:path*", "/my-teams/:path*", "/players/:path*"],
};
