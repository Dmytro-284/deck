// Pure game engine. No React, no DOM, no Math.random — all randomness via Rng.
// Functions mutate the state objects passed in (callers clone when needed) and
// return structured results so the UI can render/animate. Faithful port of the
// original prototype's combat/map rules.
import type {
  Card,
  CardDef,
  Effect,
  EncTier,
  EnemyDef,
  HeroKey,
  NodeType,
  RelicDef,
  RelicEffectKey,
  RelicId,
  Tier,
} from "./types";
import {
  CARD_POOL,
  ENCOUNTERS,
  HEROES,
  RELICS,
  RELIC_BY_ID,
  buildStarterDeck,
} from "./content";
import type { Rng } from "./rng";
import type {
  CombatEvent,
  CombatResult,
  CombatState,
  EnemyState,
  GameMap,
  MapNode,
  RollBand,
  RunState,
} from "./state";

/* ---------------- d20 combat ---------------- */

/** Flat to-hit proficiency added to every attacker's d20 roll. */
const ATK_BASE = 4;

/** Static armour class by encounter tier (the d20 to-hit target). */
function acForTier(tier: EncTier): number {
  return tier === "boss" ? 15 : tier === "elite" ? 13 : 11;
}

/**
 * Roll a d20 attack. No hard misses: nat 20 always crits (×2), nat 1 always
 * fumbles (×½); otherwise meeting the target's AC lands a full hit, falling
 * short is a glancing blow (×½). Returns the band + the raw die for the UI.
 */
function attackRoll(rng: Rng, mod: number, ac: number): { d: number; band: RollBand; mult: number } {
  const d = rng.d20();
  if (d === 20) return { d, band: "crit", mult: 2 };
  if (d === 1) return { d, band: "fumble", mult: 0.5 };
  if (d + mod >= ac) return { d, band: "hit", mult: 1 };
  return { d, band: "glance", mult: 0.5 };
}

/* ---------------- relics ---------------- */

export function relicSum(relics: RelicId[], key: RelicEffectKey): number {
  return relics.reduce((s, id) => s + (RELIC_BY_ID[id]?.eff[key] ?? 0), 0);
}

/* ---------------- run setup ---------------- */

export function createRun(cls: HeroKey, seed: number, rng: Rng): RunState {
  const h = HEROES[cls];
  return {
    seed,
    cls,
    pHp: h.hp,
    pMax: h.hp,
    gold: 30,
    deck: buildStarterDeck(cls),
    relics: [h.relic],
    map: genMap(rng),
    act: 1,
  };
}

/* ---------------- map generation ---------------- */

const MAP_WEIGHTS: NodeType[] = [
  "fight",
  "fight",
  "fight",
  "event",
  "shop",
  "campfire",
  "elite",
];

export function genMap(rng: Rng): GameMap {
  const rows: MapNode[][] = [];
  const mk = (type: NodeType): MapNode => ({ type, next: [], done: false });

  rows.push([mk("fight"), mk("fight")]);
  for (let r = 1; r <= 4; r++) {
    const n = 2 + rng.int(2); // 2 or 3
    const row: MapNode[] = [];
    for (let i = 0; i < n; i++) {
      let ty = rng.pick(MAP_WEIGHTS);
      if (r >= 3 && rng.next() < 0.2) ty = "elite";
      row.push(mk(ty));
    }
    rows.push(row);
  }
  rows.push([mk("campfire")]);
  rows.push([mk("boss")]);

  // link each row to the next, keeping edges roughly vertical
  for (let r = 0; r < rows.length - 1; r++) {
    const cur = rows[r];
    const nxt = rows[r + 1];
    cur.forEach((nd) => (nd.next = []));
    cur.forEach((nd, i) => {
      const fi = cur.length > 1 ? i / (cur.length - 1) : 0.5;
      let best = 0;
      let bd = 9;
      nxt.forEach((_, j) => {
        const fj = nxt.length > 1 ? j / (nxt.length - 1) : 0.5;
        const dd = Math.abs(fi - fj);
        if (dd < bd) {
          bd = dd;
          best = j;
        }
      });
      nd.next.push(best);
      if (rng.next() < 0.4) {
        const alt = Math.min(
          nxt.length - 1,
          Math.max(0, best + (rng.next() < 0.5 ? -1 : 1)),
        );
        if (!nd.next.includes(alt)) nd.next.push(alt);
      }
    });
    // ensure every next-row node is reachable
    nxt.forEach((_, j) => {
      if (!cur.some((nd) => nd.next.includes(j))) {
        let best = 0;
        let bd = 9;
        cur.forEach((nd, i) => {
          const fi = cur.length > 1 ? i / (cur.length - 1) : 0.5;
          const fj = nxt.length > 1 ? j / (nxt.length - 1) : 0.5;
          const dd = Math.abs(fi - fj);
          if (dd < bd) {
            bd = dd;
            best = i;
          }
        });
        cur[best].next.push(j);
      }
    });
  }
  return { rows, cur: null };
}

