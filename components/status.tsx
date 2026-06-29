"use client";
/**
 * Single source of truth for combat status visuals (icon + label + badge class).
 * Badges, intents and tooltips all render from here, so adding or restyling a
 * status is one edit, not three. Glyphs are themed inline SVGs from
 * `combaticons.tsx`; colours live in `app/globals.css` under the `b-*` classes.
 */
import type { ComponentType } from "react";
import {
  Shield,
  UpArrow,
  DownArrow,
  Poison,
  Bullseye,
  HealPlus,
  Thorns,
  Sword,
} from "./combaticons";

export type StatusKey =
  | "block"
  | "str"
  | "poison"
  | "vuln"
  | "weak"
  | "regen"
  | "thorns";

export interface StatusDef {
  Glyph: ComponentType; // themed SVG icon (tints via currentColor)
  label: string; // Ukrainian display name (tooltip / aria)
  badge: string; // CSS class for the badge pill
}

export const STATUS: Record<StatusKey, StatusDef> = {
  block: { Glyph: Shield, label: "Броня", badge: "b-block" },
  str: { Glyph: UpArrow, label: "Сила", badge: "b-str" },
  poison: { Glyph: Poison, label: "Отрута", badge: "b-poison" },
  vuln: { Glyph: Bullseye, label: "Вразливість", badge: "b-vuln" },
  weak: { Glyph: DownArrow, label: "Слабкість", badge: "b-weak" },
  regen: { Glyph: HealPlus, label: "Реген", badge: "b-regen" },
  thorns: { Glyph: Thorns, label: "Шипи", badge: "b-thorns" },
};

/** Enemy intent glyphs, keyed by the engine intent type. */
export const INTENT: Record<"atk" | "blk" | "buff", ComponentType> = {
  atk: Sword,
  blk: Shield,
  buff: UpArrow,
};

/** A status pill (e.g. shield + 5) rendered from the registry. */
export function Badge({ s, v }: { s: StatusKey; v: number }) {
  const { Glyph, badge, label } = STATUS[s];
  return (
    <span className={"badge " + badge} title={label}>
      <Glyph /> {v}
    </span>
  );
}
