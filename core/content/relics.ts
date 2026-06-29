import type { RelicDef, RelicId } from "../types";

export const RELICS: RelicDef[] = [
  { id: "krug", n: "Кругляк", a: "🪨", d: "Старт бою: +6 обладунку", eff: { startBlock: 6 } },
  { id: "kinj", n: "Кинджал", a: "🗡", d: "Старт бою: +2 сили", eff: { startStr: 2 } },
  { id: "toch", n: "Точило", a: "🪛", d: "Усі атаки +2 урону", eff: { atkBonus: 2 } },
  { id: "pero", n: "Перо", a: "🪶", d: "+1 карта в добір щоходу", eff: { drawBonus: 1 } },
  { id: "chasha", n: "Чаша", a: "🏆", d: "+1 дія за хід", eff: { energyBonus: 1 } },
  { id: "amul", n: "Амулет крові", a: "🩸", d: "Після бою: +7 HP", eff: { endHeal: 7 } },
  { id: "igla", n: "Отруйна голка", a: "💉", d: "Атаки додають 1 отрути", eff: { atkPoison: 1 } },
  { id: "kulon", n: "Кулон", a: "📿", d: "Старт бою: +3 обладунку, +1 сила", eff: { startBlock: 3, startStr: 1 } },
  { id: "rune", n: "Руна сили", a: "🔮", d: "Усі атаки +3 урону", eff: { atkBonus: 3 } },
  { id: "serce", n: "Кам’яне серце", a: "🫀", d: "Старт бою: +10 обладунку", eff: { startBlock: 10 } },
  { id: "grail", n: "Святий Грааль", a: "🏆", d: "Старт бою: +5 обладунку; після бою +5 HP", eff: { startBlock: 5, endHeal: 5 } },
  { id: "sagai", n: "Сагайдак", a: "🏹", d: "Атаки додають 1 отрути; +1 карта в добір", eff: { atkPoison: 1, drawBonus: 1 } },
  { id: "fokus", n: "Лінза фокусу", a: "🔍", d: "+1 дія за хід; усі атаки +1 урону", eff: { energyBonus: 1, atkBonus: 1 } },
  { id: "feniks", n: "Перо фенікса", a: "🔥", d: "Після бою: +12 HP", eff: { endHeal: 12 } },
  { id: "totem", n: "Тотем життя", a: "🪵", d: "Старт бою: +4 обладунку; після бою +6 HP", eff: { startBlock: 4, endHeal: 6 } },
  { id: "cherep", n: "Череп чаклуна", a: "💀", d: "Атаки додають 2 отрути", eff: { atkPoison: 2 } },
];

export const RELIC_BY_ID: Record<RelicId, RelicDef> = Object.fromEntries(
  RELICS.map((r) => [r.id, r]),
);
