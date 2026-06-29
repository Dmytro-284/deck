import { describe, it, expect } from "vitest";
import { makeRng } from "./rng";
import {
  createRun,
  startCombat,
  playCard,
  endTurn,
  aliveIdx,
  allDead,
  relicSum,
  genMap,
  reachable,
  upgradeCard,
} from "./engine";
import type { CombatState, RunState } from "./state";
import type { Card } from "./types";
import {
  HERO_KEYS,
  RELIC_BY_ID,
  ENCOUNTERS,
  TOTAL_ACTS,
  SPRITES,
} from "./content";

// helper: put a single known card in hand, return its index
function giveCard(c: CombatState, card: Card): number {
  c.hand.push({ ...card });
  return c.hand.length - 1;
}

// Force a specific d20 while keeping the rest of the stream real, so damage
// assertions stay deterministic under the d20 to-hit system. Default 15 = a
// normal full hit (mult 1), preserving the pre-d20 expected numbers.
function rng(seed: number, die = 15) {
  return { ...makeRng(seed), d20: () => die };
}

const ATK6: Card = {
  n: "T",
  t: "atk",
  cost: 1,
  art: "x",
  tier: "c",
  effects: [{ k: "damage", v: 6 }],
};

describe("rng determinism", () => {
  it("same seed -> same sequence", () => {
    const a = makeRng(42);
    const b = makeRng(42);
    const seqA = Array.from({ length: 5 }, () => a.next());
    const seqB = Array.from({ length: 5 }, () => b.next());
    expect(seqA).toEqual(seqB);
  });
  it("different seeds diverge", () => {
    expect(makeRng(1).next()).not.toEqual(makeRng(2).next());
  });
  it("shuffle is deterministic per seed", () => {
    const s1 = makeRng(7).shuffle([1, 2, 3, 4, 5]);
    const s2 = makeRng(7).shuffle([1, 2, 3, 4, 5]);
    expect(s1).toEqual(s2);
  });
});

describe("relicSum", () => {
  it("sums effect across owned relics", () => {
    expect(relicSum(["toch"], "atkBonus")).toBe(2); // Точило +2
    expect(relicSum(["toch", "rune"], "atkBonus")).toBe(5); // +2 +3
    expect(relicSum(["krug"], "atkBonus")).toBe(0);
  });
});

function freshRun(cls: RunState["cls"] = "knight"): RunState {
  return createRun(cls, 123, makeRng(123));
}

describe("combat setup", () => {
  it("draws 5, energy = maxEnergy, applies start relics", () => {
    const run = freshRun("knight"); // knight starts with 'krug' = +6 block
    const c = startCombat(run, "normal", makeRng(1));
    expect(c.hand.length).toBe(5);
    expect(c.energy).toBe(3);
    expect(c.maxEnergy).toBe(3);
    expect(c.pBlock).toBe(6);
    expect(c.draw.length + c.hand.length).toBe(run.deck.length);
  });
});

