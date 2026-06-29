import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/db.generated";
import type { RunState } from "@/core/state";

type DB = SupabaseClient<Database>;

/** Read the player's cloud run, or null if none / empty. */
export async function loadCloudSave(db: DB, userId: string): Promise<RunState | null> {
  const { data } = await db
    .from("deckforge_saves")
    .select("run")
    .eq("user_id", userId)
    .maybeSingle();
  return (data?.run as RunState | null) ?? null;
}

/** Upsert the player's current run. */
export async function saveCloudRun(db: DB, userId: string, run: RunState): Promise<void> {
  await db.from("deckforge_saves").upsert(
    {
      user_id: userId,
      run: run as unknown as Database["public"]["Tables"]["deckforge_saves"]["Insert"]["run"],
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
}

/** Clear the player's run (keeps the row). */
export async function wipeCloudSave(db: DB, userId: string): Promise<void> {
  await db
    .from("deckforge_saves")
    .upsert(
      { user_id: userId, run: null, updated_at: new Date().toISOString() },
      { onConflict: "user_id" },
    );
}
