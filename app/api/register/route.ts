import { NextRequest, NextResponse } from "next/server";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { serviceClient, checkRateLimit, clientIp } from "@/lib/supabase/service";
import {
  CLEAR_SESSION_COOKIE,
  hashPassword,
  makeSessionCookie,
  newId,
  parseCookies,
  verify,
  verifyPassword,
} from "@/lib/auth/session";
import { bootstrapPlayer } from "@/lib/db/bootstrap";
import { validatePassword } from "@/lib/auth/password";
import { DISPLAY_NAME_MAX, validateDisplayName } from "@/lib/auth/profile";
import { withinRestoreWindow } from "@/lib/auth/account-deletion";
import { baseUrl } from "@/lib/base-url";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;

function json(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return NextResponse.json(body, { status, headers });
}

function sessionUser(req: NextRequest) {
  const cookies = parseCookies(req.headers.get("cookie") || "");
  return cookies["session"] ? verify(cookies["session"]) : null;
}

const RESET_TOKEN_TTL_MS = 60 * 60_000; // 1 hour

/** Opaque, URL-safe reset token (the plaintext is emailed; only its hash is stored). */
function makeResetToken(): string {
  return randomBytes(32).toString("base64url");
}
function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
/** Constant-time compare of two hex digests of equal length. */
function safeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"));
}
async function sendEmail(to: string, subject: string, html: string) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log(`[email-dev] to=${to} subject=${subject}`);
    return;
  }
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: "Deckforge <onboarding@resend.dev>", to, subject, html }),
  }).catch(() => {});
}

