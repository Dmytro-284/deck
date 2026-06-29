"use client";
import { useEffect, useState } from "react";

/** Floating embers background, rendered once globally behind every page. */
export function Bgfx() {
  const [embers, setEmbers] = useState<React.CSSProperties[]>([]);
  useEffect(() => {
    // generated on the client only to avoid hydration mismatch
    setEmbers(
      Array.from({ length: 26 }).map(() => {
        const sz = 2 + Math.random() * 5;
        return {
          width: sz,
          height: sz,
          left: Math.random() * 100 + "%",
          animationDuration: 9 + Math.random() * 12 + "s",
          animationDelay: -Math.random() * 20 + "s",
        };
      }),
    );
  }, []);
  return (
    <div id="bgfx">
      {embers.map((st, i) => (
        <div className="ember" style={st} key={i} />
      ))}
    </div>
  );
}
