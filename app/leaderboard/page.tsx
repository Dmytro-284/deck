"use client";
/* eslint-disable react-hooks/set-state-in-effect -- client-only data load on mount */
import { useEffect, useState } from "react";
import Link from "next/link";
import { HEROES, type HeroKey } from "@/core";
import { cloudLoadScores, type ScoreRow } from "@/lib/cloud";
import { todayKey } from "@/store/useGame";

type Board = "daily" | "all";

function heroIco(hero: string): string {
  return HEROES[hero as HeroKey]?.ico ?? "🎮";
}

export default function LeaderboardPage() {
  const [board, setBoard] = useState<Board>("daily");
  const [rows, setRows] = useState<ScoreRow[] | null>(null);

  useEffect(() => {
    document.body.className = "act1";
  }, []);

  useEffect(() => {
    let live = true;
    setRows(null);
    cloudLoadScores(board === "daily" ? todayKey() : undefined).then((r) => {
      if (live) setRows(r);
    });
    return () => {
      live = false;
    };
  }, [board]);

  return (
    <div className="wrap codex">
      <h1>🏆 ЛІДЕРИ</h1>
      <div className="sub">найкращі забіги Емберхольда</div>

      <div className="codexNav">
        <Link href="/play" className="chip">
          ← Назад
        </Link>
      </div>

      <div className="codexTabs">
        <button
          className={"codexTab" + (board === "daily" ? " on" : "")}
          onClick={() => setBoard("daily")}
        >
          🗓 Сьогодні
        </button>
        <button
          className={"codexTab" + (board === "all" ? " on" : "")}
          onClick={() => setBoard("all")}
        >
          ♾ Усі часи
        </button>
      </div>

      {rows === null ? (
        <p className="empty">Завантаження…</p>
      ) : rows.length === 0 ? (
        <p className="empty">
          Поки порожньо. Заверши забіг, щоб потрапити в рейтинг.
        </p>
      ) : (
        <div className="board">
          {rows.map((r, i) => (
            <div className={"boardRow" + (r.won ? " won" : "")} key={r.id}>
              <span className="rank">{i + 1}</span>
              <span className="who">
                {heroIco(r.hero)} {r.name}
              </span>
              <span className="meta">
                {r.won ? "👑 перемога" : `акт ${r.act}`}
              </span>
              <span className="score">{r.score}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
