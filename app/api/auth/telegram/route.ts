import { NextRequest, NextResponse } from "next/server";
import { createHash, randomBytes } from "node:crypto";
import { parseCookies, sign, verify } from "@/lib/auth/session";
import { baseUrl } from "@/lib/base-url";

const AUTH_ENDPOINT = "https://oauth.telegram.org/auth";
const FLOW_TTL = 10 * 60;

function b64url(buf: Buffer) {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function GET(req: NextRequest) {
  const base = baseUrl(req);
  if (!process.env.SESSION_SECRET) return NextResponse.redirect(`${base}/?auth_error=server_config`);
  const clientId = process.env.TELEGRAM_CLIENT_ID;
  const clientSecret = process.env.TELEGRAM_CLIENT_SECRET;
  if (!clientId || !clientSecret) return NextResponse.redirect(`${base}/?auth_error=telegram_config`);

  const redirectUri = `${base}/api/auth/telegram/callback`;
  const codeVerifier = b64url(randomBytes(32));
  const codeChallenge = b64url(createHash("sha256").update(codeVerifier).digest());
  const state = b64url(randomBytes(16));

  const cookies = parseCookies(req.headers.get("cookie") || "");
  const session = cookies["session"] ? verify(cookies["session"]) : null;
  const linkUserId = session?.sub ? String(session.sub) : null;

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid profile",
    state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  });

  const flowToken = sign({ v: codeVerifier, s: state, link: linkUserId, exp: Date.now() + FLOW_TTL * 1000 });

  return new NextResponse(null, {
    status: 302,
    headers: {
      Location: `${AUTH_ENDPOINT}?${params.toString()}`,
      "Set-Cookie": `tg_oidc=${flowToken}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${FLOW_TTL}`,
    },
  });
}
