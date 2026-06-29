import { NextRequest, NextResponse } from "next/server";
import { serviceClient } from "@/lib/supabase/service";
import { CLEAR_SESSION_COOKIE, parseCookies, verify } from "@/lib/auth/session";

/** Current user + provider link presence (booleans only — never raw ids/hash). */
export async function GET(req: NextRequest) {
  const cookies = parseCookies(req.headers.get("cookie") || "");
  const payload = cookies["session"] ? verify(cookies["session"]) : null;
  if (!payload) return NextResponse.json({ ok: true, user: null });

  const db = serviceClient();
  const { data: u } = await db
    .from("users")
    .select("id,email,display_name,photo_url,provider,google_id,telegram_id,password_hash,status")
    .eq("id", String(payload.sub))
    .maybeSingle();

  if (!u || u.status === "deleted") return NextResponse.json({ ok: true, user: null });

  return NextResponse.json({
    ok: true,
    user: {
      id: u.id,
      email: u.email,
      displayName: u.display_name,
      photoUrl: u.photo_url,
      provider: u.provider,
      linkedGoogle: !!u.google_id,
      linkedTelegram: !!u.telegram_id,
      hasPassword: !!u.password_hash,
      isSyntheticEmail: !!u.email && u.email.endsWith("@telegram.user"),
    },
  });
}

export async function DELETE() {
  return NextResponse.json({ ok: true }, { headers: { "Set-Cookie": CLEAR_SESSION_COOKIE } });
}
