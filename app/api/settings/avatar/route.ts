import { NextRequest, NextResponse } from "next/server";
import { serviceClient } from "@/lib/supabase/service";
import { parseCookies, verify } from "@/lib/auth/session";

const MAX_BYTES = 2 * 1024 * 1024; // 2 MB

/** Upload (or replace) the signed-in player's avatar. Pattern mirrors lingomare:
 *  validate image + size, upsert into the public `avatars` bucket at <uid>.<ext>,
 *  then store the cache-busted public URL on users.photo_url. */
export async function POST(req: NextRequest) {
  const cookies = parseCookies(req.headers.get("cookie") || "");
  const payload = cookies["session"] ? verify(cookies["session"]) : null;
  if (!payload) return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });

  const form = await req.formData().catch(() => null);
  const file = form?.get("avatar");
  if (!(file instanceof File)) return NextResponse.json({ ok: false, error: "No file" }, { status: 400 });
  if (!file.type.startsWith("image/"))
    return NextResponse.json({ ok: false, error: "Not an image" }, { status: 400 });
  if (file.size > MAX_BYTES)
    return NextResponse.json({ ok: false, error: "Image too large (max 2 MB)" }, { status: 413 });

  const db = serviceClient();
  // Self-provision the bucket the first time (no-op if it already exists).
  await db.storage.createBucket("avatars", { public: true }).catch(() => {});

  const ext = (file.type.split("/")[1] || "png").replace("jpeg", "jpg").replace("svg+xml", "svg");
  const path = `${String(payload.sub)}.${ext}`;
  const bytes = Buffer.from(await file.arrayBuffer());

  const { error } = await db.storage.from("avatars").upload(path, bytes, {
    contentType: file.type,
    upsert: true,
  });
  if (error) return NextResponse.json({ ok: false, error: "Upload failed" }, { status: 500 });

  const { data: pub } = db.storage.from("avatars").getPublicUrl(path);
  const url = `${pub.publicUrl}?v=${Date.now()}`; // cache-bust
  await db.from("users").update({ photo_url: url }).eq("id", String(payload.sub));

  return NextResponse.json({ ok: true, photoUrl: url });
}
