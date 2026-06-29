// Deterministic seeded RNG (mulberry32). Same seed -> same run.
// Used everywhere instead of Math.random so balance/bugs are reproducible.

export interface Rng {
  /** float in [0, 1) */
  next(): number;
  /** int in [0, n) */
  int(n: number): number;
  /** d20 roll, 1..20 (isolated so tests can force it without touching shuffle) */
  d20(): number;
  /** random element */
  pick<T>(a: readonly T[]): T;
  /** Fisher-Yates shuffle in place, returns the same array */
  shuffle<T>(a: T[]): T[];
}

export function makeRng(seed: number): Rng {
  let s = seed >>> 0;
  const next = (): number => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const int = (n: number): number => Math.floor(next() * n);
  return {
    next,
    int,
    d20: () => 1 + int(20),
    pick: (a) => a[int(a.length)],
    shuffle: (a) => {
      for (let i = a.length - 1; i > 0; i--) {
        const j = int(i + 1);
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    },
  };
}

/** Convenience: a fresh seed from current time (for "new random run"). */
export function randomSeed(): number {
  return (Date.now() ^ (Math.random() * 0xffffffff)) >>> 0;
}