describe("playCard — attack", () => {
  it("deals damage to current target through block", () => {
    const run = freshRun("mage");
    const c = startCombat(run, "normal", makeRng(2));
    c.pStr = 0; // isolate base damage from relic-granted strength
    c.enemies = [
      { n: "E", spr: "slime", hp: 20, max: 20, block: 2, pois: 0, it: [{ t: "atk", v: 1 }], ii: 0, dead: false },
    ];
    const idx = giveCard(c, ATK6);
    const r = playCard(c, run, idx, rng(2));
    expect(r.result).toBe("continue");
    // 6 dmg - 2 block = 4 -> hp 16
    expect(c.enemies[0].hp).toBe(16);
    expect(c.enemies[0].block).toBe(0);
  });

  it("strength buffs damage", () => {
    const run = freshRun("mage");
    const c = startCombat(run, "normal", makeRng(3));
    c.pStr = 3;
    c.enemies = [
      { n: "E", spr: "slime", hp: 20, max: 20, block: 0, pois: 0, it: [{ t: "atk", v: 1 }], ii: 0, dead: false },
    ];
    const idx = giveCard(c, ATK6);
    playCard(c, run, idx, rng(3));
    expect(c.enemies[0].hp).toBe(11); // 20 - (6+3)
  });

  it("multi-hit applies v per hit", () => {
    const run = freshRun("mage");
    const c = startCombat(run, "normal", makeRng(4));
    c.pStr = 0;
    c.enemies = [
      { n: "E", spr: "slime", hp: 30, max: 30, block: 0, pois: 0, it: [{ t: "atk", v: 1 }], ii: 0, dead: false },
    ];
    const idx = giveCard(c, {
      n: "S",
      t: "atk",
      cost: 1,
      art: "x",
      tier: "c",
      effects: [{ k: "damage", v: 4, hits: 2 }],
    });
    playCard(c, run, idx, rng(4));
    expect(c.enemies[0].hp).toBe(22); // 30 - 4*2
  });

  it("aoe hits all living enemies", () => {
    const run = freshRun("mage");
    const c = startCombat(run, "normal", makeRng(5));
    c.pStr = 0;
    c.enemies = [
      { n: "A", spr: "slime", hp: 10, max: 10, block: 0, pois: 0, it: [{ t: "atk", v: 1 }], ii: 0, dead: false },
      { n: "B", spr: "slime", hp: 10, max: 10, block: 0, pois: 0, it: [{ t: "atk", v: 1 }], ii: 0, dead: false },
    ];
    const idx = giveCard(c, {
      n: "Boom",
      t: "atk",
      cost: 2,
      art: "x",
      tier: "u",
      effects: [{ k: "damage", v: 5, aoe: true }],
    });
    playCard(c, run, idx, rng(5));
    expect(c.enemies[0].hp).toBe(5);
    expect(c.enemies[1].hp).toBe(5);
  });

  it("killing all enemies returns win", () => {
    const run = freshRun("mage");
    const c = startCombat(run, "normal", makeRng(6));
    c.enemies = [
      { n: "E", spr: "slime", hp: 4, max: 4, block: 0, pois: 0, it: [{ t: "atk", v: 1 }], ii: 0, dead: false },
    ];
    const idx = giveCard(c, ATK6);
    const r = playCard(c, run, idx, rng(6));
    expect(r.result).toBe("win");
    expect(allDead(c)).toBe(true);
  });
});

describe("playCard — block/heal/poison/str", () => {
  it("block adds player block, costs energy", () => {
    const run = freshRun("mage");
    const c = startCombat(run, "normal", makeRng(7));
    c.pBlock = 0;
    c.energy = 3;
    const idx = giveCard(c, {
      n: "Blk",
      t: "blk",
      cost: 1,
      art: "x",
      tier: "c",
      effects: [{ k: "block", v: 5 }],
    });
    playCard(c, run, idx, makeRng(7));
    expect(c.pBlock).toBe(5);
    expect(c.energy).toBe(2);
  });

  it("heal clamps to pMax", () => {
    const run = freshRun("knight");
    run.pHp = run.pMax - 3;
    const c = startCombat(run, "normal", makeRng(8));
    const idx = giveCard(c, {
      n: "Heal",
      t: "heal",
      cost: 1,
      art: "x",
      tier: "u",
      effects: [{ k: "heal", v: 9 }],
    });
    playCard(c, run, idx, makeRng(8));
    expect(run.pHp).toBe(run.pMax);
  });

  it("poison stacks on target, applied as tick on endTurn", () => {
    const run = freshRun("mage");
    const c = startCombat(run, "normal", makeRng(9));
    c.enemies = [
      { n: "E", spr: "slime", hp: 20, max: 20, block: 0, pois: 0, it: [{ t: "blk", v: 0 }], ii: 0, dead: false },
    ];
    const idx = giveCard(c, {
      n: "Pois",
      t: "poison",
      cost: 1,
      art: "x",
      tier: "u",
      effects: [{ k: "poison", v: 7 }],
    });
    playCard(c, run, idx, makeRng(9));
    expect(c.enemies[0].pois).toBe(7);
    endTurn(c, run, makeRng(9));
    // tick deals 7, poison decremented to 6
    expect(c.enemies[0].hp).toBe(13);
    expect(c.enemies[0].pois).toBe(6);
  });
});

