import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { serviceClient } from "@/lib/supabase/service";
import { SESSION_COOKIE, verify } from "@/lib/auth/session";

export interface SessionUser {
  id: string;
  email: string | null;
  role: string;
}

/** Read + verify the session cookie in a Server Component / Server Action. */
export async function readSession(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const payload = verify(token);
  if (!payload) return null;
  return {
    id: String(payload.sub),
    email: (payload.email as string | null) ?? null,
    role: String(payload.role ?? "user"),
  };
}

/** Returns the service-role client + session user, or redirects to /login. */
export async function requireUser(): Promise<{
  supabase: ReturnType<typeof serviceClient>;
  user: SessionUser;
}> {
  const user = await readSession();
  if (!user) redirect("/");
  if (!process.env.SUPABASE_SERVICE_KEY) redirect("/?auth_error=server_config");

  const supabase = serviceClient();
  // Guard against orphaned/stale sessions (cookie present but the user row is
  // gone or deleted) so authed pages never crash on missing data.
  const { data: row } = await supabase
    .from("users")
    .select("id,status")
    .eq("id", user.id)
    .maybeSingle();
  if (!row || row.status === "deleted") redirect("/");

  return { supabase, user };
}