export async function POST(req: NextRequest) {
  const db = serviceClient();
  const body = await req.json().catch(() => null);
  if (!body?.action) return json({ ok: false, error: "Missing action" }, 400);

  // ---- register ----
  if (body.action === "register") {
    const email = (body.email || "").trim().toLowerCase();
    const password = (body.password || "").trim();
    if (!EMAIL_RE.test(email)) return json({ ok: false, error: "Invalid email" }, 400);
    const passErr = validatePassword(password);
    if (passErr) return json({ ok: false, error: passErr }, 400);

    const { data: existing } = await db
      .from("users")
      .select("id,status")
      .eq("email", email)
      .maybeSingle();

    if (existing && existing.status !== "deleted") {
      return json({ ok: false, error: "Email already registered" }, 409);
    }

    const now = new Date().toISOString();
    const displayName = email.split("@")[0].slice(0, DISPLAY_NAME_MAX);
    let userId: string;

    if (existing) {
      userId = existing.id;
      await db
        .from("users")
        .update({
          status: "active",
          deleted_at: null,
          password_hash: hashPassword(password),
          provider: "email",
          last_login: now,
        })
        .eq("id", userId);
    } else {
      userId = newId();
      const { error } = await db.from("users").insert({
        id: userId,
        email,
        display_name: displayName,
        role: "user",
        status: "active",
        provider: "email",
        password_hash: hashPassword(password),
        created_at: now,
        last_login: now,
      });
      if (error) return json({ ok: false, error: "Could not create account" }, 500);
    }

    await bootstrapPlayer(db, userId);
    return json({ ok: true }, 200, { "Set-Cookie": makeSessionCookie({ id: userId, email, role: "user" }) });
  }

  // ---- login ----
  if (body.action === "login") {
    const email = (body.email || "").trim().toLowerCase();
    const password = (body.password || "").trim();
    if (!EMAIL_RE.test(email) || !password) return json({ ok: false, error: "Invalid credentials" }, 400);
    const [ipOk, acctOk] = await Promise.all([
      checkRateLimit(db, "login", clientIp(req.headers), 10, 15 * 60_000),
      checkRateLimit(db, "login_acct", email, 10, 15 * 60_000),
    ]);
    if (!ipOk || !acctOk) {
      return json({ ok: false, error: "Too many attempts. Try again later." }, 429);
    }
    const loginPassErr = validatePassword(password);
    if (loginPassErr) return json({ ok: false, error: loginPassErr }, 400);

    const { data: user } = await db
      .from("users")
      .select("id,email,role,password_hash,status,deleted_at")
      .eq("email", email)
      .maybeSingle();

    if (!user || !user.password_hash || !verifyPassword(password, user.password_hash)) {
      return json({ ok: false, error: "Invalid email or password" }, 401);
    }
    if (user.status === "deleted") {
      if (withinRestoreWindow(user.deleted_at)) {
        return json({ ok: false, restorable: true, error: "account_deleted_restorable" }, 200);
      }
      return json({ ok: false, error: "Invalid email or password" }, 401);
    }
    await db.from("users").update({ last_login: new Date().toISOString(), provider: "email" }).eq("id", user.id);
    return json({ ok: true }, 200, {
      "Set-Cookie": makeSessionCookie({ id: user.id, email: user.email, role: user.role }),
    });
  }

  // ---- change password (signed in) ----
  if (body.action === "change_password") {
    const payload = sessionUser(req);
    if (!payload) return json({ ok: false, error: "Not authenticated" }, 401);
    const currentPassword = (body.currentPassword || "").trim();
    const newPassword = (body.newPassword || "").trim();
    const newPassErr = validatePassword(newPassword);
    if (newPassErr) return json({ ok: false, error: newPassErr }, 400);

    const { data: user } = await db
      .from("users")
      .select("id,password_hash,status")
      .eq("id", String(payload.sub))
      .maybeSingle();
    if (!user || user.status === "deleted") return json({ ok: false, error: "User not found" }, 404);
    if (user.password_hash && !verifyPassword(currentPassword, user.password_hash)) {
      return json({ ok: false, error: "Current password is incorrect" }, 401);
    }
    await db.from("users").update({ password_hash: hashPassword(newPassword) }).eq("id", user.id);
    return json({ ok: true });
  }

  // ---- update display name (signed in) ----
  if (body.action === "update_display_name") {
    const payload = sessionUser(req);
    if (!payload) return json({ ok: false, error: "Not authenticated" }, 401);
    const name = String(body.displayName ?? "").trim();
    const nameErr = validateDisplayName(name);
    if (nameErr) return json({ ok: false, error: nameErr }, 400);

    const { data: user } = await db
      .from("users")
      .select("id,status")
      .eq("id", String(payload.sub))
      .maybeSingle();
    if (!user || user.status === "deleted") return json({ ok: false, error: "User not found" }, 404);
    await db.from("users").update({ display_name: name }).eq("id", user.id);
    return json({ ok: true, displayName: name });
  }

  // ---- link email+password to the current (OAuth) account ----
  if (body.action === "link_email") {
    const payload = sessionUser(req);
    if (!payload) return json({ ok: false, error: "Not authenticated" }, 401);
    const email = (body.email || "").trim().toLowerCase();
    const password = (body.password || "").trim();
    if (!EMAIL_RE.test(email)) return json({ ok: false, error: "Invalid email" }, 400);
    const linkPassErr = validatePassword(password);
    if (linkPassErr) return json({ ok: false, error: linkPassErr }, 400);

    const [{ data: me }, { data: clash }] = await Promise.all([
      db.from("users").select("id,email,role,status").eq("id", String(payload.sub)).maybeSingle(),
      db.from("users").select("id").eq("email", email).maybeSingle(),
    ]);
    if (!me || me.status === "deleted") return json({ ok: false, error: "User not found" }, 404);
    if (clash && clash.id !== me.id) return json({ ok: false, error: "email_taken" }, 409);

    await db.from("users").update({ email, password_hash: hashPassword(password) }).eq("id", me.id);
    return json({ ok: true }, 200, {
      "Set-Cookie": makeSessionCookie({ id: me.id, email, role: me.role }),
    });
  }

  // ---- forgot password ----
  if (body.action === "forgot_password") {
    if (!(await checkRateLimit(db, "forgot_password", clientIp(req.headers), 5, 60 * 60_000))) {
      return json({ ok: false, error: "Too many requests. Try again later." }, 429);
    }
    const email = (body.email || "").trim().toLowerCase();
    if (!EMAIL_RE.test(email)) return json({ ok: false, error: "Invalid email" }, 400);
    const { data: user } = await db
      .from("users")
      .select("id,status")
      .eq("email", email)
      .maybeSingle();
    if (user && user.status !== "deleted") {
      const token = makeResetToken();
      await db
        .from("users")
        .update({
          reset_token_hash: hashToken(token),
          reset_token_expires: new Date(Date.now() + RESET_TOKEN_TTL_MS).toISOString(),
        })
        .eq("id", user.id);
      const link = `${baseUrl(req)}/reset?token=${token}&email=${encodeURIComponent(email)}`;
      await sendEmail(
        email,
        "Reset your Deckforge password",
        `<div style="font-family:sans-serif;max-width:480px;margin:auto;padding:2rem;">
          <h2>Password reset</h2>
          <p>Click the link below to choose a new password. It expires in 1 hour. If you didn't request this, ignore this email — your password hasn't changed.</p>
          <p><a href="${link}" style="display:inline-block;background:#c8643c;color:#fff;border-radius:8px;padding:.75rem 1.25rem;text-decoration:none;">Reset password</a></p>
          <p style="color:#777;font-size:.85rem;word-break:break-all;">${link}</p>
        </div>`,
      );
    }
    return json({ ok: true });
  }

  // ---- reset password (redeem the emailed token) ----
  if (body.action === "reset_password") {
    if (!(await checkRateLimit(db, "reset_password", clientIp(req.headers), 10, 60 * 60_000))) {
      return json({ ok: false, error: "Too many requests. Try again later." }, 429);
    }
    const email = (body.email || "").trim().toLowerCase();
    const token = (body.token || "").trim();
    const newPassword = (body.newPassword || "").trim();
    if (!EMAIL_RE.test(email) || !token) return json({ ok: false, error: "Invalid request" }, 400);
    const resetPassErr = validatePassword(newPassword);
    if (resetPassErr) return json({ ok: false, error: resetPassErr }, 400);

    const { data: user } = await db
      .from("users")
      .select("id,role,status,reset_token_hash,reset_token_expires")
      .eq("email", email)
      .maybeSingle();

    const expired = !user?.reset_token_expires || Date.now() > Date.parse(user.reset_token_expires);
    const tokenOk =
      !!user?.reset_token_hash && safeEqualHex(hashToken(token), user.reset_token_hash);
    if (!user || user.status === "deleted" || expired || !tokenOk) {
      return json({ ok: false, error: "This reset link is invalid or has expired." }, 400);
    }

    await db
      .from("users")
      .update({
        password_hash: hashPassword(newPassword),
        reset_token_hash: null,
        reset_token_expires: null,
        provider: "email",
      })
      .eq("id", user.id);
    return json({ ok: true }, 200, {
      "Set-Cookie": makeSessionCookie({ id: user.id, email, role: user.role }),
    });
  }

  // ---- unlink a provider (keep at least one login method) ----
  if (body.action === "unlink") {
    const payload = sessionUser(req);
    if (!payload) return json({ ok: false, error: "Not authenticated" }, 401);
    const provider = body.provider as "google" | "telegram" | "email";
    if (provider !== "google" && provider !== "telegram" && provider !== "email") {
      return json({ ok: false, error: "Invalid provider" }, 400);
    }
    const { data: me } = await db
      .from("users")
      .select("id,password_hash,google_id,telegram_id")
      .eq("id", String(payload.sub))
      .maybeSingle();
    if (!me) return json({ ok: false, error: "User not found" }, 404);

    const methods =
      (me.password_hash ? 1 : 0) + (me.google_id ? 1 : 0) + (me.telegram_id ? 1 : 0);
    if (methods <= 1) return json({ ok: false, error: "Cannot remove your only login method" }, 400);

    const patch =
      provider === "google"
        ? { google_id: null }
        : provider === "telegram"
          ? { telegram_id: null }
          : { password_hash: null };
    await db.from("users").update(patch).eq("id", me.id);
    return json({ ok: true });
  }

  // ---- delete account (soft, restorable for one month) ----
  if (body.action === "delete_account") {
    const payload = sessionUser(req);
    if (!payload) return json({ ok: false, error: "Not authenticated" }, 401);
    await db
      .from("users")
      .update({ status: "deleted", deleted_at: new Date().toISOString() })
      .eq("id", String(payload.sub));
    return json({ ok: true }, 200, { "Set-Cookie": CLEAR_SESSION_COOKIE });
  }

  // ---- restore a soft-deleted account (within the grace window) ----
  if (body.action === "restore_account") {
    const email = (body.email || "").trim().toLowerCase();
    const password = (body.password || "").trim();
    if (!EMAIL_RE.test(email) || !password) return json({ ok: false, error: "Invalid credentials" }, 400);

    const { data: user } = await db
      .from("users")
      .select("id,email,role,password_hash,status,deleted_at")
      .eq("email", email)
      .maybeSingle();

    if (
      !user ||
      user.status !== "deleted" ||
      !user.password_hash ||
      !verifyPassword(password, user.password_hash) ||
      !withinRestoreWindow(user.deleted_at)
    ) {
      return json({ ok: false, error: "Invalid email or password" }, 401);
    }

    await db
      .from("users")
      .update({ status: "active", deleted_at: null, last_login: new Date().toISOString(), provider: "email" })
      .eq("id", user.id);
    return json({ ok: true }, 200, {
      "Set-Cookie": makeSessionCookie({ id: user.id, email: user.email, role: user.role }),
    });
  }

  return json({ ok: false, error: "Unknown action" }, 400);
}
