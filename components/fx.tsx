"use client";
import { useEffect, useRef, useState } from "react";

export interface Float {
  id: number;
  text: string;
  cls: string;
}

/**
 * Watches a numeric value and emits floating combat numbers + a shake when it
 * drops (and an optional heal float when it rises). Lets actor components
 * self-animate from state changes instead of threading engine events through.
 */
export function useDeltaFx(
  value: number,
  opts: { negCls?: string; posCls?: string; showPos?: boolean } = {},
) {
  const { negCls = "f-dmg", posCls = "f-heal", showPos = false } = opts;
  const prev = useRef(value);
  const [floats, setFloats] = useState<Float[]>([]);
  const [shake, setShake] = useState(false);

  useEffect(() => {
    const d = value - prev.current;
    prev.current = value;
    if (d === 0) return;
    if (d < 0) {
      const id = performance.now() + Math.random();
      setFloats((f) => [...f, { id, text: String(d), cls: negCls }]);
      setShake(true);
      const t1 = setTimeout(
        () => setFloats((f) => f.filter((x) => x.id !== id)),
        1000,
      );
      const t2 = setTimeout(() => setShake(false), 350);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }
    if (d > 0 && showPos) {
      const id = performance.now() + Math.random();
      setFloats((f) => [...f, { id, text: "+" + d, cls: posCls }]);
      const t = setTimeout(
        () => setFloats((f) => f.filter((x) => x.id !== id)),
        1000,
      );
      return () => clearTimeout(t);
    }
  }, [value, negCls, posCls, showPos]);

  return { floats, shake };
}

export function FloatLayer({ floats }: { floats: Float[] }) {
  return (
    <>
      {floats.map((f) => (
        <div
          key={f.id}
          className={"float " + f.cls}
          style={{ left: "50%", top: 8, transform: "translateX(-50%)" }}
        >
          {f.text}
        </div>
      ))}
    </>
  );
}
