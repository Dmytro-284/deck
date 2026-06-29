import type { Archetype, HeroDef, HeroKey, HeroTier } from "../types";

/**
 * Heroes are laid out on a 4×4 grid (Mech Arena style): rows = archetype,
 * columns = power tier. Stats scale by tier off the archetype's base hero —
 * see HERO_TIER_MULT. Each hero still keeps a unique kit (relic + starter deck);
 * only the raw stats follow the tier curve. The 8 base/rare/epic heroes below
 * are filled; the remaining grid cells are placeholders to be authored later
 * (see HERO_GRID — null cells render as "coming soon" in the select UI).
 */

/** Per-tier stat multiplier, applied to the archetype's base stats. Monotonic.
 *  Currently affects HP only. */
export const HERO_TIER_MULT: Record<HeroTier, number> = {
  base: 1.0,
  rare: 1.33,
  epic: 1.66,
  legend: 2.0,
};

/** UA labels for the grid axes. */
export const ARCHETYPE_LABEL: Record<Archetype, string> = {
  human: "Люди",
  mage: "Маги",
  assassin: "Асасіни",
  tank: "Танки",
};
export const HERO_TIER_LABEL: Record<HeroTier, string> = {
  base: "Базовий",
  rare: "Рідкісний",
  epic: "Епічний",
  legend: "Легендарний",
};

/** Display order for the grid (rows × columns). */
export const ARCHETYPE_ORDER: Archetype[] = ["human", "mage", "assassin", "tank"];
export const HERO_TIER_ORDER: HeroTier[] = ["base", "rare", "epic", "legend"];

export const HEROES: Record<HeroKey, HeroDef> = {
  // ---- Люди (human) ----
  knight: {
    key: "knight",
    name: "Лицар",
    ico: "🛡",
    hp: 62,
    relic: "krug",
    d: "Міцний баланс атаки й обладунку. Найвитриваліший.",
    sprite: "knight",
    archetype: "human",
    htier: "base",
  },
  paladin: {
    key: "paladin",
    name: "Паладин",
    ico: "✨",
    hp: 82,
    relic: "grail",
    d: "Блок, зцілення й святий урон. Витриваліший за лицаря.",
    sprite: "paladin",
    archetype: "human",
    htier: "rare",
  },
  inquisitor: {
    key: "inquisitor",
    name: "Інквізитор",
    ico: "⚖",
    hp: 103,
    relic: "rune",
    d: "Суд і кара: вразливість + важкий святий урон. Карає винних.",
    sprite: "inquisitor",
    archetype: "human",
    htier: "epic",
  },
  champion: {
    key: "champion",
    name: "Чемпіон",
    ico: "🏅",
    hp: 124,
    relic: "kulon",
    d: "Елітний боєць: баланс, сила й нищівні удари. Витримує найбільше.",
    sprite: "champion",
    archetype: "human",
    htier: "legend",
  },
  // ---- Маги (mage) ----
  mage: {
    key: "mage",
    name: "Маг",
    ico: "🔮",
    hp: 52,
    relic: "kinj",
    d: "Крихкий. Отрута + мульти-урон, добре проти груп.",
    sprite: "mage",
    archetype: "mage",
    htier: "base",
  },
  warlock: {
    key: "warlock",
    name: "Чаклун",
    ico: "🌑",
    hp: 69,
    relic: "cherep",
    d: "Темна магія: прокляття, виснаження й отрута. Крихкий контролер.",
    sprite: "warlock",
    archetype: "mage",
    htier: "rare",
  },
  druid: {
    key: "druid",
    name: "Друїд",
    ico: "🌿",
    hp: 86,
    relic: "totem",
    d: "Природа й витривалість: реген, шипи й отрута. Виснажує ворога.",
    sprite: "druid",
    archetype: "mage",
    htier: "epic",
  },
  archmage: {
    key: "archmage",
    name: "Архімаг",
    ico: "🌟",
    hp: 104,
    relic: "rune",
    d: "Володар стихій: масовий урон і ланцюги блискавок. Чистий шкідник.",
    sprite: "archmage",
    archetype: "mage",
    htier: "legend",
  },
  // ---- Асасіни (assassin) ----
  rogue: {
    key: "rogue",
    name: "Розбійник",
    ico: "🗡",
    hp: 54,
    relic: "igla",
    d: "Дешеві швидкі удари й отрута. Тендітний, але гнучкий.",
    sprite: "rogue",
    archetype: "assassin",
    htier: "base",
  },
  hunter: {
    key: "hunter",
    name: "Мисливець",
    ico: "🏹",
    hp: 72,
    relic: "sagai",
    d: "Залпи стріл і отрута на відстані. Карти качаються швидко.",
    sprite: "hunter",
    archetype: "assassin",
    htier: "rare",
  },
  nightblade: {
    key: "nightblade",
    name: "Нічний клинок",
    ico: "🌙",
    hp: 90,
    relic: "igla",
    d: "Серії швидких ударів і отруйні клинки. Ріже на стрічки.",
    sprite: "nightblade",
    archetype: "assassin",
    htier: "epic",
  },
  reaper: {
    key: "reaper",
    name: "Жнець",
    ico: "☠",
    hp: 108,
    relic: "sagai",
    d: "Коса жнивує юрбу: багатоудари + отрута. Збирає душі.",
    sprite: "reaper",
    archetype: "assassin",
    htier: "legend",
  },
  // ---- Танки (tank) ----
  berserk: {
    key: "berserk",
    name: "Берсерк",
    ico: "🪓",
    hp: 68,
    relic: "toch",
    d: "Великий урон і AoE, мало обладунку. Грай в агресію.",
    sprite: "berserk",
    archetype: "tank",
    htier: "base",
  },
  warden: {
    key: "warden",
    name: "Страж",
    ico: "🏯",
    hp: 90,
    relic: "serce",
    d: "Стіна з шипами: блок і відплата. Ворог ламає зуби об нього.",
    sprite: "warden",
    archetype: "tank",
    htier: "rare",
  },
  colossus: {
    key: "colossus",
    name: "Колос",
    ico: "🗿",
    hp: 113,
    relic: "serce",
    d: "Гора м'язів: гігантський блок і важкі удари по площі.",
    sprite: "colossus",
    archetype: "tank",
    htier: "epic",
  },
  bastion: {
    key: "bastion",
    name: "Бастіон",
    ico: "🏰",
    hp: 136,
    relic: "kulon",
    d: "Незрушна твердиня: максимум HP, броні й тернів. Витримує все.",
    sprite: "bastion",
    archetype: "tank",
    htier: "legend",
  },
};

export const HERO_KEYS = Object.keys(HEROES) as HeroKey[];

/**
 * The 4×4 select grid: HERO_GRID[archetype][tier] = hero key, or null for an
 * empty cell still to be authored. Order follows ARCHETYPE_ORDER × HERO_TIER_ORDER.
 */
export const HERO_GRID: Record<Archetype, Record<HeroTier, HeroKey>> = {
  human: { base: "knight", rare: "paladin", epic: "inquisitor", legend: "champion" },
  mage: { base: "mage", rare: "warlock", epic: "druid", legend: "archmage" },
  assassin: { base: "rogue", rare: "hunter", epic: "nightblade", legend: "reaper" },
  tank: { base: "berserk", rare: "warden", epic: "colossus", legend: "bastion" },
};
