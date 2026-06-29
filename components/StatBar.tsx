"use client";
import { useGame, HEROES, RELIC_BY_ID } from "@/store/useGame";
import { Icon } from "./icons";

export function StatBar() {
  const { run, openDeck } = useGame();
  if (!run) return null;
  const h = HEROES[run.cls];
  return (
    <div className="statbar">
      <span className="pill">
        {h.ico} {h.name}
      </span>
      <span className="pill" title="Акт">
        <Icon name="flag" /> Акт {run.act}
      </span>
      <span className="pill hp" title="Здоров'я">
        <Icon name="favorite" fill /> {run.pHp}/{run.pMax}
      </span>
      <span className="pill gold" title="Золото">
        <Icon name="paid" /> {run.gold}
      </span>
      <span className="pill">
        <a className="deckLink" onClick={openDeck} title="Колода">
          <Icon name="playing_cards" /> {run.deck.length}
        </a>
      </span>
      {run.relics.length > 0 && (
        <span className="pill">
          {run.relics.map((id, i) => {
            const r = RELIC_BY_ID[id];
            return (
              <span
                key={i}
                className="relicIco"
                title={r ? `${r.n}: ${r.d}` : id}
              >
                {r?.a}
              </span>
            );
          })}
        </span>
      )}
    </div>
  );
}
