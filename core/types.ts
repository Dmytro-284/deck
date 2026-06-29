// Pure data types for Deckforge. No React / DOM here.

export type HeroKey =
  | "knight"
  | "mage"
  | "rogue"
  | "berserk"
  | "paladin"
  | "hunter"
  | "druid"
  | "warlock"
  // grid fill-ins (epic / legendary tiers)
  | "inquisitor"
  | "champion"
  | "archmage"
  | "nightblade"
  | "reaper"
  | "warden"
  | "colossus"
  | "bastion";

// Sprite keys are decoupled from HeroKey, but every hero now has its own sprite.
export type SpriteKey =
  | "knight"
  | "mage"
  | "rogue"
  | "berserk"
  | "paladin"
  | "hunter"
  | "druid"
  | "warlock"
  | "inquisitor"
  | "champion"
  | "archmage"
  | "nightblade"
  | "reaper"
  | "warden"
  | "colossus"
  | "bastion"
  | "slime"
  | "goblin"
  | "bat"
  | "sentinel"
  | "golem"
  | "imp"
  | "witch"
  | "demon"
  | "dragon"
  | "wraith"
  | "lich"
  | "titan"
  | "overlord";

/** Visual/category tag — drives card colour, filtering and grouping. */
export type CardType = "atk" | "blk" | "poison" | "heal" | "str" | "skill";

/** Card rarity tier: c = base, u = uncommon, r = rare/epic. */
export type Tier = "c" | "u" | "r";

/**
 * A single declarative effect. The card model is now a list of these, so cards
 * can combine damage with debuffs, buffs and utility. Targeting is implied by
 * kind: damage/poison/vulnerable/weak hit enemies (single target, or all when
 * `aoe`); block/heal/strength/regen/thorns/draw affect the player.
 */
export type EffectKind =
  | "damage"
  | "block"
  | "poison"
  | "heal"
  | "strength"
  | "vulnerable" // target takes +50% attack damage while stacked
  | "weak" // afflicted deals -25% attack damage while stacked
  | "regen" // player heals v at end of turn, then decays by 1
  | "thorns" // attackers take v damage for the rest of combat
  | "draw"; // draw v extra cards

export interface Effect {
  k: EffectKind;
  v: number; // magnitude
  hits?: number; // multi-hit (damage only)
  aoe?: boolean; // affects all living enemies (enemy-targeted kinds)
}

/** A card definition: a name/category/cost plus a list of declarative effects. */
export interface CardDef {
  n: string; // display name
  t: CardType;
  cost: number;
  art: string; // emoji icon
  tier: Tier;
  effects: Effect[];
}

/** A card instance inside a run's deck (cloned from a CardDef, may be upgraded). */
export interface Card extends CardDef {
  up?: boolean; // has been smithed/upgraded
}

export type RelicId = string;

export type RelicEffectKey =
  | "startBlock"
  | "startStr"
  | "atkBonus"
  | "drawBonus"
  | "energyBonus"
  | "endHeal"
  | "atkPoison";

export interface RelicDef {
  id: RelicId;
  n: string; // name
  a: string; // emoji
  d: string; // description
  eff: Partial<Record<RelicEffectKey, number>>;
}

/** Hero archetype — the horizontal rows of the select grid. */
export type Archetype = "human" | "mage" | "assassin" | "tank";

/** Hero power tier — the vertical columns of the select grid. */
export type HeroTier = "base" | "rare" | "epic" | "legend";

export interface HeroDef {
  key: HeroKey;
  name: string;
  ico: string;
  hp: number;
  relic: RelicId; // starting relic
  d: string; // description
  sprite: SpriteKey;
  archetype: Archetype; // grid row
  htier: HeroTier; // grid column (power tier)
}

export type IntentType = "atk" | "blk" | "buff";

export interface Intent {
  t: IntentType;
  v: number;
}

export interface EnemyDef {
  n: string; // name
  spr: SpriteKey;
  hp: number;
  it: Intent[]; // intent cycle
}

export type EncTier = "normal" | "elite" | "boss";

/** A single encounter is a group of enemies fought together. */
export type Encounter = EnemyDef[];

/** Encounters available within one act, bucketed by tier. */
export type ActEncounters = Record<EncTier, Encounter[]>;

export type NodeType =
  | "fight"
  | "elite"
  | "shop"
  | "event"
  | "campfire"
  | "boss";
