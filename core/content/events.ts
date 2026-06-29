// Map "event" node content as data. Effects are declarative descriptors the
// store applies, so this stays pure/serializable.

export interface EventOption {
  l: string; // label
  hp?: number; // HP delta (negative clamps to min 1, positive clamps to max)
  maxHp?: number; // permanent max-HP delta (positive also heals that much)
  goldPerAct?: number; // gold gained, multiplied by current act
  grant?: "relic" | "card" | "remove"; // opens a pick / removal sub-screen
  gamble?: boolean; // 50/50: win => goldPerAct gold, lose => |hp| HP
  leave?: boolean; // just close
}

export interface GameEvent {
  t: string; // title
  d: string; // description
  opts: EventOption[];
}

export const EVENTS: GameEvent[] = [
  {
    t: "Загадковий вівтар",
    d: "Старий вівтар просить жертви крові.",
    opts: [
      { l: "Пожертвувати 8 HP → реліквія", hp: -8, grant: "relic" },
      { l: "Піти геть", leave: true },
    ],
  },
  {
    t: "Скриня мандрівника",
    d: "Запилена скриня. Замок крихкий.",
    opts: [
      { l: "Відкрити → +золото", goldPerAct: 40 },
      { l: "Обережно оглянути → +15 HP", hp: 15 },
    ],
  },
  {
    t: "Багаття чужинця",
    d: "Дивний мандрівник пропонує навчити прийому.",
    opts: [
      { l: "Прийняти → карта в колоду", grant: "card" },
      { l: "Відмовитись → +золото", goldPerAct: 20 },
    ],
  },
  {
    t: "Вівтар життя",
    d: "Древній вівтар пульсує силою життя. Він готовий поділитися — назавжди.",
    opts: [
      { l: "Прийняти благословення → +8 макс. HP", maxHp: 8 },
      { l: "Не торкатися", leave: true },
    ],
  },
  {
    t: "Примарний гравець",
    d: "Тінь за столом трясе кістками. «Одна гра — і доля твоя зміниться».",
    opts: [
      { l: "Кинути кості (50/50: +золото або −12 HP)", gamble: true, goldPerAct: 60, hp: -12 },
      { l: "Відійти від столу", leave: true },
    ],
  },
  {
    t: "Кузня забуття",
    d: "Холодне полум'я може спопелити одну карту — так, наче її й не було.",
    opts: [
      { l: "Спалити карту (прибрати з колоди)", grant: "remove" },
      { l: "Піти геть", leave: true },
    ],
  },
];
