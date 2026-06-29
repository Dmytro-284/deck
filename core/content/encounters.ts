import type { ActEncounters, EncTier, EnemyDef, Intent } from "../types";

const A = (v: number): Intent => ({ t: "atk", v });
const B = (v: number): Intent => ({ t: "blk", v });
const Bf = (v: number): Intent => ({ t: "buff", v }); // enemy gains strength

function e(n: string, spr: EnemyDef["spr"], hp: number, it: Intent[]): EnemyDef {
  return { n, spr, hp, it };
}

/** Encounters keyed by act number (1-based), then by tier. */
export const ENCOUNTERS: Record<number, ActEncounters> = {
  1: {
    normal: [
      [e("Слизняк", "slime", 44, [A(9), A(12), B(8), A(14)])],
      [e("Гоблін", "goblin", 50, [A(13), A(9), B(6), A(17)])],
      [
        e("Кажан", "bat", 24, [A(7), A(9), A(6)]),
        e("Кажан", "bat", 24, [A(8), A(6), A(10)]),
      ],
      [
        e("Слизень", "slime", 28, [A(8), B(6), A(11)]),
        e("Гоблін", "goblin", 32, [A(10), A(7), B(5)]),
      ],
    ],
    elite: [
      [e("Вартовий", "sentinel", 74, [A(16), B(14), A(22)])],
      [e("Голем", "golem", 82, [A(18), B(12), A(14), A(24)])],
      [
        e("Гоблін", "goblin", 34, [A(11), A(8)]),
        e("Гоблін", "goblin", 34, [A(8), A(12)]),
        e("Кажан", "bat", 26, [A(9), A(7)]),
      ],
    ],
    boss: [[e("Древній Голем", "golem", 120, [A(20), B(16), Bf(3), A(28)])]],
  },
  2: {
    normal: [
      [e("Імп", "imp", 58, [A(13), A(17), B(11), A(21)])],
      [e("Демон", "demon", 74, [A(19), A(14), A(27), B(13)])],
      [
        e("Імп", "imp", 32, [A(10), A(13), B(7)]),
        e("Імп", "imp", 32, [A(12), A(9), A(14)]),
      ],
      [
        e("Відьма", "witch", 42, [A(12), B(8), A(16)]),
        e("Імп", "imp", 30, [A(9), A(12)]),
      ],
    ],
    elite: [
      [e("Кам’яний Вартовий", "sentinel", 106, [A(24), B(18), A(31)])],
      [
        e("Пекельний Пес", "demon", 96, [A(21), A(17), A(29), B(15)]),
        e("Імп", "imp", 34, [A(11), A(9)]),
      ],
      [e("Демон-Вожак", "demon", 124, [A(18), Bf(4), A(24), A(30)])],
    ],
    boss: [
      [
        e("Багряний Дракон", "dragon", 170, [A(26), B(20), Bf(4), A(40)]),
        e("Імп", "imp", 30, [A(10), A(8), A(12)]),
        e("Імп", "imp", 30, [A(9), A(11), A(7)]),
      ],
    ],
  },
  3: {
    normal: [
      [e("Примара", "wraith", 64, [A(15), A(19), B(12), A(23)])],
      [e("Крижаний троль", "golem", 88, [A(21), B(15), A(16), A(29)])],
      [
        e("Примара", "wraith", 38, [A(12), A(15), B(8)]),
        e("Примара", "wraith", 38, [A(14), A(11), A(16)]),
      ],
      [
        e("Культист", "witch", 50, [A(14), B(10), A(18)]),
        e("Кажан", "bat", 30, [A(11), A(13)]),
      ],
    ],
    elite: [
      [e("Старший Ліч", "lich", 120, [A(26), B(20), A(34)])],
      [
        e("Кам’яний Вартовий", "sentinel", 110, [A(25), B(18), A(32)]),
        e("Примара", "wraith", 40, [A(12), A(10)]),
      ],
    ],
    boss: [
      [
        e("Ліч-Король", "lich", 200, [A(28), B(22), Bf(4), A(46)]),
        e("Примара", "wraith", 40, [A(13), A(11), A(15)]),
      ],
    ],
  },
  4: {
    normal: [
      [e("Порожнечник", "demon", 78, [A(18), A(23), B(14), A(28)])],
      [e("Пустотний титан", "titan", 104, [A(24), B(18), A(20), A(34)])],
      [
        e("Імп Безодні", "imp", 40, [A(13), A(16), B(9)]),
        e("Імп Безодні", "imp", 40, [A(15), A(12), A(18)]),
      ],
      [
        e("Порожнечник", "demon", 60, [A(16), B(12), A(22)]),
        e("Пустотний титан", "titan", 70, [A(18), A(14)]),
      ],
    ],
    elite: [
      [e("Пустотний титан", "titan", 150, [A(30), B(24), A(40)])],
      [
        e("Багряний Дракон", "dragon", 140, [A(28), B(20), A(36)]),
        e("Імп Безодні", "imp", 42, [A(13), A(11)]),
      ],
    ],
    boss: [
      [
        e("Володар Порожнечі", "overlord", 260, [A(32), B(26), Bf(5), A(52)]),
        e("Пустотний титан", "titan", 60, [A(18), A(15)]),
        e("Пустотний титан", "titan", 60, [A(16), A(17)]),
      ],
    ],
  },
};

export const TOTAL_ACTS = 4;

/** A unique creature aggregated across every encounter it appears in. */
export interface BestiaryEntry {
  name: string;
  spr: EnemyDef["spr"];
  minHp: number;
  maxHp: number;
  acts: number[]; // acts it shows up in (sorted)
  tiers: EncTier[]; // encounter tiers it appears in
}

/** Derive the bestiary from ENCOUNTERS: one entry per unique enemy name. */
export function listBestiary(): BestiaryEntry[] {
  const byName = new Map<string, BestiaryEntry>();
  for (const actStr of Object.keys(ENCOUNTERS)) {
    const act = Number(actStr);
    const tiers = ENCOUNTERS[act];
    for (const tier of Object.keys(tiers) as EncTier[]) {
      for (const group of tiers[tier]) {
        for (const en of group) {
          const cur = byName.get(en.n);
          if (!cur) {
            byName.set(en.n, {
              name: en.n,
              spr: en.spr,
              minHp: en.hp,
              maxHp: en.hp,
              acts: [act],
              tiers: [tier],
            });
          } else {
            cur.minHp = Math.min(cur.minHp, en.hp);
            cur.maxHp = Math.max(cur.maxHp, en.hp);
            if (!cur.acts.includes(act)) cur.acts.push(act);
            if (!cur.tiers.includes(tier)) cur.tiers.push(tier);
          }
        }
      }
    }
  }
  const order: Record<EncTier, number> = { normal: 0, elite: 1, boss: 2 };
  return Array.from(byName.values())
    .map((e) => ({
      ...e,
      acts: e.acts.sort((a, b) => a - b),
      tiers: e.tiers.sort((a, b) => order[a] - order[b]),
    }))
    .sort(
      (a, b) =>
        a.acts[0] - b.acts[0] ||
        order[a.tiers[0]] - order[b.tiers[0]] ||
        a.maxHp - b.maxHp,
    );
}
