import { describe, it, expect } from "vitest";
import {
  defaultProfile,
  applyRunResult,
  purchaseHero,
  unlockCost,
  isUnlocked,
  lineOf,
  normalizeProfile,
  nextTierHero,
  BASE_HEROES,
} from "./profile";
import { TOTAL_ACTS } from "./content";

describe("player profile", () => {
  it("default profile unlocks the four base heroes, nothing else", () => {
    const p = defaultProfile();
    expect(p.coins).toBe(0);
    expect(p.unlocked.sort()).toEqual([...BASE_HEROES].sort());
    expect(isUnlocked(p, "paladin")).toBe(false);
  });

  it("base heroes are free, higher tiers cost more by tier", () => {
    expect(unlockCost("knight")).toBe(0);
    expect(unlockCost("paladin")).toBeGreaterThan(0);
    expect(unlockCost("champion")).toBeGreaterThan(unlockCost("paladin"));
  });

  it("applyRunResult awards coins + xp and records the act", () => {
    const p0 = defaultProfile();
    const p1 = applyRunResult(p0, "knight", 2, false);
    expect(p1.coins).toBeGreaterThan(0);
    expect(lineOf(p1, "knight").actsCleared).toBe(1); // loss credits acts below
    expect(p0.coins).toBe(0); // input untouched (pure)
  });

  it("levels up when xp crosses the threshold", () => {
    let p = defaultProfile();
    for (let i = 0; i < 6; i++) p = applyRunResult(p, "mage", 3, true);
    expect(lineOf(p, "mage").level).toBeGreaterThan(1);
  });

  it("nextTierHero walks the archetype column", () => {
    expect(nextTierHero("knight")).toBe("paladin");
    expect(nextTierHero("champion")).toBeNull(); // legendary has no next
  });

  it("full campaign clear unlocks the next tier for free", () => {
    const p0 = defaultProfile();
    const p1 = applyRunResult(p0, "knight", TOTAL_ACTS, true);
    expect(isUnlocked(p1, "paladin")).toBe(true);
  });

  it("purchaseHero spends coins and unlocks; rejects when broke", () => {
    const p0 = { ...defaultProfile(), coins: unlockCost("paladin") };
    const ok = purchaseHero(p0, "paladin");
    expect(ok.ok).toBe(true);
    if (ok.ok) {
      expect(ok.profile.coins).toBe(0);
      expect(isUnlocked(ok.profile, "paladin")).toBe(true);
    }
    const broke = purchaseHero(defaultProfile(), "champion");
    expect(broke.ok).toBe(false);
  });

  it("normalizeProfile repairs junk and keeps base heroes", () => {
    const p = normalizeProfile({ coins: -5, unlocked: ["bogus"], lines: { knight: { level: 0 } } });
    expect(p.coins).toBe(0);
    expect(p.unlocked).toContain("knight");
    expect(p.unlocked).not.toContain("bogus");
    expect(lineOf(p, "knight").level).toBe(1);
  });
});
