// Browser Supabase client. The publishable (anon) key is public by design —
// safe to ship to the client; row-level security guards the data.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url =
  process.env.NEXT_PUBLIC_SUPABASE_URL ??
  "https://ikicfkfscigshglvtpws.supabase.co";
const key =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  "sb_publishable_e48hQAkAB8-t2DpbrfAQaQ_0hquGokr";

export const supabase: SupabaseClient | null =
  url && key
    ? createClient(url, key, {
        auth: { persistSession: true, autoRefreshToken: true },
      })
    : null;