describe("endTurn — enemy actions", () => {
  it("enemy attack damages player through block", () => {
    const run = freshRun("mage");
    const c = startCombat(run, "normal", makeRng(10));
    run.pHp = 50;
    c.pBlock = 4;
    c.enemies = [
      { n: "E", spr: "slime", hp: 30, max: 30, block: 0, pois: 0, it: [{ t: "atk", v: 10 }], ii: 0, dead: false },
    ];
    const r = endTurn(c, run, rng(10));
    expect(r.result).toBe("continue");
    expect(run.pHp).toBe(44); // 50 - (10-4)
    expect(c.pBlock).toBe(0); // reset for new turn
    expect(c.energy).toBe(c.maxEnergy);
  });

  it("lethal enemy hit returns lose", () => {
    const run = freshRun("mage");
    const c = startCombat(run, "normal", makeRng(11));
    run.pHp = 5;
    c.pBlock = 0;
    c.enemies = [
      { n: "E", spr: "slime", hp: 30, max: 30, block: 0, pois: 0, it: [{ t: "atk", v: 99 }], ii: 0, dead: false },
    ];
    const r = endTurn(c, run, rng(11));
    expect(r.result).toBe("lose");
    expect(run.pHp).toBe(0);
  });

  it("enemy block intent raises enemy block and advances intent", () => {
    const run = freshRun("mage");
    const c = startCombat(run, "normal", makeRng(12));
    c.enemies = [
      { n: "E", spr: "slime", hp: 30, max: 30, block: 0, pois: 0, it: [{ t: "blk", v: 8 }, { t: "atk", v: 5 }], ii: 0, dead: false },
    ];
    endTurn(c, run, makeRng(12));
    expect(c.enemies[0].block).toBe(8);
    expect(c.enemies[0].ii).toBe(1); // advanced
  });

  it("poison can kill before enemy acts -> win, no player damage", () => {
    const run = freshRun("mage");
    const c = startCombat(run, "normal", makeRng(13));
    run.pHp = 100;
    c.enemies = [
      { n: "E", spr: "slime", hp: 3, max: 3, block: 0, pois: 5, it: [{ t: "atk", v: 50 }], ii: 0, dead: false },
    ];
    const r = endTurn(c, run, makeRng(13));
    expect(r.result).toBe("win");
    expect(run.pHp).toBe(100); // enemy never attacked
  });
});

describe("map", () => {
  it("genMap is deterministic per seed", () => {
    const m1 = genMap(makeRng(99));
    const m2 = genMap(makeRng(99));
    expect(JSON.stringify(m1)).toEqual(JSON.stringify(m2));
  });
  it("has boss as last row and start reachable", () => {
    const m = genMap(makeRng(99));
    const last = m.rows[m.rows.length - 1];
    expect(last.length).toBe(1);
    expect(last[0].type).toBe("boss");
    expect(reachable(m).row).toBe(0);
  });
  it("every node reachable from some previous node", () => {
    const m = genMap(makeRng(2024));
    for (let r = 1; r < m.rows.length; r++) {
      m.rows[r].forEach((_, j) => {
        const linked = m.rows[r - 1].some((nd) => nd.next.includes(j));
        expect(linked).toBe(true);
      });
    }
  });
});

describe("full mini-run smoke", () => {
  it("can start combat and clear a weak group without throwing", () => {
    const rng = makeRng(555);
    const run = createRun("berserk", 555, rng);
    const c = startCombat(run, "normal", rng);
    let guard = 0;
    while (!allDead(c) && run.pHp > 0 && guard++ < 200) {
      // play everything affordable
      let played = true;
      while (played) {
        played = false;
        for (let i = 0; i < c.hand.length; i++) {
          if (c.energy >= c.hand[i].cost) {
            const r = playCard(c, run, i, rng);
            played = r.ok;
            if (r.result === "win") break;
            break;
          }
        }
        if (allDead(c)) break;
      }
      if (allDead(c)) break;
      const r = endTurn(c, run, rng);
      if (r.result !== "continue") break;
    }
    expect(aliveIdx(c).length >= 0).toBe(true); // ran to completion, no throw
  });
});

