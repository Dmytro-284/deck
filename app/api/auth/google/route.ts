import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { parseCookies, sign, verify } from "@/lib/auth/session";
import { baseUrl } from "@/lib/base-url";

const FLOW_TTL = 10 * 60;

export async function GET(req: NextRequest) {
  const base = baseUrl(req);
  if (!process.env.SESSION_SECRET) return NextResponse.redirect(`${base}/?auth_error=server_config`);
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) return NextResponse.redirect(`${base}/?auth_error=google_config`);

  const redirectUri = `${base}/api/auth/google/callback`;

  // Link mode: if already signed in, attach Google to the current account.
  const cookies = parseCookies(req.headers.get("cookie") || "");
  const session = cookies["session"] ? verify(cookies["session"]) : null;
  const linkUserId = session?.sub ? String(session.sub) : null;

  // CSRF state: random nonce echoed back by Google and matched against the signed
  // flow cookie in the callback.
  const state = randomBytes(16).toString("base64url");

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    access_type: "online",
    prompt: "select_account",
    state,
  });

  const res = NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
  const flow = sign({ s: state, link: linkUserId, exp: Date.now() + FLOW_TTL * 1000 });
  res.headers.set("Set-Cookie", `g_oauth=${flow}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${FLOW_TTL}`);
  return res;
}
