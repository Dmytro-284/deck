"use client";
import { useGame, HEROES } from "@/store/useGame";
import type { RelicDef, Card } from "@/core";
import { CardView } from "./CardView";

function RelicCard({ r, onClick }: { r: RelicDef; onClick: () => void }) {
  return (
    <div className="relicCard" onClick={onClick}>
      <div className="ra">{r.a}</div>
      <h4>{r.n}</h4>
      <small>{r.d}</small>
    </div>
  );
}

function CardRow({
  cards,
  onPick,
}: {
  cards: Card[];
  onPick: (c: Card) => void;
}) {
  return (
    <div className="row">
      {cards.map((card, i) => (
        <CardView key={i} card={card} playable onClick={() => onPick(card)} />
      ))}
    </div>
  );
}

export function Modals() {
  const s = useGame();
  const m = s.modal;
  if (!m) return null;

  let body: React.ReactNode = null;

  if (m.kind === "reward") {
    body = (
      <>
        <h2>🏆 Бій виграно</h2>
        <p>Обери карту в колоду:</p>
        <CardRow cards={m.cards} onPick={s.chooseRewardCard} />
        <div style={{ marginTop: 16 }}>
          <button className="ghost" onClick={s.skipReward}>
            Пропустити карту ⟶
          </button>
        </div>
      </>
    );
  } else if (m.kind === "relicReward") {
    body = (
      <>
        <h2>✨ Реліквія</h2>
        <p>Обери пасивний бонус:</p>
        <div className="row">
          {m.relics.map((r) => (
            <RelicCard key={r.id} r={r} onClick={() => s.takeRelic(r.id)} />
          ))}
        </div>
      </>
    );
  } else if (m.kind === "event") {
    body = (
      <>
        <h2>❓ {m.ev.t}</h2>
        <p>{m.ev.d}</p>
        {m.ev.opts.map((o, i) => (
          <button key={i} className="opt" onClick={() => s.chooseEvent(i)}>
            {o.l}
          </button>
        ))}
      </>
    );
  } else if (m.kind === "grantRelic") {
    body = (
      <>
        <h2>✨ Реліквія</h2>
        <p>Обери:</p>
        <div className="row">
          {m.relics.map((r) => (
            <RelicCard key={r.id} r={r} onClick={() => s.grantRelicPick(r.id)} />
          ))}
        </div>
      </>
    );
  } else if (m.kind === "grantCard") {
    body = (
      <>
        <h2>🃏 Нова карта</h2>
        <p>Обери:</p>
        <CardRow cards={m.cards} onPick={s.grantCardPick} />
      </>
    );
  } else if (m.kind === "campfire") {
    const heal = s.run ? Math.round(s.run.pMax * 0.3) : 0;
    body = (
      <>
        <h2>🔥 Багаття</h2>
        <p>Перепочинок перед дорогою.</p>
        <div className="campfireBtns">
          <button onClick={s.rest}>😴 Відпочити → +{heal} HP</button>
          <button className="ghost" onClick={s.openSmith}>
            🔨 Прокачати карту
          </button>
          <button className="ghost" onClick={s.openRemove}>
            🗑 Прибрати карту
          </button>
        </div>
      </>
    );
  } else if (m.kind === "smith") {
    body = (
      <>
        <h2>🔨 Прокачати карту</h2>
        <p>Обери карту (+сила ефекту):</p>
        <div className="deckList">
          {m.cards.length === 0 && <p>Немає що качати.</p>}
          {m.cards.map((card, i) => (
            <CardView key={i} card={card} playable onClick={() => s.smith(card)} />
          ))}
        </div>
        <div style={{ marginTop: 14 }}>
          <button className="ghost" onClick={s.rest}>
            Передумати (відпочити)
          </button>
        </div>
      </>
    );
  } else if (m.kind === "remove") {
    body = (
      <>
        <h2>🗑 Прибрати карту</h2>
        <p>Обери карту, щоб назавжди прибрати її з колоди:</p>
        <div className="deckList">
          {m.cards.map((card, i) => (
            <CardView key={i} card={card} playable onClick={() => s.removeCard(card)} />
          ))}
        </div>
        <div style={{ marginTop: 14 }}>
          <button className="ghost" onClick={s.rest}>
            Передумати (відпочити)
          </button>
        </div>
      </>
    );
  } else if (m.kind === "tutorial") {
    body = (
      <>
        <div className="big">⚔</div>
        <h2>Як грати</h2>
        <div className="tutList">
          <p>
            🗺 <b>Мапа:</b> обирай наступний вузол угорі — бій, подія,
            магазин, багаття чи бос.
          </p>
          <p>
            🃏 <b>Карти:</b> тапни або <b>свайпни вгору</b>, щоб зіграти. Кожна
            коштує дію (кульки зверху).
          </p>
          <p>
            🎯 <b>Ціль:</b> тапни ворога, щоб вибрати ціль для одиночних атак.
          </p>
          <p>
            🎲 <b>Кидок d20:</b> кожна атака кидає d20 проти AC цілі. 20 — крит
            (×2 урон), 1 — схибив (½). Промаху нема — нижчий за AC кидок дає
            ковзний удар (½).
          </p>
          <p>
            🛡 <b>Обладунок</b> зникає щоходу; 🧪 отрута, 💢 вразливість, 📉
            слабкість, 💪 сила — стеж за бейджами.
          </p>
          <p>
            🔥 <b>Багаття:</b> лікуйся, прокачуй або прибирай карти. Після боса
            — благословіння й новий акт.
          </p>
        </div>
        <button onClick={s.dismissTutorial}>Зрозуміло ⚔</button>
      </>
    );
  } else if (m.kind === "fleeConfirm") {
    body = (
      <>
        <h2>🏃 Втекти з бою?</h2>
        <p>
          Втратиш {m.cost} HP. Бій зарахується пройденим, але{" "}
          <b>без нагороди</b>.
        </p>
        <button onClick={s.confirmFlee}>Втекти (−{m.cost} HP)</button>{" "}
        <button className="ghost" onClick={s.closeModal}>
          Лишитись
        </button>
      </>
    );
  } else if (m.kind === "deck") {
    body = (
      <>
        <h2>🃏 Твоя колода ({s.run?.deck.length})</h2>
        <div className="deckList">
          {s.run?.deck.map((card, i) => (
            <CardView key={i} card={card} />
          ))}
        </div>
        <div style={{ marginTop: 14 }}>
          <button onClick={s.closeModal}>Закрити</button>
        </div>
      </>
    );
  } else if (m.kind === "actBonus") {
    body = (
      <>
        <div className="big">🔥</div>
        <h2>Акт {m.act} — Благословіння</h2>
        <p>
          Боса повалено. Глибше — нові вороги й сильніший бос. Обери нагороду
          за прохід акту:
        </p>
        <button className="opt" onClick={() => s.chooseActBonus(0)}>
          💪 +12 макс. HP і повне зцілення
        </button>
        <button className="opt" onClick={() => s.chooseActBonus(1)}>
          ✨ Безкоштовна реліквія
        </button>
        <button className="opt" onClick={() => s.chooseActBonus(2)}>
          🪙 +{50 * m.act} золота і +30 HP
        </button>
      </>
    );
  } else if (m.kind === "win") {
    body = (
      <>
        <div className="big">👑</div>
        <h2>ПЕРЕМОГА!</h2>
        <p>Усі чотири акти пройдено, Володаря Порожнечі повалено.</p>
        <button onClick={s.toMenu}>У меню ⟲</button>
      </>
    );
  } else if (m.kind === "lose") {
    const name = s.run ? HEROES[s.run.cls].name : "Герой";
    const act = s.run?.act ?? 1;
    body = (
      <>
        <div className="big">💀</div>
        <h2>Поразка</h2>
        <p>
          {name} поліг в акті {act}.<br />
          Прогрес забігу втрачено.
        </p>
        <button onClick={s.toMenu}>У меню ⟲</button>
      </>
    );
  }

  return (
    <div className="overlay show">
      <div className="panel">{body}</div>
    </div>
  );
}
