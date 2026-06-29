import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Guest play is disabled — every gameplay route requires a signed-in account.
// This is an optimistic check (cookie presence only); real verification still
// happens server-side in the API routes / requireUser. Cookie name is hardcoded
// to keep this file free of the node:crypto import in lib/auth/session.
const SESSION_COOKIE = "session";

export function proxy(request: NextRequest) {
  if (!request.cookies.has(SESSION_COOKIE)) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = { matcher: ["/play", "/play/:path*", "/achievements"] };
