import { NextRequest, NextResponse } from "next/server";
import { serviceClient } from "@/lib/supabase/service";
import { parseCookies, verify } from "@/lib/auth/session";
import { loadCloudSave, saveCloudRun, wipeCloudSave } from "@/lib/db/saves";
import type { RunState } from "@/core/state";

function uid(req: NextRequest): string | null {
  const cookies = parseCookies(req.headers.get("cookie") || "");
  const payload = cookies["session"] ? verify(cookies["session"]) : null;
  return payload ? String(payload.sub) : null;
}

/** Load the signed-in player's cloud run. */
export async function GET(req: NextRequest) {
  const id = uid(req);
  if (!id) return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
  const run = await loadCloudSave(serviceClient(), id);
  return NextResponse.json({ ok: true, run });
}

/** Persist the player's current run. */
export async function PUT(req: NextRequest) {
  const id = uid(req);
  if (!id) return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
  const body = await req.json().catch(() => null);
  if (!body?.run) return NextResponse.json({ ok: false, error: "Missing run" }, { status: 400 });
  await saveCloudRun(serviceClient(), id, body.run as RunState);
  return NextResponse.json({ ok: true });
}

/** Clear the player's run (on death / win / new game). */
export async function DELETE(req: NextRequest) {
  const id = uid(req);
  if (!id) return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
  await wipeCloudSave(serviceClient(), id);
  return NextResponse.json({ ok: true });
}
