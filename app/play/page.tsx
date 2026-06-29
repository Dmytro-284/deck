"use client";
/* eslint-disable react-hooks/set-state-in-effect -- client-only init on mount */
import { useEffect, useState } from "react";
import Link from "next/link";
import { useGame } from "@/store/useGame";
import { ClassSelect } from "@/components/ClassSelect";
import { MapView } from "@/components/MapView";
import { Combat } from "@/components/Combat";
import { Shop } from "@/components/Shop";
import { Modals } from "@/components/Modals";
import { initSfxPrefs, isMuted, toggleMute } from "@/lib/sfx";
import { Icon } from "@/components/icons";

export default function PlayPage() {
  const { view, run, bootstrap, cloudOn } = useGame();
  const [muted, setMuted] = useState(false);

  // Logout: signed-in players get their session cleared; everyone lands home.
  async function handleLogout() {
    if (cloudOn) {
      try {
        await fetch("/api/me", { method: "DELETE" });
      } catch {}
    }
    window.location.href = "/";
  }

  // pull any cloud save + read sound prefs once on mount
  useEffect(() => {
    bootstrap();
    initSfxPrefs();
    setMuted(isMuted());
  }, [bootstrap]);

  // act theme on <body>
  useEffect(() => {
    document.body.className = run ? "act" + Math.min(run.act, 4) : "act1";
  }, [run, view]);

  return (
    <>
      <div className="wrap">
        <div className="playTools">
          <Link href="/codex" className="chip" title="Кодекс">
            <Icon name="menu_book" size={20} />
          </Link>
          <Link href="/leaderboard" className="chip" title="Лідери">
            <Icon name="emoji_events" size={20} />
          </Link>
          <Link href="/achievements" className="chip" title="Досягнення">
            <Icon name="military_tech" size={20} />
          </Link>
          {cloudOn ? (
            <Link href="/settings" className="chip" title="Акаунт">
              <Icon name="account_circle" size={20} />
            </Link>
          ) : (
            <Link href="/" className="chip" title="Увійти — зберегти прогрес">
              <Icon name="login" size={20} />
            </Link>
          )}
          <button
            className="chip"
            title={muted ? "Увімкнути звук" : "Вимкнути звук"}
            onClick={() => setMuted(toggleMute())}
          >
            <Icon name={muted ? "volume_off" : "volume_up"} size={20} />
          </button>
          <button
            className="chip"
            title={cloudOn ? "Вийти з акаунту" : "На головну"}
            onClick={handleLogout}
          >
            <Icon name="logout" size={20} />
          </button>
        </div>
        <h1>⚔ DECKFORGE</h1>
        <div className="sub">roguelike deckbuilder</div>
        {view === "class" && <ClassSelect />}
        {view === "map" && <MapView />}
        {view === "combat" && <Combat />}
        {view === "shop" && <Shop />}
      </div>
      <Modals />
    </>
  );
}
