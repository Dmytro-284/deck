// Runtime state shapes (mutated during a run/combat). Distinct from content
// defs in types.ts. Kept serializable (no functions) for localStorage saves.
import type {
  Card,
  EncTier,
  HeroKey,
  Intent,
  NodeType,
  RelicId,
  SpriteKey,
} from "./types";

export interface EnemyState {
  n: string;
  spr: SpriteKey;
  hp: number;
  max: number;
  block: number;
  pois: number;
  str?: number; // strength: added to this enemy's attack damage
  vuln?: number; // vulnerable stacks (takes +50% attack damage)
  weak?: number; // weak stacks (deals -25% attack damage)
  ac?: number; // armour class — d20 to-hit target (defaults to the tier value)
  it: Intent[];
  ii: number; // current intent index
  dead: boolean;
}

export interface CombatState {
  tier: EncTier;
  energy: number;
  maxEnergy: number;
  pBlock: number;
  pStr: number;
  pRegen: number; // heal at end of turn, decays by 1
  pThorns: number; // reflect to attackers, persists for combat
  pAC: number; // player armour class — d20 to-hit target for enemy attacks
  enemies: EnemyState[];
  target: number;
  over: boolean;
  draw: Card[];
  hand: Card[];
  disc: Card[];
  turn: number;
}

export interface MapNode {
  type: NodeType;
  next: number[]; // indices into the next row
  done: boolean;
}

export interface GameMap {
  rows: MapNode[][];
  cur: { row: number; idx: number } | null;
}

export interface RunState {
  seed: number; // run seed (for reproducibility / traceability)
  cls: HeroKey;
  pHp: number;
  pMax: number;
  gold: number;
  deck: Card[];
  relics: RelicId[];
  map: GameMap;
  act: number;
  daily?: string; // ISO date (YYYY-MM-DD) when this is a daily-seed run
}

/** d20 attack outcome band (for UI flavour: crit/glance/fumble). */
export type RollBand = "crit" | "hit" | "glance" | "fumble";

/** Structured events emitted by the engine so the UI can animate resolution. */
export type CombatEvent =
  | { kind: "enemyDamage"; target: number; amount: number; roll?: number; band?: RollBand }
  | { kind: "enemyPoison"; target: number; amount: number }
  | { kind: "enemyVuln"; target: number; amount: number }
  | { kind: "enemyWeak"; target: number; amount: number }
  | { kind: "enemyKilled"; target: number }
  | { kind: "playerBlock"; amount: number }
  | { kind: "playerStr"; amount: number }
  | { kind: "playerHeal"; amount: number }
  | { kind: "playerRegen"; amount: number }
  | { kind: "playerThorns"; amount: number }
  | { kind: "playerDamage"; amount: number; roll?: number; band?: RollBand }
  | { kind: "enemyBlock"; enemy: number; amount: number }
  | { kind: "enemyBuff"; enemy: number; amount: number }
  | { kind: "poisonTick"; target: number; amount: number };

export type CombatResult = "continue" | "win" | "lose";
