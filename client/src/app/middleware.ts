import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const token = req.cookies.get("auth_token");
  const { pathname } = req.nextUrl;

  // ✅ Allow public routes without authentication
  const publicPaths = ["/login", "/signup"]; // add any other public paths here
  if (publicPaths.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // 🔒 Protect everything else
  if (!token) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/:path*"], // run on all routes
};
