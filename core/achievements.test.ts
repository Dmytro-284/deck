import { describe, it, expect } from "vitest";
import { defaultProfile, applyRunResult, isUnlocked } from "./profile";
import {
  ACHIEVEMENTS,
  evaluateAchievements,
  totalWins,
  ACHIEVEMENT_BY_ID,
} from "./achievements";
import { TOTAL_ACTS } from "./content";

describe("achievements", () => {
  it("every achievement has a unique id and a positive goal", () => {
    const ids = new Set(ACHIEVEMENTS.map((a) => a.id));
    expect(ids.size).toBe(ACHIEVEMENTS.length);
    for (const a of ACHIEVEMENTS) {
      expect(a.progress(defaultProfile()).goal).toBeGreaterThan(0);
    }
  });

  it("a fresh profile has earned nothing", () => {
    const { earned } = evaluateAchievements(defaultProfile());
    expect(earned).toEqual([]);
  });

  it("first win earns 'first_blood' and pays coins", () => {
    const won = applyRunResult(defaultProfile(), "knight", TOTAL_ACTS, true);
    const before = won.coins;
    const { profile, earned } = evaluateAchievements(won);
    expect(earned.map((a) => a.id)).toContain("first_blood");
    expect(profile.coins).toBeGreaterThan(before);
    expect(profile.achievements).toContain("first_blood");
  });

  it("already-earned achievements aren't paid twice", () => {
    let p = applyRunResult(defaultProfile(), "knight", TOTAL_ACTS, true);
    p = evaluateAchievements(p).profile;
    const coins = p.coins;
    const second = evaluateAchievements(p);
    expect(second.earned).toEqual([]);
    expect(second.profile.coins).toBe(coins);
  });

  it("'drill_sergeant' grants a hero unlock reward", () => {
    const def = ACHIEVEMENT_BY_ID["drill_sergeant"];
    expect(def.reward.unlock).toBe("warden");
    // force all base lines to level 5
    let p = defaultProfile();
    for (const h of ["knight", "mage", "rogue", "berserk"] as const) {
      p.lines[h] = { level: 5, xp: 0, actsCleared: 0, wins: 0 };
    }
    const { profile } = evaluateAchievements(p);
    expect(isUnlocked(profile, "warden")).toBe(true);
  });

  it("totalWins sums line wins", () => {
    let p = defaultProfile();
    p = applyRunResult(p, "knight", TOTAL_ACTS, true);
    p = applyRunResult(p, "mage", TOTAL_ACTS, true);
    expect(totalWins(p)).toBe(2);
  });
});
