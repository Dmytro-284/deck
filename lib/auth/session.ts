import { createHmac, pbkdf2Sync, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * Custom signed-cookie auth (ported from euroutes/lingomare). HMAC-SHA256
 * session tokens, pbkdf2 password hashing. Server-only — never import into
 * client components.
 */

export const SESSION_COOKIE = "session";
export const SESSION_TTL = 24 * 60 * 60; // 24h (seconds)

export interface SessionPayload {
  sub: string;
  email: string | null;
  role: string;
  exp: number;
}

function getSecret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 16) {
    throw new Error("SESSION_SECRET is missing or too short (need ≥16 chars).");
  }
  return s;
}

function hmac(data: string): string {
  return createHmac("sha256", getSecret()).update(data).digest("hex");
}

export function sign(payload: object): string {
  const data = JSON.stringify(payload);
  return Buffer.from(data).toString("base64url") + "." + hmac(data);
}

export function verify(token: string): Record<string, unknown> | null {
  try {
    const [b64, sig] = token.split(".");
    if (!b64 || !sig) return null;
    const data = Buffer.from(b64, "base64url").toString();
    const expected = hmac(data);
    const a = Buffer.from(sig, "hex");
    const b = Buffer.from(expected, "hex");
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
    const payload = JSON.parse(data) as Record<string, unknown>;
    if (Date.now() > (payload.exp as number)) return null;
    return payload;
  } catch {
    return null;
  }
}

export function parseCookies(header = ""): Record<string, string> {
  return Object.fromEntries(
    header.split(";").map((c) => {
      const [k, ...v] = c.trim().split("=");
      return [k, v.join("=")];
    }),
  );
}

export function makeSessionCookie(user: {
  id: string;
  email: string | null;
  role: string;
}): string {
  const token = sign({
    sub: user.id,
    email: user.email,
    role: user.role,
    exp: Date.now() + SESSION_TTL * 1000,
  });
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_TTL}`;
}

export const CLEAR_SESSION_COOKIE = `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;

/** Stable, collision-resistant id for new user rows. */
export function newId(): string {
  return Date.now().toString(36) + randomBytes(5).toString("hex");
}

// ---- Password hashing (pbkdf2-sha256, 100k iterations) ----

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = pbkdf2Sync(password, salt, 100_000, 32, "sha256").toString("hex");
  return `pbkdf2:${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  try {
    const [, salt, hash] = stored.split(":");
    const attempt = pbkdf2Sync(password, salt, 100_000, 32, "sha256").toString("hex");
    const a = Buffer.from(attempt, "hex");
    const b = Buffer.from(hash, "hex");
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