describe("content expansion", () => {
  it("every hero builds a non-empty starter deck with a known relic", () => {
    for (const key of HERO_KEYS) {
      const run = createRun(key, 1, makeRng(1));
      expect(run.deck.length).toBeGreaterThan(0);
      // starting relic must resolve to a real definition
      expect(run.relics.every((id) => RELIC_BY_ID[id])).toBe(true);
    }
    expect(HERO_KEYS.length).toBe(16); // 4 archetypes × 4 tiers
  });

  it("every act has normal/elite/boss encounters with renderable sprites", () => {
    for (let act = 1; act <= TOTAL_ACTS; act++) {
      const tiers = ENCOUNTERS[act];
      expect(tiers).toBeTruthy();
      for (const tier of ["normal", "elite", "boss"] as const) {
        expect(tiers[tier].length).toBeGreaterThan(0);
        for (const group of tiers[tier]) {
          expect(group.length).toBeGreaterThan(0);
          for (const enemy of group) {
            expect(SPRITES[enemy.spr]).toBeTruthy();
            expect(enemy.hp).toBeGreaterThan(0);
            expect(enemy.it.length).toBeGreaterThan(0);
          }
        }
      }
    }
    expect(TOTAL_ACTS).toBe(4);
  });

  it("a fresh run can start combat in every act tier", () => {
    for (let act = 1; act <= TOTAL_ACTS; act++) {
      const run = createRun("paladin", act * 7, makeRng(act * 7));
      run.act = act;
      for (const tier of ["normal", "elite", "boss"] as const) {
        const c = startCombat(run, tier, makeRng(act * 13));
        expect(c.enemies.length).toBeGreaterThan(0);
        expect(c.hand.length).toBe(5);
      }
    }
  });
});

describe("statuses (effects model)", () => {
  function enemy(hp: number, it: { t: "atk" | "blk"; v: number }[] = [{ t: "atk", v: 10 }]) {
    return { n: "E", spr: "slime" as const, hp, max: hp, block: 0, pois: 0, vuln: 0, weak: 0, it, ii: 0, dead: false };
  }

  it("vulnerable amplifies attack damage by 50%", () => {
    const run = freshRun("mage");
    const c = startCombat(run, "normal", makeRng(20));
    c.pStr = 0;
    c.enemies = [enemy(40)];
    c.enemies[0].vuln = 2;
    const idx = giveCard(c, ATK6); // 6 -> floor(6*1.5)=9
    playCard(c, run, idx, rng(20));
    expect(c.enemies[0].hp).toBe(31);
  });

  it("weak reduces an enemy's attack damage by 25%", () => {
    const run = freshRun("mage");
    const c = startCombat(run, "normal", makeRng(21));
    run.pHp = 60;
    c.pBlock = 0;
    c.enemies = [enemy(40, [{ t: "atk", v: 12 }])];
    c.enemies[0].weak = 1; // 12 -> floor(12*0.75)=9
    endTurn(c, run, rng(21));
    expect(run.pHp).toBe(51);
  });

  it("vulnerable/weak decay by 1 after the enemy acts", () => {
    const run = freshRun("mage");
    const c = startCombat(run, "normal", makeRng(22));
    run.pHp = 80;
    c.enemies = [enemy(40, [{ t: "blk", v: 0 }])];
    c.enemies[0].vuln = 2;
    c.enemies[0].weak = 3;
    endTurn(c, run, makeRng(22));
    expect(c.enemies[0].vuln).toBe(1);
    expect(c.enemies[0].weak).toBe(2);
  });

  it("regen heals at end of turn and decays", () => {
    const run = freshRun("mage");
    const c = startCombat(run, "normal", makeRng(23));
    run.pHp = 30;
    c.pRegen = 5;
    c.enemies = [enemy(40, [{ t: "blk", v: 0 }])];
    endTurn(c, run, makeRng(23));
    expect(run.pHp).toBe(35);
    expect(c.pRegen).toBe(4);
  });

  it("thorns reflect onto an attacking enemy", () => {
    const run = freshRun("mage");
    const c = startCombat(run, "normal", makeRng(24));
    run.pHp = 60;
    c.pThorns = 4;
    c.enemies = [enemy(40, [{ t: "atk", v: 8 }])];
    endTurn(c, run, rng(24));
    expect(c.enemies[0].hp).toBe(36); // took 4 thorns
  });

  it("a damage+vulnerable card applies the debuff for next hits", () => {
    const run = freshRun("mage");
    const c = startCombat(run, "normal", makeRng(25));
    c.pStr = 0;
    c.enemies = [enemy(40)];
    const idx = giveCard(c, {
      n: "Pierce",
      t: "atk",
      cost: 1,
      art: "x",
      tier: "u",
      effects: [{ k: "damage", v: 5 }, { k: "vulnerable", v: 2 }],
    });
    playCard(c, run, idx, rng(25));
    expect(c.enemies[0].hp).toBe(35); // first hit not yet vulnerable
    expect(c.enemies[0].vuln).toBe(2);
  });

  it("upgradeCard strengthens the primary effect and marks the card", () => {
    const card = {
      n: "Strike",
      t: "atk" as const,
      cost: 1,
      art: "x",
      tier: "c" as const,
      effects: [{ k: "damage" as const, v: 6 }, { k: "strength" as const, v: 1 }],
    };
    upgradeCard(card);
    expect(card.effects[0].v).toBe(9); // damage +3
    expect(card.effects[1].v).toBe(1); // secondary untouched
    expect(card.up).toBe(true);
    expect(card.n.endsWith("+")).toBe(true);
  });
});