/** Which nodes the player can currently move to. */
export function reachable(map: GameMap): { row: number; idx: number[] } {
  if (!map.cur) return { row: 0, idx: map.rows[0].map((_, i) => i) };
  if (map.cur.row >= map.rows.length - 1) return { row: -1, idx: [] };
  const cur = map.rows[map.cur.row][map.cur.idx];
  return { row: map.cur.row + 1, idx: cur.next };
}

/* ---------------- combat helpers ---------------- */

export function aliveIdx(c: CombatState): number[] {
  return c.enemies.map((_, i) => i).filter((i) => !c.enemies[i].dead);
}

export function allDead(c: CombatState): boolean {
  return c.enemies.every((e) => e.dead);
}

export function curTarget(c: CombatState): number {
  if (c.enemies[c.target] && !c.enemies[c.target].dead) return c.target;
  const a = aliveIdx(c);
  return a.length ? a[0] : -1;
}

/* ---------------- combat setup ---------------- */

export function pickEncounter(act: number, tier: EncTier, rng: Rng): EnemyDef[] {
  return rng.pick(ENCOUNTERS[act][tier]);
}

export function startCombat(
  run: RunState,
  tier: EncTier,
  rng: Rng,
): CombatState {
  const enc = pickEncounter(run.act, tier, rng);
  const maxEnergy = 3 + relicSum(run.relics, "energyBonus");
  const c: CombatState = {
    tier,
    energy: maxEnergy,
    maxEnergy,
    pBlock: relicSum(run.relics, "startBlock"),
    pStr: relicSum(run.relics, "startStr"),
    pRegen: 0,
    pThorns: 0,
    pAC: 12,
    enemies: enc.map(
      (e): EnemyState => ({
        n: e.n,
        spr: e.spr,
        hp: e.hp,
        max: e.hp,
        block: 0,
        pois: 0,
        str: 0,
        vuln: 0,
        weak: 0,
        ac: acForTier(tier),
        it: e.it.map((x) => ({ ...x })),
        ii: 0,
        dead: false,
      }),
    ),
    target: 0,
    over: false,
    draw: rng.shuffle(run.deck.map((card) => ({ ...card }))),
    hand: [],
    disc: [],
    turn: 1,
  };
  drawCards(c, 5, rng);
  return c;
}

export function drawCards(c: CombatState, k: number, rng: Rng): void {
  for (let i = 0; i < k; i++) {
    if (!c.draw.length) {
      if (!c.disc.length) break;
      c.draw = rng.shuffle(c.disc);
      c.disc = [];
    }
    const card = c.draw.pop();
    if (card) c.hand.push(card);
  }
}

/* ---------------- damage primitives ---------------- */

function dmgEnemy(
  c: CombatState,
  i: number,
  dmg: number,
  ev: CombatEvent[],
  roll?: { d: number; band: RollBand },
): void {
  const e = c.enemies[i];
  if (!e || e.dead) return;
  // vulnerable amplifies incoming attack damage by 50% before block
  const eff = (e.vuln ?? 0) > 0 ? Math.floor(dmg * 1.5) : dmg;
  const ab = Math.min(e.block, eff);
  e.block -= ab;
  const real = eff - ab;
  e.hp -= real;
  ev.push({
    kind: "enemyDamage",
    target: i,
    amount: real,
    ...(roll ? { roll: roll.d, band: roll.band } : {}),
  });
  if (e.hp <= 0) {
    e.dead = true;
    ev.push({ kind: "enemyKilled", target: i });
  }
}

function addPois(c: CombatState, i: number, n: number, ev: CombatEvent[]): void {
  const e = c.enemies[i];
  if (!e || e.dead) return;
  e.pois += n;
  ev.push({ kind: "enemyPoison", target: i, amount: n });
}

function addStatus(
  c: CombatState,
  i: number,
  key: "vuln" | "weak",
  n: number,
  ev: CombatEvent[],
): void {
  const e = c.enemies[i];
  if (!e || e.dead) return;
  e[key] = (e[key] ?? 0) + n;
  ev.push({
    kind: key === "vuln" ? "enemyVuln" : "enemyWeak",
    target: i,
    amount: n,
  });
}

/** Deep-clone a card def so per-instance upgrades never mutate shared data. */
function cloneCard(card: CardDef): Card {
  return { ...card, effects: card.effects.map((e) => ({ ...e })) };
}

/* ---------------- play a card ---------------- */

