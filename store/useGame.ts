"use client";
import { create } from "zustand";
import {
  HEROES,
  RELICS,
  RELIC_BY_ID,
  EVENTS,
  TOTAL_ACTS,
  defaultProfile,
  applyRunResult,
  purchaseHero,
  isUnlocked,
  evaluateAchievements,
  type Card,
  type HeroKey,
  type RelicDef,
  type GameEvent,
  type PlayerProfile,
  type AchievementDef,
} from "@/core";
import {
  createRun,
  genMap,
  startCombat,
  playCard,
  endTurn,
  combatGold,
  rewardCards,
  rewardRelics,
  unownedRelics,
  shopStock,
  upgradeCard,
  upgradeableCards,
  curTarget,
  type ShopItem,
} from "@/core/engine";
import type { CombatEvent, CombatState, RunState } from "@/core/state";
import { makeRng, randomSeed, type Rng } from "@/core/rng";
import {
  cloudEnabled,
  cloudLoadRun,
  cloudSaveRun,
  cloudSaveRunDebounced,
  cloudSubmitScore,
  playerName,
} from "@/lib/cloud";
import { loadProfileLocal, cloudLoadProfile, saveProfile } from "@/lib/profile";
import { sfx, haptic, type SfxName } from "@/lib/sfx";

