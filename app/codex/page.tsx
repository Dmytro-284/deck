"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  HEROES,
  HERO_KEYS,
  STARTER_DECKS,
  CARD_POOL,
  RELICS,
  RELIC_BY_ID,
  ACT_LORE,
  HERO_LORE,
  ENEMY_LORE,
  WORLD,
  listBestiary,
  type CardDef,
  type CardType,
} from "@/core";
import { Sprite } from "@/components/Sprite";
import { CardView } from "@/components/CardView";

type Tab = "lore" | "heroes" | "cards" | "relics" | "bestiary";

const TABS: { id: Tab; label: string }[] = [
  { id: "lore", label: "📜 Лор" },
  { id: "heroes", label: "🦸 Герої" },
  { id: "cards", label: "🃏 Картки" },
  { id: "relics", label: "✨ Реліквії" },
  { id: "bestiary", label: "👹 Бестіарій" },
];

const TYPE_FILTERS: { id: CardType | "all"; label: string }[] = [
  { id: "all", label: "Усі" },
  { id: "atk", label: "Атака" },
  { id: "blk", label: "Блок" },
  { id: "poison", label: "Отрута" },
  { id: "heal", label: "Лік" },
  { id: "str", label: "Сила" },
  { id: "skill", label: "Вміння" },
];

function paras(text: string) {
  return text.split("\n\n").map((p, i) => <p key={i}>{p}</p>);
}

/* ----------------------------- Lore ----------------------------- */
function LoreTab() {
  return (
    <div className="codexCol">
      <div className="loreCard intro">
        <h2>
          {WORLD.name} <span className="loreTag">— {WORLD.tagline}</span>
        </h2>
        <div className="loreBody">{paras(WORLD.intro)}</div>
      </div>
      {ACT_LORE.map((a) => (
        <div className={"loreCard act" + a.act} key={a.act}>
          <div className="loreHead">
            <Sprite k={a.bossSprite} className="loreSpr" />
            <div>
              <div className="loreActNo">Акт {a.act}</div>
              <h3>{a.name}</h3>
              <div className="lorePlace">{a.place}</div>
            </div>
          </div>
          <div className="loreBody">{paras(a.story)}</div>
          <div className="loreBoss">👑 Бос: {a.boss}</div>
        </div>
      ))}
    </div>
  );
}

/* ----------------------------- Heroes --------------------------- */
function HeroesTab() {
  return (
    <div className="codexCol">
      {HERO_KEYS.map((k) => {
        const h = HEROES[k];
        const lore = HERO_LORE[k];
        const relic = RELIC_BY_ID[h.relic];
        return (
          <div className="heroEntry" key={k}>
            <div className="heroSide">
              <Sprite k={h.sprite} className="heroSpr" />
              <div className="heroName">
                {h.ico} {h.name}
              </div>
              <div className="heroFaction">{lore?.faction}</div>
              <div className="heroStats">
                <span className="pill">❤ {h.hp} HP</span>
              </div>
              {relic && (
                <div className="heroRelic" title={relic.d}>
                  {relic.a} {relic.n}
                  <small>{relic.d}</small>
                </div>
              )}
            </div>
            <div className="heroMain">
              <p className="heroDesc">{h.d}</p>
              <div className="loreBody">{paras(lore?.story ?? "")}</div>
              <div className="heroDeckLbl">Стартова колода</div>
              <div className="codexCards small">
                {STARTER_DECKS[k].map((entry, i) => (
                  <div className="deckSlot" key={i}>
                    <CardView card={entry.card} />
                    {entry.count > 1 && (
                      <span className="deckCount">×{entry.count}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ----------------------------- Cards ---------------------------- */
function CardsTab() {
  const [filter, setFilter] = useState<CardType | "all">("all");
  const starter: CardDef[] = [];
  const seen = new Set<string>();
  for (const k of HERO_KEYS) {
    for (const { card } of STARTER_DECKS[k]) {
      if (!seen.has(card.n)) {
        seen.add(card.n);
        starter.push(card);
      }
    }
  }
  const keep = (c: CardDef) => filter === "all" || c.t === filter;
  const starterF = starter.filter(keep);
  const poolF = CARD_POOL.filter(keep);

  return (
    <div className="codexCol">
      <div className="filterRow">
        {TYPE_FILTERS.map((f) => (
          <button
            key={f.id}
            className={"chip" + (filter === f.id ? " on" : "")}
            onClick={() => setFilter(f.id)}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="codexSection">
        <h3>Стартові карти ({starterF.length})</h3>
        <div className="codexCards">
          {starterF.map((c, i) => (
            <CardView card={c} key={"s" + i} />
          ))}
          {starterF.length === 0 && <p className="empty">Нічого не знайдено.</p>}
        </div>
      </div>

      <div className="codexSection">
        <h3>Нагороди й магазин ({poolF.length})</h3>
        <div className="codexCards">
          {poolF.map((c, i) => (
            <CardView card={c} key={"p" + i} />
          ))}
          {poolF.length === 0 && <p className="empty">Нічого не знайдено.</p>}
        </div>
      </div>
    </div>
  );
}

/* ---------------------------- Relics ---------------------------- */
function RelicsTab() {
  return (
    <div className="beastGrid">
      {RELICS.map((r) => (
        <div className="beast" key={r.id}>
          <div className="relicBig">{r.a}</div>
          <div className="beastName">{r.n}</div>
          <p className="beastLore">{r.d}</p>
        </div>
      ))}
    </div>
  );
}

/* --------------------------- Bestiary --------------------------- */
function BestiaryTab() {
  const beasts = listBestiary();
  return (
    <div className="beastGrid">
      {beasts.map((b, i) => {
        const isBoss = b.tiers.includes("boss");
        const isElite = !isBoss && b.tiers.includes("elite");
        return (
          <div className={"beast" + (isBoss ? " boss" : "")} key={i}>
            <Sprite k={b.spr} className="beastSpr" />
            <div className="beastName">{b.name}</div>
            <div className="beastTags">
              {isBoss && <span className="tag boss">Бос</span>}
              {isElite && <span className="tag elite">Еліт</span>}
              {b.acts.map((a) => (
                <span className="tag act" key={a}>
                  Акт {a}
                </span>
              ))}
            </div>
            <div className="beastHp">
              ❤ {b.minHp === b.maxHp ? b.minHp : b.minHp + "–" + b.maxHp}
            </div>
            <p className="beastLore">{ENEMY_LORE[b.spr]}</p>
          </div>
        );
      })}
    </div>
  );
}

export default function CodexPage() {
  const [tab, setTab] = useState<Tab>("lore");
  useEffect(() => {
    document.body.className = "act1";
  }, []);

  return (
    <div className="wrap codex">
      <h1>📖 КОДЕКС</h1>
      <div className="sub">бібліотека світу Емберхольд</div>

      <div className="codexNav">
        <Link href="/play" className="chip">
          ← Назад
        </Link>
      </div>

      <div className="codexTabs">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={"chip" + (tab === t.id ? " on" : "")}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "lore" && <LoreTab />}
      {tab === "heroes" && <HeroesTab />}
      {tab === "cards" && <CardsTab />}
      {tab === "relics" && <RelicsTab />}
      {tab === "bestiary" && <BestiaryTab />}
    </div>
  );
}
