"use client";
import { useEffect } from "react";
import Link from "next/link";
import { useGame } from "@/store/useGame";
import { ACHIEVEMENTS, HEROES } from "@/core";

export default function AchievementsPage() {
  const { profile, bootstrap } = useGame();

  useEffect(() => {
    document.body.className = "act1";
    bootstrap();
  }, [bootstrap]);

  const earned = profile.achievements.length;

  return (
    <div className="wrap codex">
      <h1>🏆 Досягнення</h1>
      <div className="sub">
        {earned}/{ACHIEVEMENTS.length} відкрито · 🪙 {profile.coins}
      </div>

      <div className="codexNav">
        <Link href="/play" className="chip">
          ← Назад
        </Link>
      </div>

      <div className="achGrid">
        {ACHIEVEMENTS.map((a) => {
          const done = profile.achievements.includes(a.id);
          const { cur, goal } = a.progress(profile);
          const pct = Math.min(100, Math.round((100 * cur) / goal));
          const reward = a.reward.unlock
            ? `Відкриває: ${HEROES[a.reward.unlock].name}`
            : `🪙 ${a.reward.coins}`;
          return (
            <div key={a.id} className={"achCard" + (done ? " done" : "")}>
              <div className="achIcon">{a.icon}</div>
              <div className="achMain">
                <div className="achName">
                  {a.name}
                  {done ? " ✓" : ""}
                </div>
                <div className="achDesc">{a.desc}</div>
                <div className="achBar">
                  <div className="achFill" style={{ width: pct + "%" }} />
                </div>
                <div className="achMeta">
                  {cur}/{goal} · {reward}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
