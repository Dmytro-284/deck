"use client";
import { SPRITES, type SpriteKey } from "@/core";

export function Sprite({
  k,
  className,
}: {
  k: SpriteKey;
  className?: string;
}) {
  return (
    <div
      className={className}
      // sprite SVG strings are static, authored content — safe to inline
      dangerouslySetInnerHTML={{ __html: SPRITES[k] }}
    />
  );
}