export interface PlayResult {
  ok: boolean;
  events: CombatEvent[];
  result: CombatResult;
}

interface EffectCtx {
  atkBonus: number;
  atkPoison: number;
  rng: Rng;
}

/** Targets for an enemy-facing effect: all living, or just the current target. */
function effectTargets(c: CombatState, ef: Effect): number[] {
  if (ef.aoe) return aliveIdx(c);
  const t = curTarget(c);
  return t >= 0 ? [t] : [];
}

/** Apply one declarative effect to the combat state. */
function applyEffect(
  c: CombatState,
  run: RunState,
  ef: Effect,
  ctx: EffectCtx,
  ev: CombatEvent[],
): void {
  switch (ef.k) {
    case "damage": {
      const each = ef.v + c.pStr + ctx.atkBonus;
      const hits = ef.hits ?? 1;
      for (const ti of effectTargets(c, ef)) {
        for (let h = 0; h < hits; h++) {
          const e = c.enemies[ti];
          if (!e || e.dead) break;
          // d20 to-hit: strength sharpens accuracy as well as power
          const r = attackRoll(ctx.rng, ATK_BASE + c.pStr, e.ac ?? 11);
          const dmg = Math.max(1, Math.floor(each * r.mult));
          dmgEnemy(c, ti, dmg, ev, r);
          if (ctx.atkPoison) addPois(c, ti, ctx.atkPoison, ev);
        }
      }
      break;
    }
    case "block":
      c.pBlock += ef.v;
      ev.push({ kind: "playerBlock", amount: ef.v });
      break;
    case "poison":
      for (const ti of effectTargets(c, ef)) addPois(c, ti, ef.v, ev);
      break;
    case "heal": {
      const before = run.pHp;
      run.pHp = Math.min(run.pMax, run.pHp + ef.v);
      ev.push({ kind: "playerHeal", amount: run.pHp - before });
      break;
    }
    case "strength":
      c.pStr += ef.v;
      ev.push({ kind: "playerStr", amount: ef.v });
      break;
    case "vulnerable":
      for (const ti of effectTargets(c, ef)) addStatus(c, ti, "vuln", ef.v, ev);
      break;
    case "weak":
      for (const ti of effectTargets(c, ef)) addStatus(c, ti, "weak", ef.v, ev);
      break;
    case "regen":
      c.pRegen += ef.v;
      ev.push({ kind: "playerRegen", amount: ef.v });
      break;
    case "thorns":
      c.pThorns += ef.v;
      ev.push({ kind: "playerThorns", amount: ef.v });
      break;
    case "draw":
      drawCards(c, ef.v, ctx.rng);
      break;
  }
}

export function playCard(
  c: CombatState,
  run: RunState,
  handIdx: number,
  rng: Rng,
): PlayResult {
  const ev: CombatEvent[] = [];
  const card = c.hand[handIdx];
  if (!card || c.over || c.energy < card.cost) {
    return { ok: false, events: ev, result: "continue" };
  }
  c.energy -= card.cost;

  const ctx: EffectCtx = {
    atkBonus: relicSum(run.relics, "atkBonus"),
    atkPoison: relicSum(run.relics, "atkPoison"),
    rng,
  };
  for (const ef of card.effects) {
    applyEffect(c, run, ef, ctx, ev);
    if (allDead(c)) break;
  }

  // discard played card
  c.disc.push(card);
  c.hand.splice(handIdx, 1);

  if (allDead(c)) {
    c.over = true;
    return { ok: true, events: ev, result: "win" };
  }
  if (c.enemies[c.target]?.dead) c.target = curTarget(c);
  return { ok: true, events: ev, result: "continue" };
}

/* ---------------- end of turn resolution ---------------- */

export interface TurnResult {
  events: CombatEvent[];
  result: CombatResult;
}

/**
 * Resolve the player ending their turn: discard hand, tick poison, run enemy
 * intents, then set up the next player turn. Returns all events in order plus
 * the outcome. The card layer (Card[]) is on `run.deck`; combat piles live on `c`.
 */
