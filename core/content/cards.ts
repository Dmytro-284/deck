import type { Card, CardDef, Effect, HeroKey } from "../types";

/* ---------------- effect builders (compact card authoring) ---------------- */
const dmg = (v: number, o: { hits?: number; aoe?: boolean } = {}): Effect => ({
  k: "damage",
  v,
  ...o,
});
const blk = (v: number): Effect => ({ k: "block", v });
const poi = (v: number, aoe = false): Effect =>
  aoe ? { k: "poison", v, aoe } : { k: "poison", v };
const heal = (v: number): Effect => ({ k: "heal", v });
const str = (v: number): Effect => ({ k: "strength", v });
const vuln = (v: number, aoe = false): Effect =>
  aoe ? { k: "vulnerable", v, aoe } : { k: "vulnerable", v };
const weak = (v: number, aoe = false): Effect =>
  aoe ? { k: "weak", v, aoe } : { k: "weak", v };
const regen = (v: number): Effect => ({ k: "regen", v });
const thorns = (v: number): Effect => ({ k: "thorns", v });
const draw = (v: number): Effect => ({ k: "draw", v });

/** Build a CardDef. */
function def(
  n: string,
  t: CardDef["t"],
  cost: number,
  art: string,
  effects: Effect[],
  tier: CardDef["tier"] = "c",
): CardDef {
  return { n, t, cost, art, tier, effects };
}

interface StarterEntry {
  card: CardDef;
  count: number;
}

