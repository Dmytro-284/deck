import { NextRequest, NextResponse } from "next/server";
import { serviceClient } from "@/lib/supabase/service";
import { makeSessionCookie, newId, parseCookies, verify } from "@/lib/auth/session";
import { bootstrapPlayer } from "@/lib/db/bootstrap";
import { withinRestoreWindow } from "@/lib/auth/account-deletion";
import { DISPLAY_NAME_MAX } from "@/lib/auth/profile";
import { baseUrl } from "@/lib/base-url";

export async function GET(req: NextRequest) {
  const base = baseUrl(req);
  if (!process.env.SESSION_SECRET || !process.env.SUPABASE_SERVICE_KEY) {
    return NextResponse.redirect(`${base}/?auth_error=server_config`);
  }
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");
  if (error || !code) return NextResponse.redirect(`${base}/?auth_error=google_cancelled`);

  // CSRF: the state echoed by Google must match the one in the signed flow cookie.
  const clearFlow = "g_oauth=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0";
  const cookies = parseCookies(req.headers.get("cookie") || "");
  const flow = cookies["g_oauth"]
    ? (verify(cookies["g_oauth"]) as { s?: string; link?: string } | null)
    : null;
  if (!flow || !flow.s || flow.s !== state) {
    return NextResponse.redirect(`${base}/?auth_error=google_state`, {
      headers: { "Set-Cookie": clearFlow },
    });
  }

  const db = serviceClient();
  const redirectUri = `${base}/api/auth/google/callback`;

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });
  if (!tokenRes.ok) return NextResponse.redirect(`${base}/?auth_error=google_token`);
  const tokenData = (await tokenRes.json()) as { access_token: string };

  const profileRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });
  if (!profileRes.ok) return NextResponse.redirect(`${base}/?auth_error=google_profile`);
  const profile = (await profileRes.json()) as { id: string; email: string; name?: string };

  const now = new Date().toISOString();

  // Link mode — attach Google to the signed-in account.
  if (flow.link) {
    const { data: owner } = await db.from("users").select("id").eq("google_id", profile.id).maybeSingle();
    if (owner && owner.id !== flow.link) {
      return NextResponse.redirect(`${base}/settings?link_error=google_taken`, { headers: { "Set-Cookie": clearFlow } });
    }
    await db.from("users").update({ google_id: profile.id }).eq("id", flow.link);
    return NextResponse.redirect(`${base}/settings?linked=google`, { headers: { "Set-Cookie": clearFlow } });
  }

  // Login / create.
  let user: { id: string; email: string | null; role: string };
  const { data: byGoogle } = await db
    .from("users")
    .select("id,email,role,status,deleted_at")
    .eq("google_id", profile.id)
    .maybeSingle();

  if (byGoogle) {
    if (byGoogle.status === "deleted" && !withinRestoreWindow(byGoogle.deleted_at)) {
      return NextResponse.redirect(`${base}/?auth_error=account_deleted`);
    }
    await db
      .from("users")
      .update({ last_login: now, provider: "google", status: "active", deleted_at: null })
      .eq("id", byGoogle.id);
    user = byGoogle;
  } else {
    const email = profile.email.toLowerCase();
    const { data: byEmail } = await db
      .from("users")
      .select("id,email,role,status,deleted_at")
      .eq("email", email)
      .maybeSingle();
    if (byEmail) {
      if (byEmail.status === "deleted" && !withinRestoreWindow(byEmail.deleted_at)) {
        return NextResponse.redirect(`${base}/?auth_error=account_deleted`);
      }
      await db
        .from("users")
        .update({ google_id: profile.id, provider: "google", last_login: now, status: "active", deleted_at: null })
        .eq("id", byEmail.id);
      user = byEmail;
    } else {
      const uid = newId();
      const { error: insErr } = await db.from("users").insert({
        id: uid,
        email,
        display_name: (profile.name || email.split("@")[0]).slice(0, DISPLAY_NAME_MAX),
        role: "user",
        status: "active",
        provider: "google",
        google_id: profile.id,
        created_at: now,
        last_login: now,
      });
      if (insErr) {
        console.error("Google user insert failed:", insErr);
        return NextResponse.redirect(`${base}/?auth_error=db`);
      }
      await bootstrapPlayer(db, uid);
      user = { id: uid, email, role: "user" };
    }
  }

  return new NextResponse(null, {
    status: 302,
    headers: { Location: `${base}/play`, "Set-Cookie": makeSessionCookie(user) },
  });
}
