"use client";
import { useState } from "react";
import Link from "next/link";
import { useGame, HEROES, RELIC_BY_ID, todayKey } from "@/store/useGame";
import {
  HERO_GRID,
  STARTER_DECKS,
  ARCHETYPE_ORDER,
  HERO_TIER_ORDER,
  ARCHETYPE_LABEL,
  HERO_TIER_LABEL,
  HERO_LORE,
  isUnlocked,
  unlockCost,
  lineOf,
  type HeroKey,
} from "@/core";
import { Sprite } from "./Sprite";
import { CardView } from "./CardView";
import { Icon } from "./icons";

/** Locked-hero detail + purchase modal. */
function HeroInfo({
  hk,
  coins,
  onBuy,
  onClose,
}: {
  hk: HeroKey;
  coins: number;
  onBuy: () => void;
  onClose: () => void;
}) {
  const h = HEROES[hk];
  const cost = unlockCost(hk);
  const afford = coins >= cost;
  const relic = RELIC_BY_ID[h.relic];
  const lore = HERO_LORE[hk];
  return (
    <div className="overlay show" onClick={onClose}>
      <div className="panel heroInfo" onClick={(e) => e.stopPropagation()}>
        <button className="heroInfoX chip" onClick={onClose} title="Закрити">
          <Icon name="close" size={18} />
        </button>
        <div className="heroInfoHead">
          <Sprite k={h.sprite} className="heroInfoSpr" data-hero={hk} />
          <div className="heroInfoMeta">
            <h2>
              {h.ico} {h.name}
            </h2>
            <div className="heroInfoTags">
              <span className={"tag tier-" + h.htier}>{HERO_TIER_LABEL[h.htier]}</span>
              <span className="tag">{ARCHETYPE_LABEL[h.archetype]}</span>
              <span className="tag">❤ {h.hp} HP</span>
            </div>
          </div>
        </div>

        <p className="heroInfoDesc">{h.d}</p>
        {lore?.story ? <p className="heroInfoLore">{lore.story}</p> : null}

        {relic && (
          <div className="heroRelic" title={relic.d}>
            {relic.a} {relic.n}
            <small>{relic.d}</small>
          </div>
        )}

        <div className="heroDeckLbl">Стартова колода</div>
        <div className="codexCards small">
          {STARTER_DECKS[hk].map((entry, i) => (
            <div className="deckSlot" key={i}>
              <CardView card={entry.card} />
              {entry.count > 1 && <span className="deckCount">×{entry.count}</span>}
            </div>
          ))}
        </div>

        <div className="heroInfoBuy">
          <button className="gold" disabled={!afford} onClick={onBuy}>
            <Icon name="lock_open" size={16} /> Відкрити за 🪙 {cost}
          </button>
          {!afford && <div className="heroInfoNeed">Не вистачає монет (у тебе 🪙 {coins})</div>}
        </div>
      </div>
    </div>
  );
}

export function ClassSelect() {
  const { newRun, resume, saved, profile, unlockHero, recentAch } = useGame();
  const [daily, setDaily] = useState(false);
  const [infoKey, setInfoKey] = useState<HeroKey | null>(null);

  return (
    <div className="center">
      {/* Only offer "continue" once the player actually entered a node — a
          freshly picked-but-unplayed run (map.cur still null) isn't resumable. */}
      {saved && saved.map?.cur && (
        <div className="continueBar">
          <button className="gold" onClick={resume}>
            ▶ Продовжити ({HEROES[saved.cls].name}, акт {saved.act})
          </button>
        </div>
      )}

      {recentAch.length > 0 && (
        <div className="achBanner">
          🏆 Нові досягнення: {recentAch.map((a) => a.name).join(", ")}
        </div>
      )}

      <div className="modeRow">
        <button className={"chip" + (!daily ? " on" : "")} onClick={() => setDaily(false)}>
          Лінія актів
        </button>
        <button className={"chip" + (daily ? " on" : "")} onClick={() => setDaily(true)}>
          🗓 Щоденний
        </button>
        <Link href="/leaderboard" className="chip">
          🏆 Лідери
        </Link>
        <Link href="/achievements" className="chip">
          🎖 Досягнення
        </Link>
        <span className="coinsPill" title="Твоя валюта для розблокування">
          🪙 {profile.coins}
        </span>
      </div>

      {daily && (
        <div className="cloudNote">
          Однаковий сід для всіх сьогодні ({todayKey()}). Результат — у щоденний рейтинг.
        </div>
      )}

      <div className="heroGridScroll">
        <div className="heroGrid">
          <div className="hgCorner" />
          {HERO_TIER_ORDER.map((t) => (
            <div className="hgColHead" key={t}>
              {HERO_TIER_LABEL[t]}
            </div>
          ))}

          {ARCHETYPE_ORDER.map((a) => (
            <div className="hgContents" key={a}>
              <div className="hgRowHead">{ARCHETYPE_LABEL[a]}</div>
              {HERO_TIER_ORDER.map((t) => {
                const k = HERO_GRID[a][t];
                const h = HEROES[k];
                const unlocked = isUnlocked(profile, k);
                const cost = unlockCost(k);
                const line = lineOf(profile, k);
                return (
                  <div
                    key={k}
                    className={"hgCell tier-" + t + (unlocked ? " owned" : " locked")}
                    data-hero={k}
                    title={unlocked ? h.d : "Натисни, щоб переглянути й відкрити"}
                    onClick={unlocked ? () => newRun(k, daily) : () => setInfoKey(k)}
                  >
                    <Sprite k={h.sprite} className="hgSpr" />
                    <div className="hgName">{h.name}</div>
                    <div className="hgHp">❤ {h.hp}</div>
                    {unlocked ? (
                      line.level > 1 || line.xp > 0 ? (
                        <div className="hgLevel">Рів. {line.level}</div>
                      ) : null
                    ) : (
                      <div className="hgCost">
                        <Icon name="lock" size={12} /> {cost}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {infoKey && (
        <HeroInfo
          hk={infoKey}
          coins={profile.coins}
          onClose={() => setInfoKey(null)}
          onBuy={() => {
            if (unlockHero(infoKey)) setInfoKey(null);
          }}
        />
      )}
    </div>
  );
}