/** Starter decks per hero (card definition + how many copies). */
export const STARTER_DECKS: Record<HeroKey, StarterEntry[]> = {
  knight: [
    { card: def("Удар", "atk", 1, "⚔", [dmg(6)]), count: 5 },
    { card: def("Захист", "blk", 1, "🛡", [blk(5)]), count: 3 },
    { card: def("Удар щитом", "atk", 1, "🛡", [dmg(4), blk(4)]), count: 1 },
    { card: def("Розлам", "atk", 2, "🔨", [dmg(10), str(2)]), count: 1 },
  ],
  mage: [
    { card: def("Іскра", "atk", 1, "✦", [dmg(5)]), count: 5 },
    { card: def("Мана-щит", "blk", 1, "🔵", [blk(6)]), count: 3 },
    { card: def("Отруйний дотик", "poison", 1, "🟢", [poi(7)]), count: 1 },
    { card: def("Вогнекуля", "atk", 2, "🔥", [dmg(9)]), count: 1 },
  ],
  rogue: [
    { card: def("Поріз", "atk", 1, "🗡", [dmg(5)]), count: 5 },
    { card: def("Ухил", "blk", 1, "💨", [blk(5)]), count: 3 },
    { card: def("Отруйний кинджал", "poison", 1, "🪛", [poi(6)]), count: 1 },
    { card: def("Серія", "atk", 1, "⚔", [dmg(4, { hits: 2 })]), count: 1 },
  ],
  berserk: [
    { card: def("Рубака", "atk", 1, "🪓", [dmg(7)]), count: 5 },
    { card: def("Шкура", "blk", 1, "🐻", [blk(4)]), count: 3 },
    { card: def("Розмах", "atk", 1, "🌀", [dmg(6, { aoe: true })]), count: 1 },
    { card: def("Шал", "atk", 2, "😤", [dmg(9), str(2)]), count: 1 },
  ],
  paladin: [
    { card: def("Молот", "atk", 1, "🔨", [dmg(6)]), count: 4 },
    { card: def("Щит віри", "blk", 1, "🛡", [blk(6)]), count: 4 },
    { card: def("Молитва", "heal", 1, "🙏", [heal(6)]), count: 1 },
    { card: def("Свята кара", "atk", 2, "✨", [dmg(12), str(1)]), count: 1 },
  ],
  hunter: [
    { card: def("Постріл", "atk", 1, "🏹", [dmg(6)]), count: 5 },
    { card: def("Пастка", "blk", 1, "🪤", [blk(5)]), count: 3 },
    { card: def("Отруйна стріла", "poison", 1, "🎯", [poi(6)]), count: 1 },
    {
      card: def("Подвійний постріл", "atk", 1, "🏹", [dmg(4, { hits: 2 })]),
      count: 1,
    },
  ],
  druid: [
    { card: def("Кіготь", "atk", 1, "🐾", [dmg(6)]), count: 4 },
    { card: def("Кора", "blk", 1, "🌳", [blk(5)]), count: 3 },
    { card: def("Шипшина", "skill", 1, "🌵", [thorns(3)]), count: 1 },
    { card: def("Цілющий пагін", "skill", 1, "🌱", [regen(3)]), count: 1 },
    { card: def("Отруйні спори", "poison", 1, "🍄", [poi(6)]), count: 1 },
  ],
  warlock: [
    { card: def("Темний дотик", "atk", 1, "🌑", [dmg(5)]), count: 4 },
    { card: def("Тіньовий щит", "blk", 1, "🌫", [blk(5)]), count: 3 },
    { card: def("Прокляття", "skill", 1, "💀", [vuln(2)]), count: 1 },
    { card: def("Виснаження", "skill", 1, "📉", [weak(2)]), count: 1 },
    { card: def("Згубний потік", "poison", 1, "🟣", [poi(6)]), count: 1 },
  ],
  // ---- епічні / легендарні (grid fill-ins) ----
  inquisitor: [
    { card: def("Кара", "atk", 1, "⚖", [dmg(8)]), count: 4 },
    { card: def("Захист віри", "blk", 1, "🛡", [blk(7)]), count: 3 },
    { card: def("Осуд", "skill", 1, "📿", [vuln(2)]), count: 2 },
    { card: def("Свята кара", "atk", 2, "✨", [dmg(12), str(1)]), count: 1 },
  ],
  champion: [
    { card: def("Удар чемпіона", "atk", 1, "🏅", [dmg(9)]), count: 4 },
    { card: def("Сталевий захист", "blk", 1, "🛡", [blk(8)]), count: 3 },
    { card: def("Бойовий клич", "str", 0, "📣", [str(2)]), count: 2 },
    { card: def("Нищівний удар", "atk", 2, "🔨", [dmg(14), vuln(2)]), count: 1 },
  ],
  archmage: [
    { card: def("Іскра", "atk", 1, "✦", [dmg(6)]), count: 4 },
    { card: def("Мана-щит", "blk", 1, "🔵", [blk(6)]), count: 3 },
    { card: def("Ланцюг блискавок", "atk", 1, "⚡", [dmg(5, { aoe: true })]), count: 2 },
    { card: def("Метеор", "atk", 2, "☄", [dmg(12, { aoe: true })]), count: 1 },
  ],
  nightblade: [
    { card: def("Поріз", "atk", 1, "🗡", [dmg(5)]), count: 4 },
    { card: def("Ухил", "blk", 1, "💨", [blk(5)]), count: 3 },
    { card: def("Подвійний удар", "atk", 1, "⚔", [dmg(4, { hits: 2 })]), count: 2 },
    { card: def("Отруйний кинджал", "poison", 1, "🪛", [poi(8)]), count: 1 },
  ],
  reaper: [
    { card: def("Змах коси", "atk", 1, "☠", [dmg(6)]), count: 4 },
    { card: def("Тінь", "blk", 1, "🌫", [blk(5)]), count: 3 },
    { card: def("Серія ударів", "atk", 1, "⚔", [dmg(4, { hits: 3 })]), count: 2 },
    { card: def("Жнива", "atk", 2, "🌾", [dmg(10), poi(4)]), count: 1 },
  ],
  warden: [
    { card: def("Удар щита", "atk", 1, "🛡", [dmg(5), blk(3)]), count: 4 },
    { card: def("Стіна", "blk", 1, "🧱", [blk(8)]), count: 3 },
    { card: def("Шипи", "skill", 1, "🌵", [thorns(4)]), count: 2 },
    { card: def("Контратака", "atk", 2, "⚔", [dmg(8), thorns(3)]), count: 1 },
  ],
  colossus: [
    { card: def("Таран", "atk", 1, "🐏", [dmg(8)]), count: 4 },
    { card: def("Бастіон", "blk", 1, "🧱", [blk(9)]), count: 3 },
    { card: def("Сила гори", "str", 0, "⛰", [str(2)]), count: 2 },
    { card: def("Землетрус", "atk", 2, "🌋", [dmg(10, { aoe: true })]), count: 1 },
  ],
  bastion: [
    { card: def("Молот", "atk", 1, "🔨", [dmg(9)]), count: 4 },
    { card: def("Незрушність", "blk", 1, "🏰", [blk(10)]), count: 3 },
    { card: def("Терни", "skill", 1, "🌵", [thorns(5)]), count: 2 },
    { card: def("Кара титана", "atk", 2, "⚒", [dmg(14), str(1)]), count: 1 },
  ],
};

