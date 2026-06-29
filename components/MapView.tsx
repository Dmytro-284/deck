"use client";
import { useGame } from "@/store/useGame";
import { NODE_META } from "@/core";
import { reachable } from "@/core/engine";
import { StatBar } from "./StatBar";

export function MapView() {
  const { run, enterNode, toSelect } = useGame();
  if (!run) return null;
  const reach = reachable(run.map);
  return (
    <>
      <StatBar />
      <div className="mapNav">
        <button className="chip" onClick={toSelect}>
          ← Назад
        </button>
      </div>
      <div className="sub">Обери наступний вузол ↑</div>
      <div className="map">
        {run.map.rows.map((rw, r) => (
          <div className="maprow" key={r}>
            {rw.map((nd, i) => {
              const isReach = reach.row === r && reach.idx.includes(i);
              const isCur =
                run.map.cur && run.map.cur.row === r && run.map.cur.idx === i;
              const cls =
                "node" +
                (nd.done ? " done" : "") +
                (isReach ? " reach" : "") +
                (isCur ? " cur" : "");
              const m = NODE_META[nd.type];
              return (
                <div
                  className={cls}
                  key={i}
                  onClick={isReach ? () => enterNode(r, i) : undefined}
                >
                  <div className="ic">{m.ic}</div>
                  <div>{m.lbl}</div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </>
  );
}