/** Today's date (UTC) as YYYY-MM-DD — the daily-run key. */
export function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}
/** Deterministic 32-bit seed from a string (FNV-1a). */
function seedFromString(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function runScore(run: RunState, won: boolean): number {
  return (won ? 10000 : 0) + run.act * 1500 + run.gold;
}
function submitScore(run: RunState, won: boolean): void {
  void cloudSubmitScore({
    name: playerName() || "Безіменний",
    hero: run.cls,
    act: run.act,
    won,
    score: runScore(run, won),
    daily_date: run.daily ?? null,
    seed: run.seed,
  });
}

// Combat log reads in plain language instead of a raw d20 readout. We collapse
// every attack roll this action into its strongest band (crit > fumble > glance
// > full) and turn it into a human clause.
type Band = "crit" | "fumble" | "glance" | "full";
function topBand(
  events: CombatEvent[],
  kind: "enemyDamage" | "playerDamage",
): Band | null {
  const bands = events
    .filter((e) => e.kind === kind && (e as { roll?: number }).roll != null)
    .map((e) => (e as { band?: Band }).band);
  if (!bands.length) return null;
  if (bands.includes("crit")) return "crit";
  if (bands.includes("fumble")) return "fumble";
  if (bands.includes("glance")) return "glance";
  return "full";
}
/** Clause for the player's own attack (follows the card name). */
const PLAYER_BAND: Record<Band, string> = {
  crit: "критичний удар (×2)!",
  full: "влучний удар",
  glance: "ковзний удар (пів шкоди)",
  fumble: "майже промах (пів шкоди)",
};
/** Clause for an enemy hitting the player (follows "Ворог"). */
const ENEMY_BAND: Record<Band, string> = {
  crit: "критично б'є тебе (×2)!",
  full: "б'є тебе.",
  glance: "б'є ковзно — пів шкоди.",
  fumble: "ледь зачіпає — пів шкоди.",
};

/** Pick a sound for a played card from its effects. */
function cardSfx(card: Card): SfxName {
  const ks = card.effects.map((e) => e.k);
  if (ks.includes("damage")) return "slash";
  if (ks.includes("block")) return "block";
  if (ks.includes("heal")) return "heal";
  if (ks.includes("poison")) return "poison";
  return "click";
}

const SAVE_KEY = "deckforge_save_v3";

function saveLocal(run: RunState | null) {
  try {
    if (run) localStorage.setItem(SAVE_KEY, JSON.stringify(run));
  } catch {}
}
/** Persist a run to localStorage (instant) and the cloud (debounced). */
function saveRun(run: RunState | null) {
  saveLocal(run);
  cloudSaveRunDebounced(run);
}
export function loadRun(): RunState | null {
  try {
    const s = localStorage.getItem(SAVE_KEY);
    return s ? (JSON.parse(s) as RunState) : null;
  } catch {
    return null;
  }
}
function wipeSave() {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {}
  void cloudSaveRun(null); // clear the cloud copy immediately
}
export function hasSave(): boolean {
  return !!loadRun();
}

type View = "class" | "map" | "combat" | "shop";

type Modal =
  | { kind: "reward"; cards: Card[]; relicReward: boolean; isLast: boolean }
  | { kind: "relicReward"; relics: RelicDef[]; isLast: boolean }
  | { kind: "event"; ev: GameEvent }
  | { kind: "grantRelic"; relics: RelicDef[] }
  | { kind: "grantCard"; cards: Card[] }
  | { kind: "campfire" }
  | { kind: "smith"; cards: Card[] }
  | { kind: "remove"; cards: Card[] }
  | { kind: "deck" }
  | { kind: "tutorial" }
  | { kind: "fleeConfirm"; cost: number }
  | { kind: "actBonus"; act: number }
  | { kind: "win" }
  | { kind: "lose" }
  | null;

interface ShopState {
  stock: ShopItem[];
  relic: { r: RelicDef; price: number } | null;
}

interface GameStore {
  seed: number;
  rng: Rng;
  view: View;
  modal: Modal;
  run: RunState | null;
  combat: CombatState | null;
  shop: ShopState | null;
  log: string;
  logs: string[]; // recent combat-log lines (for the collapsible log)
  tick: number;
  saved: RunState | null; // resumable save (local or hydrated from cloud)
  cloudOn: boolean; // cloud sync established
  profile: PlayerProfile; // persistent meta progression
  recentAch: AchievementDef[]; // achievements earned by the last finished run

  bump: (log?: string) => void;
  bootstrap: () => void;
  unlockHero: (hero: HeroKey) => boolean;
  dismissTutorial: () => void;
  newRun: (cls: HeroKey, daily?: boolean) => void;
  resume: () => void;
  enterNode: (r: number, i: number) => void;

  setTarget: (i: number) => void;
  playCardAt: (i: number) => void;
  endPlayerTurn: () => void;
  requestFlee: () => void;
  confirmFlee: () => void;

  chooseRewardCard: (card: Card) => void;
  skipReward: () => void;
  takeRelic: (id: string) => void;
  chooseActBonus: (idx: number) => void;

  buyCard: (idx: number) => void;
  buyRelic: () => void;
  leaveShop: () => void;

  chooseEvent: (optIdx: number) => void;
  grantRelicPick: (id: string) => void;
  grantCardPick: (card: Card) => void;

  rest: () => void;
  openSmith: () => void;
  smith: (card: Card) => void;
  openRemove: () => void;
  removeCard: (card: Card) => void;

  openDeck: () => void;
  closeModal: () => void;
  toSelect: () => void;
  toMenu: () => void;
}

export const useGame = create<GameStore>((set, get) => {
  const nodeDone = () => {
    const { run } = get();
    if (run?.map.cur) run.map.rows[run.map.cur.row][run.map.cur.idx].done = true;
    saveRun(run);
  };

  const finishCombat = (isLast: boolean) => {
    const { run } = get();
    if (!run) return;
    saveRun(run);
    if (isLast) {
      if (run.act < TOTAL_ACTS) {
        run.act++;
        run.map = genMap(get().rng); // fresh map for the new act
        saveRun(run);
        // Boss-clear bonus: let the player pick a boon before the next act.
        set({
          view: "map",
          combat: null,
          modal: { kind: "actBonus", act: run.act },
          tick: get().tick + 1,
        });
        sfx("relic");
        haptic([20, 40, 20]);
      } else {
        submitScore(run, true);
        awardMeta(true);
        wipeSave();
        sfx("win");
        haptic([60, 40, 80]);
        set({
          view: "map",
          combat: null,
          modal: { kind: "win" },
          tick: get().tick + 1,
        });
      }
    } else {
      set({ view: "map", modal: null, combat: null, tick: get().tick + 1 });
    }
  };

  const afterReward = (relicReward: boolean, isLast: boolean) => {
    const { run, rng } = get();
    if (!run) return;
    if (relicReward) {
      const avail = unownedRelics(run.relics);
      if (avail.length) {
        set({
          modal: { kind: "relicReward", relics: rewardRelics(run.relics, rng), isLast },
          tick: get().tick + 1,
        });
        return;
      }
    }
    finishCombat(isLast);
  };

  const winCombat = () => {
    const { run, combat, rng } = get();
    if (!run || !combat) return;
    if (combat.tier) {
      const heal = run.relics.reduce(
        (s, id) => s + (RELIC_BY_ID[id]?.eff.endHeal ?? 0),
        0,
      );
      if (heal) run.pHp = Math.min(run.pMax, run.pHp + heal);
    }
    const gold = combatGold(combat.tier, run.act, rng);
    run.gold += gold;
    sfx("coin");
    nodeDone();
    const isLast = run.map.cur!.row >= run.map.rows.length - 1;
    const relicReward = combat.tier === "elite" || combat.tier === "boss";
    set({
      modal: { kind: "reward", cards: rewardCards(rng), relicReward, isLast },
      tick: get().tick + 1,
    });
  };

  // Fold a finished campaign run into the meta profile (coins + xp + unlocks).
  // Daily runs are one-off and don't feed the campaign lines.
  const awardMeta = (won: boolean) => {
    const { run, profile } = get();
    if (!run || run.daily) return;
    const afterRun = applyRunResult(profile, run.cls, run.act, won);
    const { profile: next, earned } = evaluateAchievements(afterRun);
    saveProfile(next);
    set({ profile: next, recentAch: earned });
  };

  return {
    seed: 0,
    rng: makeRng(1),
    view: "class",
    modal: null,
    run: null,
    combat: null,
    shop: null,
    log: "",
    logs: [],
    tick: 0,
    saved: null,
    cloudOn: false,
    profile: defaultProfile(),
    recentAch: [],

    bump: (log) =>
      set((s) => ({
        tick: s.tick + 1,
        log: log ?? s.log,
        logs: log ? [...s.logs, log].slice(-12) : s.logs,
      })),

    dismissTutorial: () => {
      try {
        localStorage.setItem("deckforge_tut_v1", "1");
      } catch {}
      set({ modal: null, tick: get().tick + 1 });
    },

    bootstrap: async () => {
      // Surface any local save + profile immediately, then reconcile with cloud.
      const localProfile = loadProfileLocal();
      if (localProfile) set({ profile: localProfile });
      set({ saved: loadRun(), tick: get().tick + 1 });
      const [cloudRun, on, cloudProfile] = await Promise.all([
        cloudLoadRun(),
        cloudEnabled(),
        cloudLoadProfile(),
      ]);
      const local = loadRun();
      if (cloudRun && !local) {
        // New device / cleared local but a cloud run exists -> hydrate locally.
        saveLocal(cloudRun);
        set({ saved: cloudRun });
      } else if (on && !cloudRun && local) {
        // Just signed in with guest progress -> push it up so it isn't lost.
        void cloudSaveRun(local);
      }
      // Profile: cloud wins when present; otherwise seed the cloud from local.
      if (cloudProfile) {
        saveProfile(cloudProfile);
        set({ profile: cloudProfile });
      } else if (on && localProfile) {
        saveProfile(localProfile);
      }
      set({ cloudOn: on, tick: get().tick + 1 });
    },

    unlockHero: (hero) => {
      const { profile } = get();
      if (isUnlocked(profile, hero)) return true;
      const res = purchaseHero(profile, hero);
      if (!res.ok) return false;
      saveProfile(res.profile);
      set({ profile: res.profile, tick: get().tick + 1 });
      sfx("coin");
      return true;
    },

    newRun: (cls, daily = false) => {
      const dateKey = todayKey();
      const seed = daily ? seedFromString(dateKey) : randomSeed();
      const rng = makeRng(seed);
      const run = createRun(cls, seed, rng);
      if (daily) run.daily = dateKey;
      saveRun(run);
      let firstTime = false;
      try {
        firstTime = !localStorage.getItem("deckforge_tut_v1");
      } catch {}
      set({
        seed,
        rng,
        run,
        saved: run,
        view: "map",
        modal: firstTime ? { kind: "tutorial" } : null,
        combat: null,
        logs: [],
        recentAch: [],
        tick: get().tick + 1,
      });
    },

    resume: () => {
      const run = loadRun();
      if (!run) return;
      const rng = makeRng(run.seed);
      set({ seed: run.seed, rng, run, saved: run, view: "map", modal: null, tick: get().tick + 1 });
    },

    enterNode: (r, i) => {
      const { run, rng } = get();
      if (!run) return;
      run.map.cur = { row: r, idx: i };
      const nd = run.map.rows[r][i];
      if (nd.type === "fight" || nd.type === "elite" || nd.type === "boss") {
        const tier = nd.type === "fight" ? "normal" : nd.type;
        const combat = startCombat(run, tier, rng);
        set({
          combat,
          view: "combat",
          modal: null,
          log:
            "Бій. " +
            (combat.enemies.length > 1
              ? "Клікни ворога щоб обрати ціль."
              : "Дивись намір ворога."),
          tick: get().tick + 1,
        });
      } else if (nd.type === "shop") {
        set({
          shop: {
            stock: shopStock(rng),
            relic: (() => {
              const av = unownedRelics(run.relics);
              return av.length ? { r: rng.pick(av), price: 150 } : null;
            })(),
          },
          view: "shop",
          tick: get().tick + 1,
        });
      } else if (nd.type === "event") {
        set({ modal: { kind: "event", ev: rng.pick(EVENTS) }, tick: get().tick + 1 });
      } else if (nd.type === "campfire") {
        set({ modal: { kind: "campfire" }, tick: get().tick + 1 });
      }
    },

    setTarget: (i) => {
      const { combat } = get();
      if (!combat || combat.over || combat.enemies[i].dead) return;
      combat.target = i;
      get().bump();
    },

    playCardAt: (i) => {
      const { combat, run, rng } = get();
      if (!combat || !run) return;
      const card = combat.hand[i];
      const r = playCard(combat, run, i, rng);
      if (!r.ok) return;
      sfx(cardSfx(card));
      haptic(8);
      saveRun(run);
      if (r.result === "win") {
        get().bump("«" + card.n + "» — ворогів повалено!");
        winCombat();
        return;
      }
      const band = topBand(r.events, "enemyDamage");
      get().bump(band ? `«${card.n}» — ${PLAYER_BAND[band]}` : `«${card.n}».`);
    },

    endPlayerTurn: () => {
      const { combat, run, rng } = get();
      if (!combat || !run || combat.over) return;
      const r = endTurn(combat, run, rng);
      saveRun(run);
      const hurt = r.events.some(
        (e) => e.kind === "playerDamage" && e.amount > 0,
      );
      if (hurt) {
        sfx("enemyHit");
        haptic(20);
      }
      if (r.result === "lose") {
        submitScore(run, false);
        awardMeta(false);
        wipeSave();
        sfx("lose");
        haptic([60, 40, 100]);
        set({ modal: { kind: "lose" }, tick: get().tick + 1 });
        return;
      }
      if (r.result === "win") {
        get().bump();
        winCombat();
        return;
      }
      sfx("draw");
      // End-of-turn recap: DoT / reflect / regen, then the enemy's attack.
      const sumKind = (k: CombatEvent["kind"]) =>
        r.events
          .filter((e) => e.kind === k)
          .reduce((s, e) => s + ((e as { amount?: number }).amount ?? 0), 0);
      const poisN = sumKind("poisonTick");
      if (poisN > 0) {
        const many =
          new Set(
            r.events.filter((e) => e.kind === "poisonTick").map((e) => (e as { target: number }).target),
          ).size > 1;
        get().bump(`Отрута точить ${many ? "ворогів" : "ворога"} (−${poisN}).`);
      }
      const thornsN = sumKind("enemyDamage"); // on the enemy turn this is thorns reflect
      if (thornsN > 0) get().bump(`Шипи ранять ворога (−${thornsN}).`);
      const healedN = sumKind("playerHeal"); // regen ticks at end of turn
      if (healedN > 0) get().bump(`Відновлення лікує тебе (+${healedN}).`);
      const eBand = topBand(r.events, "playerDamage");
      get().bump(eBand ? `Ворог ${ENEMY_BAND[eBand]} Твій хід.` : "Твій хід.");
    },

    requestFlee: () => {
      const { combat, run } = get();
      if (!combat || !run || combat.over || combat.tier === "boss") return;
      set({
        modal: { kind: "fleeConfirm", cost: Math.floor(run.pHp * 0.25) },
        tick: get().tick + 1,
      });
    },
    confirmFlee: () => {
      const { combat, run, modal } = get();
      if (!combat || !run || modal?.kind !== "fleeConfirm") return;
      run.pHp = Math.max(1, run.pHp - modal.cost);
      nodeDone();
      saveRun(run);
      set({ view: "map", combat: null, modal: null, log: "", tick: get().tick + 1 });
    },

    chooseRewardCard: (card) => {
      const { run, modal } = get();
      if (!run || modal?.kind !== "reward") return;
      run.deck.push({ ...card });
      saveRun(run);
      afterReward(modal.relicReward, modal.isLast);
    },
    skipReward: () => {
      const { modal } = get();
      if (modal?.kind !== "reward") return;
      afterReward(modal.relicReward, modal.isLast);
    },
    takeRelic: (id) => {
      const { run, modal } = get();
      if (!run || modal?.kind !== "relicReward") return;
      run.relics.push(id);
      sfx("relic");
      saveRun(run);
      finishCombat(modal.isLast);
    },
    chooseActBonus: (idx) => {
      const { run, rng, modal } = get();
      if (!run || modal?.kind !== "actBonus") return;
      if (idx === 0) {
        // Vitality: raise the ceiling and top off.
        run.pMax += 12;
        run.pHp = run.pMax;
      } else if (idx === 1) {
        // Relic: open a pick screen (grantRelicPick returns to the map).
        const av = unownedRelics(run.relics);
        if (av.length) {
          set({
            modal: { kind: "grantRelic", relics: rewardRelics(run.relics, rng) },
            tick: get().tick + 1,
          });
          return;
        }
        run.gold += 80; // fallback when every relic is owned
      } else {
        // Spoils: gold scaled by the act reached, plus a heal.
        run.gold += 50 * run.act;
        run.pHp = Math.min(run.pMax, run.pHp + 30);
      }
      saveRun(run);
      set({ view: "map", modal: null, tick: get().tick + 1 });
    },

    buyCard: (idx) => {
      const { run, shop } = get();
      if (!run || !shop) return;
      const item = shop.stock[idx];
      if (!item || item.price > run.gold || (item as ShopItem & { sold?: boolean }).sold)
        return;
      run.gold -= item.price;
      run.deck.push({ ...item.card });
      (item as ShopItem & { sold?: boolean }).sold = true;
      sfx("coin");
      saveRun(run);
      get().bump();
    },
    buyRelic: () => {
      const { run, shop } = get();
      if (!run || !shop?.relic) return;
      if (shop.relic.price > run.gold) return;
      run.gold -= shop.relic.price;
      run.relics.push(shop.relic.r.id);
      shop.relic = null;
      sfx("relic");
      saveRun(run);
      get().bump();
    },
    leaveShop: () => {
      nodeDone();
      set({ view: "map", shop: null, tick: get().tick + 1 });
    },

    chooseEvent: (optIdx) => {
      const { run, rng, modal } = get();
      if (!run || modal?.kind !== "event") return;
      const opt = modal.ev.opts[optIdx];

      // gamble: a coin flip — win gold (scaled by act) or take |hp| damage
      if (opt.gamble) {
        if (rng.next() < 0.5) {
          run.gold += (opt.goldPerAct ?? 0) * run.act;
        } else if (opt.hp) {
          run.pHp = Math.max(1, run.pHp - Math.abs(opt.hp));
        }
        saveRun(run);
        nodeDone();
        set({ view: "map", modal: null, tick: get().tick + 1 });
        return;
      }

      if (opt.hp) {
        run.pHp =
          opt.hp < 0
            ? Math.max(1, run.pHp + opt.hp)
            : Math.min(run.pMax, run.pHp + opt.hp);
      }
      if (opt.maxHp) {
        run.pMax = Math.max(1, run.pMax + opt.maxHp);
        run.pHp =
          opt.maxHp > 0
            ? Math.min(run.pMax, run.pHp + opt.maxHp)
            : Math.min(run.pHp, run.pMax);
      }
      if (opt.goldPerAct) run.gold += opt.goldPerAct * run.act;
      if (opt.grant === "remove") {
        if (run.deck.length > 1) {
          set({ modal: { kind: "remove", cards: run.deck }, tick: get().tick + 1 });
          return;
        }
        run.gold += 25; // nothing to remove → small consolation
      }
      if (opt.grant === "relic") {
        const av = unownedRelics(run.relics);
        if (av.length) {
          set({
            modal: { kind: "grantRelic", relics: rewardRelics(run.relics, rng) },
            tick: get().tick + 1,
          });
          return;
        }
        run.gold += 30;
      }
      if (opt.grant === "card") {
        set({ modal: { kind: "grantCard", cards: rewardCards(rng) }, tick: get().tick + 1 });
        return;
      }
      saveRun(run);
      nodeDone();
      set({ view: "map", modal: null, tick: get().tick + 1 });
    },
    grantRelicPick: (id) => {
      const { run } = get();
      if (!run) return;
      run.relics.push(id);
      sfx("relic");
      saveRun(run);
      nodeDone();
      set({ view: "map", modal: null, tick: get().tick + 1 });
    },
    grantCardPick: (card) => {
      const { run } = get();
      if (!run) return;
      run.deck.push({ ...card });
      saveRun(run);
      nodeDone();
      set({ view: "map", modal: null, tick: get().tick + 1 });
    },

    rest: () => {
      const { run } = get();
      if (!run) return;
      run.pHp = Math.min(run.pMax, run.pHp + Math.round(run.pMax * 0.3));
      sfx("heal");
      saveRun(run);
      nodeDone();
      set({ view: "map", modal: null, tick: get().tick + 1 });
    },
    openSmith: () => {
      const { run } = get();
      if (!run) return;
      set({ modal: { kind: "smith", cards: upgradeableCards(run.deck) }, tick: get().tick + 1 });
    },
    smith: (card) => {
      const { run } = get();
      if (!run) return;
      upgradeCard(card);
      saveRun(run);
      nodeDone();
      set({ view: "map", modal: null, tick: get().tick + 1 });
    },
    openRemove: () => {
      const { run } = get();
      if (!run) return;
      set({ modal: { kind: "remove", cards: run.deck }, tick: get().tick + 1 });
    },
    removeCard: (card) => {
      const { run } = get();
      if (!run || run.deck.length <= 1) return;
      const i = run.deck.indexOf(card);
      if (i >= 0) run.deck.splice(i, 1);
      saveRun(run);
      nodeDone();
      set({ view: "map", modal: null, tick: get().tick + 1 });
    },

    openDeck: () => set({ modal: { kind: "deck" }, tick: get().tick + 1 }),
    closeModal: () => set({ modal: null, tick: get().tick + 1 }),
    // Back to the hero-select screen WITHOUT abandoning the run (it stays saved,
    // so "Продовжити" resumes it). Differs from toMenu, which wipes the save.
    toSelect: () =>
      set({
        view: "class",
        combat: null,
        shop: null,
        modal: null,
        tick: get().tick + 1,
      }),
    toMenu: () => {
      wipeSave();
      set({
        view: "class",
        modal: null,
        run: null,
        combat: null,
        saved: null,
        tick: get().tick + 1,
      });
    },
  };
});

export { HEROES, RELICS, RELIC_BY_ID, curTarget };
