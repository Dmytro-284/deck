// Client shim for the persistent player profile (meta progression). Mirrors
// lib/cloud.ts: localStorage is the instant cache, the cloud (/api/profile) is
// the source of truth across devices. Every cloud call degrades gracefully.
import { normalizeProfile, type PlayerProfile } from "@/core";

const KEY = "deckforge_profile_v1";

export function loadProfileLocal(): PlayerProfile | null {
  try {
    const s = localStorage.getItem(KEY);
    return s ? normalizeProfile(JSON.parse(s)) : null;
  } catch {
    return null;
  }
}

function saveProfileLocal(p: PlayerProfile) {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {}
}

/** Pull the cloud profile (null when none / not signed in / offline). */
export async function cloudLoadProfile(): Promise<PlayerProfile | null> {
  try {
    const d = await fetch("/api/profile").then((r) => r.json());
    return d?.profile ? normalizeProfile(d.profile) : null;
  } catch {
    return null;
  }
}

async function cloudSaveProfile(p: PlayerProfile): Promise<void> {
  try {
    await fetch("/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profile: p }),
    });
  } catch {
    /* offline — localStorage remains the cache */
  }
}

// Debounced writer so frequent profile updates collapse into one network call.
let pending: ReturnType<typeof setTimeout> | null = null;
let last: PlayerProfile | null = null;

/** Persist a profile to localStorage (instant) and the cloud (debounced). */
export function saveProfile(p: PlayerProfile, ms = 1200): void {
  saveProfileLocal(p);
  last = p;
  if (pending) clearTimeout(pending);
  pending = setTimeout(() => {
    pending = null;
    if (last) void cloudSaveProfile(last);
  }, ms);
}