export function endTurn(c: CombatState, run: RunState, rng: Rng): TurnResult {
  const ev: CombatEvent[] = [];
  if (c.over) return { events: ev, result: "continue" };

  // discard whole hand
  c.disc = c.disc.concat(c.hand);
  c.hand = [];

  // poison tick
  c.enemies.forEach((e, i) => {
    if (!e.dead && e.pois > 0) {
      e.hp -= e.pois;
      ev.push({ kind: "poisonTick", target: i, amount: e.pois });
      e.pois--;
      if (e.hp <= 0) {
        e.dead = true;
        ev.push({ kind: "enemyKilled", target: i });
      }
    }
  });

  if (allDead(c)) {
    c.over = true;
    return { events: ev, result: "win" };
  }

  // regeneration: heal at end of player turn, then decay by 1
  if (c.pRegen > 0) {
    const before = run.pHp;
    run.pHp = Math.min(run.pMax, run.pHp + c.pRegen);
    if (run.pHp > before) {
      ev.push({ kind: "playerHeal", amount: run.pHp - before });
    }
    c.pRegen--;
  }

  // enemy turn
  for (const i of aliveIdx(c)) {
    const e = c.enemies[i];
    const it = e.it[e.ii];
    if (it.t === "atk") {
      // enemy strength adds to the hit; weak then reduces it by 25%
      const base = it.v + (e.str ?? 0);
      const afterWeak = (e.weak ?? 0) > 0 ? Math.floor(base * 0.75) : base;
      // d20 to-hit against the player's armour class
      const roll = attackRoll(rng, ATK_BASE + (e.str ?? 0), c.pAC);
      const raw = Math.max(1, Math.floor(afterWeak * roll.mult));
      const ab = Math.min(c.pBlock, raw);
      c.pBlock -= ab;
      const real = raw - ab;
      run.pHp -= real;
      ev.push({ kind: "playerDamage", amount: real, roll: roll.d, band: roll.band });
      // thorns reflect onto the attacker (whether or not the hit was blocked)
      if (c.pThorns > 0) dmgEnemy(c, i, c.pThorns, ev);
      if (run.pHp <= 0) {
        run.pHp = 0;
        c.over = true;
        return { events: ev, result: "lose" };
      }
    } else if (it.t === "buff") {
      e.str = (e.str ?? 0) + it.v;
      ev.push({ kind: "enemyBuff", enemy: i, amount: it.v });
    } else {
      e.block += it.v;
      ev.push({ kind: "enemyBlock", enemy: i, amount: it.v });
    }
  }

  // thorns may have killed the last enemy
  if (allDead(c)) {
    c.over = true;
    return { events: ev, result: "win" };
  }

  // start next player turn: advance intents, decay enemy debuffs
  c.enemies.forEach((e) => {
    if (e.dead) return;
    e.ii = (e.ii + 1) % e.it.length;
    if ((e.vuln ?? 0) > 0) e.vuln = (e.vuln ?? 0) - 1;
    if ((e.weak ?? 0) > 0) e.weak = (e.weak ?? 0) - 1;
  });
  c.pBlock = 0;
  c.energy = c.maxEnergy;
  c.over = false;
  c.target = curTarget(c);
  c.turn++;
  drawCards(c, 5 + relicSum(run.relics, "drawBonus"), rng);
  return { events: ev, result: "continue" };
}

/* ---------------- rewards ---------------- */

export function combatGold(tier: EncTier, act: number, rng: Rng): number {
  const base = tier === "boss" ? 60 : tier === "elite" ? 35 : 15 + rng.int(11);
  return base * act;
}

/** Three distinct random cards from the pool, for a reward screen. */
export function rewardCards(rng: Rng): Card[] {
  return rng.shuffle(CARD_POOL.map(cloneCard)).slice(0, 3);
}

/* ---------------- shop / relics / smithing ---------------- */

export interface ShopItem {
  card: Card;
  price: number;
}

export function cardPrice(tier: Tier): number {
  return tier === "r" ? 90 : tier === "u" ? 60 : 45;
}

export function shopStock(rng: Rng): ShopItem[] {
  return rng
    .shuffle(CARD_POOL.map(cloneCard))
    .slice(0, 4)
    .map((card) => ({ card, price: cardPrice(card.tier) }));
}

export function unownedRelics(owned: RelicId[]): RelicDef[] {
  const set = new Set(owned);
  return RELICS.filter((r) => !set.has(r.id));
}

/** Up to 3 distinct relics the player does not own yet. */
export function rewardRelics(owned: RelicId[], rng: Rng): RelicDef[] {
  return rng.shuffle(unownedRelics(owned).slice()).slice(0, 3);
}

/** In-place upgrade: strengthen the card's primary effect, name gets a +. */
export function upgradeCard(card: Card): void {
  const pri =
    card.effects.find(
      (e) => e.k === "damage" || e.k === "block" || e.k === "heal",
    ) ??
    card.effects.find((e) => e.k === "poison") ??
    card.effects[0];
  if (pri) {
    if (pri.k === "damage" || pri.k === "block" || pri.k === "heal") pri.v += 3;
    else if (pri.k === "poison") pri.v += 3;
    else pri.v += 2;
  }
  card.up = true;
  if (!card.n.endsWith("+")) card.n += "+";
}

/** Cards eligible for smithing (not yet upgraded). */
export function upgradeableCards(deck: Card[]): Card[] {
  return deck.filter((x) => !x.up && x.effects.length > 0);
}
