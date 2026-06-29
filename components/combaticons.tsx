"use client";
/**
 * Combat glyphs as inline SVG — themed, monochrome, `currentColor` so each one
 * tints to its badge/intent colour and stays crisp at 11px. Bold, low-detail
 * shapes that read at small sizes (dense fantasy art would smear). Used by the
 * status registry (`status.tsx`) and the enemy nameplate; chrome icons live in
 * `icons.tsx` (Material). Shapes share a 24-grid so weights match.
 */
import type { ReactNode } from "react";

function S({ children, label }: { children: ReactNode; label?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      fill="currentColor"
      style={{ verticalAlign: "-.14em" }}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      {children}
    </svg>
  );
}

/** Shield — block / blk intent. */
export const Shield = () => (
  <S>
    <path d="M12 2l8 3v6c0 5-3.4 8.7-8 10-4.6-1.3-8-5-8-10V5z" />
  </S>
);

/** Up arrow — strength / buff intent (raises a stat). */
export const UpArrow = () => (
  <S>
    <path d="M12 3l6.5 7.5H14V21h-4V10.5H5.5z" />
  </S>
);

/** Down arrow — weak (lowers damage dealt). */
export const DownArrow = () => (
  <S>
    <path d="M12 21l-6.5-7.5H10V3h4v10.5h4.5z" />
  </S>
);

/** Teardrop — poison. */
export const Poison = () => (
  <S>
    <path d="M12 2c0 0-7 8-7 13a7 7 0 0 0 14 0c0-5-7-13-7-13z" />
  </S>
);

/** Bullseye — vulnerable (marked, takes more damage). */
export const Bullseye = () => (
  <S>
    <path
      fillRule="evenodd"
      d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 3a7 7 0 1 1 0 14 7 7 0 0 1 0-14zm0 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8z"
    />
    <circle cx="12" cy="12" r="2" />
  </S>
);

/** Bold cross — regen / heal over time. */
export const HealPlus = () => (
  <S>
    <path d="M10 3h4v7h7v4h-7v7h-4v-7H3v-4h7z" />
  </S>
);

/** Four-point caltrop — thorns (spikes that hurt attackers). */
export const Thorns = () => (
  <S>
    <path d="M12 2l2.2 7.8L22 12l-7.8 2.2L12 22l-2.2-7.8L2 12l7.8-2.2z" />
  </S>
);

/** Sword — attack intent. */
export const Sword = () => (
  <S>
    <path d="M11 2h2v11h-2zM8 13h8l-1 3h-1v3h1v2H9v-2h1v-3H9z" />
  </S>
);

/** Skull — enemy nameplate marker. */
export const Skull = () => (
  <S>
    <path
      fillRule="evenodd"
      d="M12 2a8 8 0 0 0-8 8c0 2.4 1.2 3.7 2 5.4.5 1 .3 2.6.3 2.6h2v-2h1.3v2h.8v-2h1.2v2h2s-.2-1.6.3-2.6c.8-1.7 2-3 2-5.4a8 8 0 0 0-8-8zM9 9a1.7 1.7 0 1 1 0 3.4A1.7 1.7 0 0 1 9 9zm6 0a1.7 1.7 0 1 1 0 3.4A1.7 1.7 0 0 1 15 9z"
    />
  </S>
);
