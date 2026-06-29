// Web Audio sound effects + haptics. Synthesised (no asset files): impacts use
// filtered noise bursts, pickups/heals use tonal envelopes — aiming for sounds
// that read as their action rather than generic beeps. One persisted "feedback"
// toggle silences both audio and vibration.
"use client";

let actx: AudioContext | null = null;
let muted = false;
const MUTE_KEY = "deckforge_muted";

export function initSfxPrefs(): void {
  try {
    muted = localStorage.getItem(MUTE_KEY) === "1";
  } catch {}
}
export function isMuted(): boolean {
  return muted;
}
export function toggleMute(): boolean {
  muted = !muted;
  try {
    localStorage.setItem(MUTE_KEY, muted ? "1" : "0");
  } catch {}
  return muted;
}

export type SfxName =
  | "click"
  | "hit"
  | "slash"
  | "enemyHit"
  | "draw"
  | "block"
  | "coin"
  | "relic"
  | "heal"
  | "poison"
  | "win"
  | "lose";

function ctx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    actx = actx || new AC();
    if (actx.state === "suspended") void actx.resume();
    return actx;
  } catch {
    return null;
  }
}

/** A short tone with an attack/decay envelope; optional pitch glide. */
function tone(
  freq: number,
  dur: number,
  w: OscillatorType,
  vol: number,
  opts: { to?: number; delay?: number; attack?: number } = {},
): void {
  const a = ctx();
  if (!a) return;
  const o = a.createOscillator();
  const g = a.createGain();
  o.connect(g);
  g.connect(a.destination);
  const t = a.currentTime + (opts.delay ?? 0);
  const atk = opts.attack ?? 0.005;
  o.type = w;
  o.frequency.setValueAtTime(freq, t);
  if (opts.to) o.frequency.exponentialRampToValueAtTime(Math.max(1, opts.to), t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + atk);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.start(t);
  o.stop(t + dur + 0.02);
}

/** A filtered noise burst — the body of impacts, whooshes and riffles. */
function noise(
  dur: number,
  vol: number,
  filter: BiquadFilterType,
  freq: number,
  opts: { delay?: number; q?: number } = {},
): void {
  const a = ctx();
  if (!a) return;
  const frames = Math.floor(a.sampleRate * dur);
  const buf = a.createBuffer(1, frames, a.sampleRate);
  const ch = buf.getChannelData(0);
  for (let i = 0; i < frames; i++) ch[i] = Math.random() * 2 - 1;
  const src = a.createBufferSource();
  src.buffer = buf;
  const bq = a.createBiquadFilter();
  bq.type = filter;
  bq.frequency.value = freq;
  bq.Q.value = opts.q ?? 1;
  const g = a.createGain();
  src.connect(bq);
  bq.connect(g);
  g.connect(a.destination);
  const t = a.currentTime + (opts.delay ?? 0);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.start(t);
  src.stop(t + dur + 0.02);
}

function arp(ns: number[], w: OscillatorType = "triangle", step = 0.085, vol = 0.16): void {
  ns.forEach((n, i) => tone(n, 0.2, w, vol, { delay: i * step }));
}

export function sfx(type: SfxName): void {
  if (muted) return;
  if (!ctx()) return;
  switch (type) {
    case "click":
      tone(560, 0.05, "sine", 0.07);
      break;
    case "slash": // blade whoosh + downward cut
      noise(0.13, 0.18, "highpass", 1800, { q: 0.7 });
      tone(720, 0.12, "sawtooth", 0.1, { to: 200 });
      break;
    case "hit": // player's blow lands — woody thump + low punch
      noise(0.1, 0.22, "lowpass", 900, { q: 0.8 });
      tone(190, 0.14, "sine", 0.18, { to: 110 });
      break;
    case "enemyHit": // player takes damage — heavier, lower
      noise(0.16, 0.26, "lowpass", 600, { q: 0.9 });
      tone(120, 0.22, "sine", 0.2, { to: 70 });
      break;
    case "block": // metallic clink (two bright pings)
      tone(1180, 0.09, "triangle", 0.14);
      tone(1640, 0.12, "triangle", 0.1, { delay: 0.04 });
      break;
    case "coin": // bright two-note ding
      tone(1280, 0.08, "square", 0.1);
      tone(1880, 0.14, "square", 0.09, { delay: 0.06 });
      break;
    case "relic": // shimmer
      arp([660, 990, 1320, 1760], "triangle", 0.07, 0.13);
      break;
    case "heal": // soft rising chord
      tone(523, 0.34, "sine", 0.12, { attack: 0.04 });
      tone(659, 0.34, "sine", 0.1, { attack: 0.05, delay: 0.04 });
      tone(784, 0.34, "sine", 0.09, { attack: 0.06, delay: 0.08 });
      break;
    case "poison": // sickly low wobble
      tone(220, 0.26, "sawtooth", 0.12, { to: 160 });
      tone(233, 0.26, "sawtooth", 0.08, { to: 150 });
      break;
    case "draw": // quick card riffle (stacked noise clicks)
      noise(0.04, 0.1, "highpass", 3000);
      noise(0.04, 0.1, "highpass", 3000, { delay: 0.05 });
      noise(0.05, 0.1, "highpass", 2600, { delay: 0.1 });
      break;
    case "win":
      arp([523, 659, 784, 1047], "triangle", 0.1, 0.16);
      break;
    case "lose":
      arp([392, 330, 262, 196], "sine", 0.12, 0.16);
      break;
  }
}

export function haptic(pattern: number | number[] = 12): void {
  if (muted) return;
  try {
    navigator.vibrate?.(pattern);
  } catch {}
}
