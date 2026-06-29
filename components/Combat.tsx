"use client";
import { useRef, useState } from "react";
import { useGame, HEROES } from "@/store/useGame";
import { aliveIdx, curTarget } from "@/core/engine";
import type { CombatState, RunState } from "@/core/state";
import type { Card } from "@/core";
import { Sprite } from "./Sprite";
import { CardView } from "./CardView";
import { useDeltaFx, FloatLayer } from "./fx";
import { Badge, INTENT } from "./status";
import { Icon } from "./icons";
import { Skull, Bullseye } from "./combaticons";
import { StatBar } from "./StatBar";

/** A hand card playable by tap or swipe-up (mobile-friendly). */
function HandCard({
  card,
  can,
  onPlay,
}: {
  card: Card;
  can: boolean;
  onPlay: () => void;
}) {
  const start = useRef<{ x: number; y: number } | null>(null);
  const swiped = useRef(false);
  return (
    <div
      className="handCard"
      onPointerDown={(e) => {
        start.current = { x: e.clientX, y: e.clientY };
        swiped.current = false;
      }}
      onPointerUp={(e) => {
        const s = start.current;
        start.current = null;
        if (!s) return;
        const dy = e.clientY - s.y;
        const dx = e.clientX - s.x;
        if (dy < -36 && Math.abs(dx) < 70) {
          swiped.current = true;
          if (can) onPlay();
        }
      }}
      onClick={() => {
        if (swiped.current) {
          swiped.current = false;
          return;
        }
        if (can) onPlay();
      }}
    >
      <CardView card={card} dealt playable={can} dim={!can} />
    </div>
  );
}

/** Last log line with a tap-to-expand history. */
function LogBar({ log, logs }: { log: string; logs: string[] }) {
  const [open, setOpen] = useState(false);
  const many = logs.length > 1;
  return (
    <div className="logWrap">
      <div
        className="log"
        onClick={() => many && setOpen((o) => !o)}
        style={many ? { cursor: "pointer" } : undefined}
      >
        {log || "—"}
        {many && <span className="logToggle">{open ? " ▴" : " ▾"}</span>}
      </div>
      {open && (
        <div className="logList">
          {logs
            .slice()
            .reverse()
            .map((l, i) => (
              <div key={i}>{l}</div>
            ))}
        </div>
      )}
    </div>
  );
}

function HpBar({ hp, max, wide }: { hp: number; max: number; wide?: boolean }) {
  return (
    <div className={"hpbar" + (wide ? " wide" : "")}>
      <div
        className="hpfill"
        style={{ width: (100 * Math.max(0, hp)) / max + "%" }}
      />
      <div className="hptxt">
        {Math.max(0, hp)} / {max}
      </div>
    </div>
  );
}

function EnemyActor({
  c,
  i,
}: {
  c: CombatState;
  i: number;
}) {
  const setTarget = useGame((s) => s.setTarget);
  const e = c.enemies[i];
  const { floats, shake } = useDeltaFx(e.hp);
  const multi = aliveIdx(c).length > 1;
  const targeted = !e.dead && multi && curTarget(c) === i;
  const it = e.it[e.ii];
  const ItIcon = it ? INTENT[it.t] : null;
  return (
    <div
      className={
        "actor enemyA" +
        (e.dead ? " dead" : "") +
        (targeted ? " targeted" : "") +
        (shake ? " shake" : "")
      }
      onClick={() => setTarget(i)}
    >
      <FloatLayer floats={floats} />
      {!e.dead && it && ItIcon && (
        <div className={"intent " + it.t + (targeted ? " targeted" : "")}>
          {targeted && (
            <span className="intentTarget">
              <Bullseye />
            </span>
          )}
          <ItIcon /> {it.t === "atk" ? it.v + (e.str ?? 0) : it.v}
        </div>
      )}
      <div className="badges">
        {e.block > 0 && <Badge s="block" v={e.block} />}
        {(e.str ?? 0) > 0 && <Badge s="str" v={e.str ?? 0} />}
        {e.pois > 0 && <Badge s="poison" v={e.pois} />}
        {(e.vuln ?? 0) > 0 && <Badge s="vuln" v={e.vuln ?? 0} />}
        {(e.weak ?? 0) > 0 && <Badge s="weak" v={e.weak ?? 0} />}
      </div>
      <Sprite k={e.spr} className="sprite bob" />
      <div className="nameRow">
        <Skull /> {e.n}
      </div>
      <HpBar hp={e.hp} max={e.max} />
    </div>
  );
}

function PlayerActor({ run, c }: { run: RunState; c: CombatState }) {
  const { floats, shake } = useDeltaFx(run.pHp, { showPos: true });
  const h = HEROES[run.cls];
  return (
    <div
      className={"actor" + (shake ? " shake" : "")}
      id="player"
      data-hero={run.cls}
    >
      <FloatLayer floats={floats} />
      <div className="badges">
        {c.pBlock > 0 && <Badge s="block" v={c.pBlock} />}
        {c.pStr > 0 && <Badge s="str" v={c.pStr} />}
        {c.pRegen > 0 && <Badge s="regen" v={c.pRegen} />}
        {c.pThorns > 0 && <Badge s="thorns" v={c.pThorns} />}
      </div>
      <Sprite k={h.sprite} className="sprite breath" />
      <div className="nameRow">
        {h.ico} {h.name}
      </div>
      <HpBar hp={run.pHp} max={run.pMax} wide />
    </div>
  );
}

export function Combat() {
  const { run, combat, log, logs, playCardAt, endPlayerTurn, requestFlee } =
    useGame();
  if (!run || !combat) return null;
  const c = combat;
  // no card in hand is affordable -> nudge the player to end the turn
  const noPlay = !c.over && !c.hand.some((card) => c.energy >= card.cost);
  return (
    <>
      <StatBar />
      <div className="topbar">
        <div className="energy">
          <span className="orbRow">
            {Array.from({ length: c.maxEnergy }).map((_, i) => (
              <span
                key={i}
                className={"orb" + (i >= c.energy ? " spent" : "")}
              />
            ))}
          </span>
          <span>
            <b className="energyNum">{c.energy}</b>
            <span className="energyMax">/{c.maxEnergy} дій</span>
          </span>
        </div>
        <div className="piles">
          <Icon name="layers" title="Колода" /> <b>{c.draw.length}</b> ·{" "}
          <Icon name="delete_sweep" title="Скид" /> <b>{c.disc.length}</b>
        </div>
        <span className="topActions">
          {c.tier !== "boss" && (
            <button
              className="ghost"
              onClick={requestFlee}
              disabled={c.over}
              title="Втекти з бою (−25% HP, без нагороди)"
            >
              <Icon name="directions_run" size={16} /> Втекти
            </button>
          )}
          <button
            onClick={endPlayerTurn}
            disabled={c.over}
            className={noPlay ? "gold" : undefined}
          >
            Кінець ходу <Icon name="arrow_forward" size={16} />
          </button>
        </span>
      </div>

      <div className="arena">
        <PlayerActor run={run} c={c} />
        <div className="enemies">
          {c.enemies.map((_, i) => (
            <EnemyActor c={c} i={i} key={i} />
          ))}
        </div>
      </div>

      <div className="hand">
        {c.hand.map((card, idx) => (
          <HandCard
            key={idx}
            card={card}
            can={!c.over && c.energy >= card.cost}
            onPlay={() => playCardAt(idx)}
          />
        ))}
      </div>
      <LogBar log={log} logs={logs} />
    </>
  );
}