/** Reward / shop card pool. */
export const CARD_POOL: CardDef[] = [
  // — uncommon —
  def("Важкий удар", "atk", 2, "🪓", [dmg(16)], "u"),
  def("Шквал", "atk", 1, "🗡", [dmg(5, { hits: 2 })], "u"),
  def("Залізна шкіра", "blk", 2, "🪖", [blk(13)], "u"),
  def("Бойовий клич", "str", 0, "📣", [str(3)], "u"),
  def("Отрута", "poison", 1, "🧪", [poi(6)], "u"),
  def("Друге дихання", "heal", 1, "❤", [heal(9)], "u"),
  def("Блискавка", "atk", 1, "⚡", [dmg(9)], "u"),
  def("Кам’яна стіна", "blk", 1, "🧱", [blk(8)], "u"),
  def("Вибух", "atk", 2, "💥", [dmg(9, { aoe: true })], "u"),
  def("Отруйний туман", "poison", 2, "🌫", [poi(5, true)], "u"),
  def("Подвійний удар", "atk", 1, "⚔", [dmg(6, { hits: 2 })], "u"),
  def("Розкол щита", "atk", 2, "🪓", [dmg(14), str(1)], "u"),
  def("Барикада", "blk", 2, "🚧", [blk(16)], "u"),
  def("Отруйне лезо", "poison", 1, "🗡", [poi(8)], "u"),
  def("Зосередження", "str", 1, "🧘", [str(4)], "u"),
  def("Град стріл", "atk", 2, "🏹", [dmg(6, { hits: 3 })], "u"),
  def("Крижаний осколок", "atk", 1, "❄", [dmg(11)], "u"),
  def("Свята земля", "blk", 2, "✨", [blk(12), str(1)], "u"),
  // — status / utility (new) —
  def("Пробій", "atk", 1, "🔻", [dmg(5), vuln(2)], "u"),
  def("Оголення", "skill", 1, "🎯", [vuln(3)], "u"),
  def("Послаблення", "skill", 1, "💢", [weak(2)], "u"),
  def("Зневіра", "skill", 1, "📉", [weak(2, true)], "u"),
  def("Шипи", "skill", 1, "🌵", [thorns(4)], "u"),
  def("Друге серце", "skill", 1, "💗", [regen(3)], "u"),
  def("Прозріння", "skill", 1, "🔮", [draw(2)], "u"),
  def("Бойовий транс", "skill", 1, "🌀", [str(2), draw(1)], "u"),
  // — rare —
  def("Лють берсерка", "atk", 2, "😡", [dmg(7, { hits: 2 }), str(1)], "r"),
  def("Священний щит", "blk", 2, "✨", [blk(10), str(2)], "r"),
  def("Метеор", "atk", 3, "☄", [dmg(24, { aoe: true })], "r"),
  def("Чумний вихор", "poison", 2, "☠", [poi(9, true)], "r"),
  def("Шквал клинків", "atk", 2, "🌪", [dmg(5, { hits: 4 })], "r"),
  def("Гнів небес", "atk", 3, "⚡", [dmg(20, { aoe: true })], "r"),
  def("Невгасима лють", "str", 1, "🔥", [str(6)], "r"),
  def("Чумна бомба", "poison", 2, "💣", [poi(12, true)], "r"),
  def("Останній рубіж", "blk", 3, "🏰", [blk(26), str(2)], "r"),
  def("Нищівний удар", "atk", 2, "🔨", [dmg(12), vuln(2)], "r"),
  def("Терновий обладунок", "skill", 2, "🌵", [thorns(7), blk(6)], "r"),
  def("Молитва зцілення", "skill", 2, "🙏", [regen(5), heal(6)], "r"),
  def("Розрив реальності", "atk", 3, "🕳", [dmg(8, { aoe: true }), vuln(2, true)], "r"),
];

/** Expand a hero's starter deck into individual card instances. */
export function buildStarterDeck(hero: HeroKey): Card[] {
  const out: Card[] = [];
  for (const { card, count } of STARTER_DECKS[hero]) {
    for (let i = 0; i < count; i++) out.push({ ...card, effects: card.effects.map((e) => ({ ...e })) });
  }
  return out;
}