describe("d20 to-hit bands", () => {
  function lone(hp: number, ac?: number) {
    const e = { n: "E", spr: "slime" as const, hp, max: hp, block: 0, pois: 0, vuln: 0, weak: 0, it: [{ t: "atk" as const, v: 1 }], ii: 0, dead: false } as CombatState["enemies"][number];
    if (ac !== undefined) e.ac = ac;
    return e;
  }
  function setup(seed: number) {
    const run = freshRun("mage");
    const c = startCombat(run, "normal", makeRng(seed));
    c.pStr = 0;
    return { run, c };
  }

  it("nat 20 crits for double", () => {
    const { run, c } = setup(40);
    c.enemies = [lone(20)];
    playCard(c, run, giveCard(c, ATK6), rng(40, 20)); // 6*2
    expect(c.enemies[0].hp).toBe(8);
  });
  it("nat 1 fumbles for half", () => {
    const { run, c } = setup(41);
    c.enemies = [lone(20)];
    playCard(c, run, giveCard(c, ATK6), rng(41, 1)); // floor(6*0.5)=3
    expect(c.enemies[0].hp).toBe(17);
  });
  it("falling short of AC is a glancing half-hit", () => {
    const { run, c } = setup(42);
    c.enemies = [lone(20, 20)]; // high AC; die 2 + mod 4 = 6 < 20
    playCard(c, run, giveCard(c, ATK6), rng(42, 2));
    expect(c.enemies[0].hp).toBe(17); // floor(6*0.5)=3
  });
  it("meeting AC lands a full hit", () => {
    const { run, c } = setup(43);
    c.enemies = [lone(20, 11)]; // die 7 + mod 4 = 11 >= 11
    playCard(c, run, giveCard(c, ATK6), rng(43, 7));
    expect(c.enemies[0].hp).toBe(14); // full 6
  });
  it("a glancing/fumbled blow still deals at least 1", () => {
    const { run, c } = setup(44);
    c.enemies = [lone(20)];
    const one: Card = { n: "Jab", t: "atk", cost: 1, art: "x", tier: "c", effects: [{ k: "damage", v: 1 }] };
    playCard(c, run, giveCard(c, one), rng(44, 1)); // floor(1*0.5)=0 -> 1
    expect(c.enemies[0].hp).toBe(19);
  });
});

describe("enemy strength / buff intent", () => {
  it("buff intent raises enemy strength; next attack hits harder", () => {
    const run = freshRun("mage");
    const c = startCombat(run, "normal", makeRng(30));
    run.pHp = 80;
    c.pBlock = 0;
    c.enemies = [
      { n: "Boss", spr: "golem", hp: 60, max: 60, block: 0, pois: 0, str: 0, vuln: 0, weak: 0, it: [{ t: "buff", v: 3 }, { t: "atk", v: 10 }], ii: 0, dead: false },
    ];
    endTurn(c, run, rng(30)); // buff -> str 3, no damage
    expect(c.enemies[0].str).toBe(3);
    expect(run.pHp).toBe(80);
    endTurn(c, run, makeRng(30)); // atk 10 + str 3 = 13
    expect(run.pHp).toBe(67);
  });
});
