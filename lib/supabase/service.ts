import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/db.generated";

/**
 * Server-only Supabase client using the service-role key. All DB access goes
 * through this (RLS is bypassed); gating happens in our API routes / server
 * actions via the signed session cookie. Never import this into client code.
 *
 * Memoized per process: the client is stateless (service role, no session).
 */
let _client: SupabaseClient<Database> | null = null;

export function serviceClient(): SupabaseClient<Database> {
  if (_client) return _client;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    throw new Error("Supabase service env vars missing (SUPABASE_URL / SUPABASE_SERVICE_KEY).");
  }
  _client = createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return _client;
}

/**
 * Fixed-window rate limit via the atomic `check_rate_limit` RPC.
 * Returns true when ALLOWED. Fails open on any error.
 */
export async function checkRateLimit(
  db: SupabaseClient<Database>,
  action: string,
  ip: string,
  max: number,
  windowMs: number,
): Promise<boolean> {
  try {
    const { data, error } = await db.rpc("check_rate_limit", {
      p_key: `${action}:${ip}`,
      p_max: max,
      p_window_ms: windowMs,
    });
    if (error) return true;
    return data !== false;
  } catch {
    return true;
  }
}

/** Best-effort client IP from proxy headers. */
export function clientIp(headers: Headers): string {
  const xff = headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return headers.get("x-real-ip") || "unknown";
}
