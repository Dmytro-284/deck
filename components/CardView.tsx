"use client";
import type { Card, Effect } from "@/core";

function effectDesc(e: Effect): string {
  const all = e.aoe ? " усім" : "";
  switch (e.k) {
    case "damage":
      return (e.hits && e.hits > 1 ? e.v + "×" + e.hits : e.v) + " урон" + all;
    case "block":
      return e.v + " обладунку";
    case "poison":
      return e.v + " отрути" + all;
    case "heal":
      return "+" + e.v + " HP";
    case "strength":
      return "+" + e.v + " сили";
    case "vulnerable":
      return e.v + " вразл." + all;
    case "weak":
      return e.v + " слабк." + all;
    case "regen":
      return e.v + " регену";
    case "thorns":
      return e.v + " шипів";
    case "draw":
      return "+" + e.v + " карт";
  }
}

export function cardDesc(c: Card): string {
  return c.effects.map(effectDesc).join(", ");
}

function tierLabel(t: Card["tier"]): string {
  return t === "r" ? "епічна" : t === "u" ? "рідк." : "база";
}

export function CardView({
  card,
  playable = false,
  dim = false,
  dealt = false,
  price,
  onClick,
}: {
  card: Card;
  playable?: boolean;
  dim?: boolean;
  dealt?: boolean;
  price?: number;
  onClick?: () => void;
}) {
  const cls =
    "card" +
    (dealt ? " dealt" : "") +
    (playable ? " playable" : "") +
    (dim ? " cheap" : "");
  return (
    <div
      className={cls}
      data-t={card.t}
      onClick={playable ? onClick : undefined}
      style={!playable && !onClick ? { cursor: "default" } : undefined}
    >
      <span className={"cBadge tier-" + card.tier}>{tierLabel(card.tier)}</span>
      <div className="cTop">
        <div className="cName">{card.n}</div>
        <div className="cCost">{card.cost}</div>
      </div>
      <div className="cArt">{card.art}</div>
      <div className="cDesc">{cardDesc(card)}</div>
      {price != null && <div className="cPrice">🪙 {price}</div>}
    </div>
  );
}
