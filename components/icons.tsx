"use client";
/**
 * Material Symbols chrome icon. Monochrome, inherits `currentColor`, and tints
 * with the theme — used for functional UI (buttons, counters, the tools rail),
 * NOT for game flavour (enemy faces, card art, relics) which stay illustrative.
 * The font is loaded once in `app/layout.tsx`; the `.mi` base class lives in
 * `app/globals.css`. Pass `fill` for the solid variant (e.g. a full heart).
 */
export function Icon({
  name,
  size = 18,
  fill = false,
  title,
  className,
}: {
  name: string;
  size?: number;
  fill?: boolean;
  title?: string;
  className?: string;
}) {
  return (
    <span
      className={"mi" + (className ? " " + className : "")}
      style={{
        fontSize: size,
        ...(fill
          ? { fontVariationSettings: "'FILL' 1, 'wght' 500, 'GRAD' 0, 'opsz' 24" }
          : null),
      }}
      title={title}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      {name}
    </span>
  );
}
