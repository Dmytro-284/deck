// Persistent, cross-run player progression (the "meta" layer). Pure data + pure
// helpers — no React/DOM/IO. The store and the cloud shim own persistence; this
// file only computes the next profile from the current one. Each hero has its
// own campaign "line"; base heroes are free, higher tiers unlock with coins or
// by fully clearing the previous tier's line in the same archetype.
import type { Archetype, HeroKey, HeroTier } from "./types";
import { HEROES, HERO_GRID, HERO_TIER_ORDER } from "./content";
import { TOTAL_ACTS } from "./content";

export const PROFILE_VERSION = 1;

/** Per-hero campaign progress (the "line"). */
export interface HeroLine {
  level: number; // hero power level (1-based)
  xp: number; // xp toward the next level
  actsCleared: number; // highest act fully cleared in this line
  wins: number; // full campaign wins
}

export interface PlayerProfile {
  v: number; // schema version
  coins: number; // persistent currency for unlocks
  unlocked: HeroKey[]; // heroes the player owns
  lines: Partial<Record<HeroKey, HeroLine>>;
  achievements: string[]; // ids of earned achievements
}

/** The four free, always-available base heroes. */
export const BASE_HEROES: HeroKey[] = ["knight", "mage", "rogue", "berserk"];

/** Coin cost to unlock a hero by tier (base heroes are free). */
export const HERO_UNLOCK_COST: Record<HeroTier, number> = {
  base: 0,
  rare: 500,
  epic: 1500,
  legend: 4000,
};

export function unlockCost(hero: HeroKey): number {
  return HERO_UNLOCK_COST[HEROES[hero].htier];
}

/** A fresh profile: the four base heroes unlocked, no progress, no coins. */
export function defaultProfile(): PlayerProfile {
  return { v: PROFILE_VERSION, coins: 0, unlocked: [...BASE_HEROES], lines: {}, achievements: [] };
}

/** Normalise an unknown/older blob into a valid profile (defensive load). */
export function normalizeProfile(raw: unknown): PlayerProfile {
  const base = defaultProfile();
  if (!raw || typeof raw !== "object") return base;
  const p = raw as Partial<PlayerProfile>;
  const unlocked = Array.isArray(p.unlocked)
    ? p.unlocked.filter((k): k is HeroKey => k in HEROES)
    : [];
  // base heroes are always present
  for (const b of BASE_HEROES) if (!unlocked.includes(b)) unlocked.push(b);
  const lines: PlayerProfile["lines"] = {};
  if (p.lines && typeof p.lines === "object") {
    for (const [k, v] of Object.entries(p.lines)) {
      if (k in HEROES && v) lines[k as HeroKey] = normalizeLine(v as Partial<HeroLine>);
    }
  }
  const achievements = Array.isArray(p.achievements)
    ? p.achievements.filter((a): a is string => typeof a === "string")
    : [];
  return {
    v: PROFILE_VERSION,
    coins: Math.max(0, Math.floor(Number(p.coins) || 0)),
    unlocked,
    lines,
    achievements,
  };
}

function normalizeLine(v: Partial<HeroLine>): HeroLine {
  return {
    level: Math.max(1, Math.floor(Number(v.level) || 1)),
    xp: Math.max(0, Math.floor(Number(v.xp) || 0)),
    actsCleared: Math.max(0, Math.floor(Number(v.actsCleared) || 0)),
    wins: Math.max(0, Math.floor(Number(v.wins) || 0)),
  };
}

/** The line for a hero (a fresh zero-line if untouched). */
export function lineOf(p: PlayerProfile, hero: HeroKey): HeroLine {
  return p.lines[hero] ?? { level: 1, xp: 0, actsCleared: 0, wins: 0 };
}

export function isUnlocked(p: PlayerProfile, hero: HeroKey): boolean {
  return p.unlocked.includes(hero);
}

/* ----------------------------- progression curves ----------------------------- */

/** XP needed to advance FROM `level` to `level + 1`. */
export function xpForLevel(level: number): number {
  return 50 + (level - 1) * 50; // 50, 100, 150, …
}

/** Coins awarded for a run that reached `act` (won = full campaign clear). */
export function coinReward(act: number, won: boolean): number {
  return (won ? 200 : 0) + act * 60;
}

/** XP awarded for a run that reached `act`. */
export function xpReward(act: number, won: boolean): number {
  return (won ? 100 : 0) + act * 40;
}

/** Next tier above `tier` in the column order, or null if already legendary. */
export function nextTier(tier: HeroTier): HeroTier | null {
  const i = HERO_TIER_ORDER.indexOf(tier);
  return i >= 0 && i < HERO_TIER_ORDER.length - 1 ? HERO_TIER_ORDER[i + 1] : null;
}

/** The hero one tier above `hero` in the same archetype, or null. */
export function nextTierHero(hero: HeroKey): HeroKey | null {
  const { archetype, htier } = HEROES[hero];
  const nt = nextTier(htier);
  return nt ? HERO_GRID[archetype as Archetype][nt] : null;
}

/**
 * Fold a finished run into the profile: award coins + xp, level up, record the
 * line's best act, and — on a full campaign clear — unlock the next tier in the
 * same archetype for free ("відкриття за проходження"). Returns a new profile.
 */
export function applyRunResult(
  p: PlayerProfile,
  hero: HeroKey,
  act: number,
  won: boolean,
): PlayerProfile {
  const next: PlayerProfile = {
    ...p,
    unlocked: [...p.unlocked],
    lines: { ...p.lines },
  };
  next.coins += coinReward(act, won);

  const line = { ...lineOf(next, hero) };
  line.xp += xpReward(act, won);
  while (line.xp >= xpForLevel(line.level)) {
    line.xp -= xpForLevel(line.level);
    line.level++;
  }
  // a win clears `act` outright; a loss credits the acts below the current one
  line.actsCleared = Math.max(line.actsCleared, won ? act : act - 1);
  if (won) line.wins++;
  next.lines[hero] = line;

  // Full campaign clear unlocks the next tier in this archetype (if any).
  if (won && act >= TOTAL_ACTS) {
    const nt = nextTierHero(hero);
    if (nt && !next.unlocked.includes(nt)) next.unlocked.push(nt);
  }
  return next;
}

/** Buy a locked hero with coins. Returns the updated profile or an error. */
export function purchaseHero(
  p: PlayerProfile,
  hero: HeroKey,
): { ok: true; profile: PlayerProfile } | { ok: false; error: "owned" | "funds" } {
  if (isUnlocked(p, hero)) return { ok: false, error: "owned" };
  const cost = unlockCost(hero);
  if (p.coins < cost) return { ok: false, error: "funds" };
  return {
    ok: true,
    profile: { ...p, coins: p.coins - cost, unlocked: [...p.unlocked, hero] },
  };
}
