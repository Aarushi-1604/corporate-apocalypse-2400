import { NextRequest, NextResponse } from "next/server";

export function proxy(request: NextRequest) {
  const token = request.cookies.get("session_token");
  const isHqRoute = request.nextUrl.pathname.startsWith("/hq");

  if (isHqRoute && !token) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/hq/:path*"],
};