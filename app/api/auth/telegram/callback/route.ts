import { NextRequest, NextResponse } from "next/server";
import { createPublicKey, verify as cryptoVerify, type KeyObject } from "node:crypto";
import { serviceClient } from "@/lib/supabase/service";
import { makeSessionCookie, newId, parseCookies, verify } from "@/lib/auth/session";
import { bootstrapPlayer } from "@/lib/db/bootstrap";
import { withinRestoreWindow } from "@/lib/auth/account-deletion";
import { DISPLAY_NAME_MAX } from "@/lib/auth/profile";
import { baseUrl } from "@/lib/base-url";

const TOKEN_ENDPOINT = "https://oauth.telegram.org/token";
const JWKS_ENDPOINT = "https://oauth.telegram.org/.well-known/jwks.json";
const ISSUER = "https://oauth.telegram.org";

function b64urlToJson(seg: string): Record<string, unknown> {
  return JSON.parse(Buffer.from(seg, "base64url").toString("utf8"));
}

async function verifyIdToken(idToken: string, clientId: string): Promise<Record<string, unknown> | null> {
  const parts = idToken.split(".");
  if (parts.length !== 3) return null;
  const [headerB64, payloadB64, sigB64] = parts;

  let header: { kid?: string; alg?: string };
  let payload: Record<string, unknown>;
  try {
    header = b64urlToJson(headerB64) as { kid?: string; alg?: string };
    payload = b64urlToJson(payloadB64);
  } catch {
    return null;
  }

  const jwksRes = await fetch(JWKS_ENDPOINT, { cache: "no-store" });
  if (!jwksRes.ok) return null;
  const { keys } = (await jwksRes.json()) as { keys: Array<Record<string, unknown> & { kid?: string; alg?: string }> };
  const jwk = keys.find((k) => k.kid === header.kid) || keys.find((k) => k.alg === header.alg);
  if (!jwk) return null;

  let key: KeyObject;
  try {
    key = createPublicKey({ key: jwk as never, format: "jwk" });
  } catch {
    return null;
  }

  const signingInput = Buffer.from(`${headerB64}.${payloadB64}`);
  const signature = Buffer.from(sigB64, "base64url");

  let ok = false;
  try {
    if (header.alg === "RS256") {
      ok = cryptoVerify("RSA-SHA256", signingInput, key, signature);
    } else if (header.alg === "ES256") {
      ok = cryptoVerify("SHA256", signingInput, { key, dsaEncoding: "ieee-p1363" }, signature);
    } else {
      return null;
    }
  } catch {
    return null;
  }
  if (!ok) return null;

  if (payload.iss !== ISSUER) return null;
  const aud = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
  if (!aud.map(String).includes(String(clientId))) return null;
  if (typeof payload.exp === "number" && Date.now() / 1000 > payload.exp) return null;

  return payload;
}

export async function GET(req: NextRequest) {
  const base = baseUrl(req);
  if (!process.env.SESSION_SECRET || !process.env.SUPABASE_SERVICE_KEY) {
    return NextResponse.redirect(`${base}/?auth_error=server_config`);
  }
  const { searchParams } = new URL(req.url);
  const clientId = process.env.TELEGRAM_CLIENT_ID;
  const clientSecret = process.env.TELEGRAM_CLIENT_SECRET;
  if (!clientId || !clientSecret) return NextResponse.redirect(`${base}/?auth_error=telegram_config`);

  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");
  if (error || !code) return NextResponse.redirect(`${base}/?auth_error=telegram_cancelled`);

  const cookies = parseCookies(req.headers.get("cookie") || "");
  const flow = cookies["tg_oidc"] ? (verify(cookies["tg_oidc"]) as { v?: string; s?: string; link?: string } | null) : null;
  if (!flow || flow.s !== state || !flow.v) {
    return NextResponse.redirect(`${base}/?auth_error=telegram_state`);
  }

  const redirectUri = `${base}/api/auth/telegram/callback`;
  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const tokenRes = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Authorization: `Basic ${basic}` },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      client_id: clientId,
      code_verifier: flow.v,
    }),
  });
  if (!tokenRes.ok) return NextResponse.redirect(`${base}/?auth_error=telegram_token`);
  const tokenData = (await tokenRes.json()) as { id_token?: string };
  if (!tokenData.id_token) return NextResponse.redirect(`${base}/?auth_error=telegram_token`);

  const claims = await verifyIdToken(tokenData.id_token, clientId);
  if (!claims) return NextResponse.redirect(`${base}/?auth_error=telegram_idtoken`);

  const tgId = String(claims.sub ?? claims.id ?? "");
  if (!tgId) return NextResponse.redirect(`${base}/?auth_error=telegram_idtoken`);

  const db = serviceClient();
  const now = new Date().toISOString();
  const clearFlow = "tg_oidc=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0";

  // Link mode.
  if (flow.link) {
    const { data: owner } = await db.from("users").select("id").eq("telegram_id", tgId).maybeSingle();
    if (owner && owner.id !== flow.link) {
      return NextResponse.redirect(`${base}/settings?link_error=telegram_taken`, { headers: { "Set-Cookie": clearFlow } });
    }
    await db.from("users").update({ telegram_id: tgId }).eq("id", flow.link);
    return NextResponse.redirect(`${base}/settings?linked=telegram`, { headers: { "Set-Cookie": clearFlow } });
  }

  const email = `${tgId}@telegram.user`;
  let user: { id: string; email: string | null; role: string };

  const { data: byTg } = await db
    .from("users")
    .select("id,email,role,status,deleted_at")
    .eq("telegram_id", tgId)
    .maybeSingle();
  if (byTg) {
    if (byTg.status === "deleted" && !withinRestoreWindow(byTg.deleted_at)) {
      return NextResponse.redirect(`${base}/?auth_error=account_deleted`);
    }
    await db
      .from("users")
      .update({ last_login: now, provider: "telegram", status: "active", deleted_at: null })
      .eq("id", byTg.id);
    user = byTg;
  } else {
    const name = (typeof claims.name === "string" ? claims.name : `Naufrago ${tgId.slice(-4)}`).slice(
      0,
      DISPLAY_NAME_MAX,
    );
    const uid = newId();
    const { error: insErr } = await db.from("users").insert({
      id: uid,
      email,
      display_name: name,
      role: "user",
      status: "active",
      provider: "telegram",
      telegram_id: tgId,
      created_at: now,
      last_login: now,
    });
    if (insErr) {
      console.error("Telegram user insert failed:", insErr);
      return NextResponse.redirect(`${base}/?auth_error=db`, { headers: { "Set-Cookie": clearFlow } });
    }
    await bootstrapPlayer(db, uid);
    user = { id: uid, email, role: "user" };
  }

  return new NextResponse(null, {
    status: 302,
    headers: [
      ["Location", `${base}/play`],
      ["Set-Cookie", makeSessionCookie(user)],
      ["Set-Cookie", clearFlow],
    ] as unknown as HeadersInit,
  });
}
