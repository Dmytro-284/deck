import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/db.generated";

type DB = SupabaseClient<Database>;

export interface ScoreInput {
  name?: string;
  hero: string;
  act: number;
  won: boolean;
  score: number;
  daily_date?: string | null;
  seed?: number | null;
}

export interface ScoreRow {
  id: number;
  name: string;
  hero: string;
  act: number;
  won: boolean;
  score: number;
  daily_date: string | null;
  seed: number | null;
  created_at: string;
}

/** Record a finished run on the leaderboard. */
export async function submitScore(db: DB, userId: string, s: ScoreInput): Promise<void> {
  await db.from("deckforge_scores").insert({
    user_id: userId,
    name: s.name ?? "Безіменний",
    hero: s.hero,
    act: s.act,
    won: s.won,
    score: s.score,
    daily_date: s.daily_date ?? null,
    seed: s.seed ?? null,
  });
}

/**
 * Top scores, highest first. Pass a `daily` date for that day's board; omit for
 * the all-time board (rows with no daily_date).
 */
export async function topScores(db: DB, daily?: string, limit = 50): Promise<ScoreRow[]> {
  let q = db
    .from("deckforge_scores")
    .select("id,name,hero,act,won,score,daily_date,seed,created_at")
    .order("score", { ascending: false })
    .limit(limit);
  q = daily ? q.eq("daily_date", daily) : q.is("daily_date", null);
  const { data } = await q;
  return (data as ScoreRow[] | null) ?? [];
}
