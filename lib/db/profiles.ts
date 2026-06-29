import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/db.generated";
import type { PlayerProfile } from "@/core";
import { normalizeProfile } from "@/core";

type DB = SupabaseClient<Database>;

// The persistent player profile (meta progression) lives in the existing
// deckforge_saves.meta jsonb column under `profile`, so it shares the per-user
// row with the cloud run save without needing a new table. Run-save and
// profile-save upsert disjoint columns, so they don't clobber each other.

/** Read the player's profile, or null when none stored yet. */
export async function loadCloudProfile(db: DB, userId: string): Promise<PlayerProfile | null> {
  const { data } = await db
    .from("deckforge_saves")
    .select("meta")
    .eq("user_id", userId)
    .maybeSingle();
  const meta = (data?.meta ?? null) as { profile?: unknown } | null;
  return meta?.profile ? normalizeProfile(meta.profile) : null;
}

/** Upsert the player's profile (leaves the run column untouched). */
export async function saveCloudProfile(db: DB, userId: string, profile: PlayerProfile): Promise<void> {
  await db.from("deckforge_saves").upsert(
    {
      user_id: userId,
      meta: { profile } as unknown as Database["public"]["Tables"]["deckforge_saves"]["Insert"]["meta"],
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
}
