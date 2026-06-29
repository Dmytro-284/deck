import { NextRequest, NextResponse } from "next/server";
import { serviceClient } from "@/lib/supabase/service";
import { parseCookies, verify } from "@/lib/auth/session";
import { loadCloudProfile, saveCloudProfile } from "@/lib/db/profiles";
import { normalizeProfile, type PlayerProfile } from "@/core";

function uid(req: NextRequest): string | null {
  const cookies = parseCookies(req.headers.get("cookie") || "");
  const payload = cookies["session"] ? verify(cookies["session"]) : null;
  return payload ? String(payload.sub) : null;
}

/** Load the signed-in player's meta profile. */
export async function GET(req: NextRequest) {
  const id = uid(req);
  if (!id) return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
  const profile = await loadCloudProfile(serviceClient(), id);
  return NextResponse.json({ ok: true, profile });
}

/** Persist the player's meta profile. */
export async function PUT(req: NextRequest) {
  const id = uid(req);
  if (!id) return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
  const body = await req.json().catch(() => null);
  if (!body?.profile) return NextResponse.json({ ok: false, error: "Missing profile" }, { status: 400 });
  // Re-normalise server-side so a tampered client can't inject junk.
  await saveCloudProfile(serviceClient(), id, normalizeProfile(body.profile as PlayerProfile));
  return NextResponse.json({ ok: true });
}
