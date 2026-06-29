// Cloud save + leaderboard, backed by our custom-auth API routes (signed-cookie
// sessions over /api/*). Cloud sync is active only when the player is signed in
// (Google / email / Telegram); guests stay on localStorage. Every call degrades
// gracefully — network/auth errors are swallowed and localStorage stays the
// source of truth. Public API is unchanged from the old anon-Supabase version so
// the store and leaderboard UI need no changes.
import type { RunState } from "@/core/state";

interface Me {
  id: string;
  displayName: string;
  email: string | null;
}

let mePromise: Promise<Me | null> | null = null;

/** Current signed-in user (cached for the page lifetime), or null when a guest. */
function me(): Promise<Me | null> {
  if (!mePromise) {
    mePromise = fetch("/api/me")
      .then((r) => r.json())
      .then((d) => (d?.user as Me) ?? null)
      .catch(() => null);
  }
  return mePromise;
}

/** Drop the cached session (call after an explicit login/logout in-page). */
export function refreshCloudSession(): void {
  mePromise = null;
}

/** True once a signed-in session is established. */
export async function cloudEnabled(): Promise<boolean> {
  return (await me()) != null;
}

/** Pull the player's saved run from the cloud (null when none / guest). */
export async function cloudLoadRun(): Promise<RunState | null> {
  if (!(await me())) return null;
  try {
    const d = await fetch("/api/save").then((r) => r.json());
    return (d?.run as RunState) ?? null;
  } catch {
    return null;
  }
}

/** Upsert (or clear, when run is null) the player's run in the cloud. */
export async function cloudSaveRun(run: RunState | null): Promise<void> {
  if (!(await me())) return;
  try {
    if (run) {
      await fetch("/api/save", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ run }),
      });
    } else {
      await fetch("/api/save", { method: "DELETE" });
    }
  } catch {
    /* offline — localStorage remains the source of truth */
  }
}

/* ----------------------------- leaderboard ----------------------------- */

export interface ScoreEntry {
  name: string;
  hero: string;
  act: number;
  won: boolean;
  score: number;
  daily_date: string | null;
  seed: number;
}
export interface ScoreRow extends ScoreEntry {
  id: number;
  created_at: string;
}

const NAME_KEY = "deckforge_name";
export function playerName(): string {
  try {
    return localStorage.getItem(NAME_KEY) || "";
  } catch {
    return "";
  }
}
export function setPlayerName(n: string): void {
  try {
    localStorage.setItem(NAME_KEY, n.slice(0, 24));
  } catch {}
}

/** Submit a finished run to the leaderboard (best-effort, signed-in only). */
export async function cloudSubmitScore(e: ScoreEntry): Promise<void> {
  const u = await me();
  if (!u) return;
  // The account display name is the source of truth for the leaderboard nick
  // (edited in Settings); fall back to whatever the store passed in.
  const entry = { ...e, name: u.displayName || e.name };
  try {
    await fetch("/api/score", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(entry),
    });
  } catch {
    /* offline */
  }
}

/** Top scores. Pass a date for the daily board; omit for all-time runs. */
export async function cloudLoadScores(daily?: string): Promise<ScoreRow[]> {
  try {
    const url = daily ? `/api/score?daily=${encodeURIComponent(daily)}` : "/api/score";
    const d = await fetch(url).then((r) => r.json());
    return (d?.scores as ScoreRow[]) ?? [];
  } catch {
    return [];
  }
}

// Debounced writer so frequent in-combat saves collapse into one network call.
let pending: ReturnType<typeof setTimeout> | null = null;
let lastRun: RunState | null = null;
export function cloudSaveRunDebounced(run: RunState | null, ms = 1500): void {
  lastRun = run;
  if (pending) clearTimeout(pending);
  pending = setTimeout(() => {
    pending = null;
    void cloudSaveRun(lastRun);
  }, ms);
}
