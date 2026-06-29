import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/db.generated";

type DB = SupabaseClient<Database>;

/**
 * Called on every account-creation path. Deckforge has no per-subsystem rows to
 * seed (the cloud save is created lazily on first save), so this is currently a
 * no-op — kept as the single hook for any future per-user bootstrapping.
 */
export async function bootstrapPlayer(_db: DB, _userId: string): Promise<void> {
  // intentionally empty
}
