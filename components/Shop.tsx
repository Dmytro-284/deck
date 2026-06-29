"use client";
import { useGame } from "@/store/useGame";
import type { ShopItem } from "@/core/engine";
import { StatBar } from "./StatBar";
import { CardView } from "./CardView";
import { Icon } from "./icons";

export function Shop() {
  const { run, shop, buyCard, buyRelic, leaveShop } = useGame();
  if (!run || !shop) return null;
  return (
    <>
      <StatBar />
      <div className="sub">🛒 Магазин — витрать золото</div>
      <div className="row">
        {shop.stock.map((item: ShopItem & { sold?: boolean }, idx) => {
          const afford = run.gold >= item.price && !item.sold;
          return (
            <div key={idx} style={{ opacity: item.sold ? 0.3 : 1 }}>
              <CardView
                card={item.card}
                price={item.price}
                playable={afford}
                onClick={() => buyCard(idx)}
              />
            </div>
          );
        })}
      </div>

      {shop.relic && (
        <div style={{ textAlign: "center", marginTop: 14 }}>
          <div
            className="relicCard"
            style={{
              display: "inline-block",
              cursor: run.gold >= shop.relic.price ? "pointer" : "not-allowed",
            }}
            onClick={buyRelic}
          >
            <div className="ra">{shop.relic.r.a}</div>
            <h4>{shop.relic.r.n}</h4>
            <small>{shop.relic.r.d}</small>
            <div style={{ marginTop: 6, color: "var(--gold)", fontWeight: 700 }}>
              <Icon name="paid" /> {shop.relic.price}
            </div>
          </div>
        </div>
      )}

      <div className="center" style={{ marginTop: 18 }}>
        <button onClick={leaveShop}>
          Вийти <Icon name="arrow_forward" size={16} />
        </button>
      </div>
    </>
  );
}
