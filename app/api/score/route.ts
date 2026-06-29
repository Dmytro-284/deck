import { NextRequest, NextResponse } from "next/server";
import { serviceClient } from "@/lib/supabase/service";
import { parseCookies, verify } from "@/lib/auth/session";
import { submitScore, topScores, type ScoreInput } from "@/lib/db/scores";

function uid(req: NextRequest): string | null {
  const cookies = parseCookies(req.headers.get("cookie") || "");
  const payload = cookies["session"] ? verify(cookies["session"]) : null;
  return payload ? String(payload.sub) : null;
}

/** Public leaderboard. `?daily=YYYY-MM-DD` for that day's board; omit for all-time. */
export async function GET(req: NextRequest) {
  const daily = new URL(req.url).searchParams.get("daily") || undefined;
  const scores = await topScores(serviceClient(), daily, 50);
  return NextResponse.json({ ok: true, scores });
}

/** Record a finished run (signed-in only). */
export async function POST(req: NextRequest) {
  const id = uid(req);
  if (!id) return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
  const body = (await req.json().catch(() => null)) as ScoreInput | null;
  if (!body || typeof body.score !== "number" || !body.hero || typeof body.act !== "number") {
    return NextResponse.json({ ok: false, error: "Invalid score" }, { status: 400 });
  }
  await submitScore(serviceClient(), id, {
    name: body.name,
    hero: body.hero,
    act: body.act,
    won: !!body.won,
    score: body.score,
    daily_date: body.daily_date ?? null,
    seed: body.seed ?? null,
  });
  return NextResponse.json({ ok: true });
}
