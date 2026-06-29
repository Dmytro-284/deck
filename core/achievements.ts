// Achievements — persistent milestones that pay out coins (and occasionally a
// free hero unlock). Pure data + pure evaluation; the store folds the result of
// evaluateAchievements into the profile after each campaign run. Progress is
// computed from the profile alone, so achievements are self-describing and the
// viewer can show a live progress bar.
import type { HeroKey } from "./types";
import type { PlayerProfile } from "./profile";
import { BASE_HEROES, lineOf } from "./profile";
import { HERO_KEYS, TOTAL_ACTS } from "./content";

export interface AchProgress {
  cur: number;
  goal: number;
}

export interface AchievementDef {
  id: string;
  name: string;
  desc: string;
  icon: string; // emoji
  reward: { coins?: number; unlock?: HeroKey };
  progress: (p: PlayerProfile) => AchProgress;
}

/* --------------------------- profile stat helpers --------------------------- */

export function totalWins(p: PlayerProfile): number {
  return Object.values(p.lines).reduce((s, l) => s + (l?.wins ?? 0), 0);
}
export function maxLineLevel(p: PlayerProfile): number {
  return Object.values(p.lines).reduce((m, l) => Math.max(m, l?.level ?? 1), 1);
}
export function maxActCleared(p: PlayerProfile): number {
  return Object.values(p.lines).reduce((m, l) => Math.max(m, l?.actsCleared ?? 0), 0);
}
/** Base heroes that have at least one full campaign win. */
export function basesWithWin(p: PlayerProfile): number {
  return BASE_HEROES.filter((h) => lineOf(p, h).wins > 0).length;
}
/** Base heroes whose line reached at least `lvl`. */
export function basesAtLevel(p: PlayerProfile, lvl: number): number {
  return BASE_HEROES.filter((h) => lineOf(p, h).level >= lvl).length;
}

const clamp = (cur: number, goal: number): AchProgress => ({ cur: Math.min(cur, goal), goal });

/* ------------------------------- definitions ------------------------------- */

export const ACHIEVEMENTS: AchievementDef[] = [
  {
    id: "first_blood",
    name: "Перша кров",
    desc: "Виграй свій перший забіг.",
    icon: "🩸",
    reward: { coins: 250 },
    progress: (p) => clamp(totalWins(p), 1),
  },
  {
    id: "veteran",
    name: "Ветеран",
    desc: "Виграй 5 забігів.",
    icon: "🎖",
    reward: { coins: 600 },
    progress: (p) => clamp(totalWins(p), 5),
  },
  {
    id: "conqueror",
    name: "Завойовник",
    desc: "Виграй 15 забігів.",
    icon: "👑",
    reward: { coins: 1500 },
    progress: (p) => clamp(totalWins(p), 15),
  },
  {
    id: "deep_diver",
    name: "Глибше",
    desc: `Пройди ${Math.min(2, TOTAL_ACTS)} акти в одній лінії.`,
    icon: "🕳",
    reward: { coins: 300 },
    progress: (p) => clamp(maxActCleared(p), Math.min(2, TOTAL_ACTS)),
  },
  {
    id: "the_end",
    name: "До кінця",
    desc: "Пройди всю кампанію (усі акти).",
    icon: "🏁",
    reward: { coins: 800 },
    progress: (p) => clamp(maxActCleared(p), TOTAL_ACTS),
  },
  {
    id: "leveling",
    name: "Зростання",
    desc: "Підніми будь-яку лінію до 5 рівня.",
    icon: "📈",
    reward: { coins: 400 },
    progress: (p) => clamp(maxLineLevel(p), 5),
  },
  {
    id: "ascendant",
    name: "Піднесення",
    desc: "Підніми будь-яку лінію до 10 рівня.",
    icon: "🌟",
    reward: { coins: 1200 },
    progress: (p) => clamp(maxLineLevel(p), 10),
  },
  {
    id: "collector_1",
    name: "Колекціонер",
    desc: "Розблокуй 6 героїв.",
    icon: "🗃",
    reward: { coins: 400 },
    progress: (p) => clamp(p.unlocked.length, 6),
  },
  {
    id: "collector_2",
    name: "Знавець",
    desc: "Розблокуй 12 героїв.",
    icon: "📚",
    reward: { coins: 1200 },
    progress: (p) => clamp(p.unlocked.length, 12),
  },
  {
    id: "completionist",
    name: "Повна колекція",
    desc: "Розблокуй усіх героїв.",
    icon: "💎",
    reward: { coins: 3000 },
    progress: (p) => clamp(p.unlocked.length, HERO_KEYS.length),
  },
  {
    id: "base_master",
    name: "Майстер основ",
    desc: "Виграй усіма чотирма базовими героями.",
    icon: "🛡",
    reward: { coins: 1000 },
    progress: (p) => clamp(basesWithWin(p), BASE_HEROES.length),
  },
  {
    id: "drill_sergeant",
    name: "Вишкіл",
    desc: "Доведи всі базові лінії до 5 рівня — нагорода: Страж.",
    icon: "⚔",
    reward: { coins: 0, unlock: "warden" },
    progress: (p) => clamp(basesAtLevel(p, 5), BASE_HEROES.length),
  },
];

export const ACHIEVEMENT_BY_ID: Record<string, AchievementDef> = Object.fromEntries(
  ACHIEVEMENTS.map((a) => [a.id, a]),
);

export function isAchieved(def: AchievementDef, p: PlayerProfile): boolean {
  const { cur, goal } = def.progress(p);
  return cur >= goal;
}

/**
 * Grant every newly-satisfied, unclaimed achievement, paying out coins / hero
 * unlocks. Runs to a fixpoint so a reward that pushes another threshold (e.g. an
 * unlock bumping the collector count) chains in the same pass. Returns the new
 * profile and the list of achievements earned this call (for UI feedback).
 */
export function evaluateAchievements(p: PlayerProfile): {
  profile: PlayerProfile;
  earned: AchievementDef[];
} {
  let next = p;
  const earned: AchievementDef[] = [];
  let changed = true;
  while (changed) {
    changed = false;
    for (const def of ACHIEVEMENTS) {
      if (next.achievements.includes(def.id)) continue;
      if (!isAchieved(def, next)) continue;
      const unlocked =
        def.reward.unlock && !next.unlocked.includes(def.reward.unlock)
          ? [...next.unlocked, def.reward.unlock]
          : next.unlocked;
      next = {
        ...next,
        coins: next.coins + (def.reward.coins ?? 0),
        unlocked,
        achievements: [...next.achievements, def.id],
      };
      earned.push(def);
      changed = true;
    }
  }
  return { profile: next, earned };
}
