"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { GoogleIcon, TelegramIcon } from "@/components/auth/BrandIcons";
import { PASSWORD_MAX, PASSWORD_RULE_TEXT, validatePassword } from "@/lib/auth/password";
import { RESTORE_WINDOW_LABEL } from "@/lib/auth/account-deletion";
import styles from "./AuthForm.module.css";

type Mode = "login" | "register" | "forgot";

const AUTH_ERRORS: Record<string, string> = {
  server_config: "Sign-in is temporarily unavailable (server not configured yet).",
  google_config: "Google sign-in isn't configured.",
  google_cancelled: "Google sign-in was cancelled.",
  google_token: "Google sign-in failed. Please try again.",
  google_profile: "Could not read your Google profile.",
  telegram_config: "Telegram sign-in isn't configured.",
  telegram_cancelled: "Telegram sign-in was cancelled.",
  telegram_state: "Telegram sign-in expired. Please try again.",
  telegram_token: "Telegram sign-in failed. Please try again.",
  telegram_idtoken: "Could not verify your Telegram login.",
  google_state: "Google sign-in expired or was tampered with. Please try again.",
  account_deleted: "This account has been deleted.",
  db: "A server error occurred. Please try again.",
};

export function AuthForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const authError = searchParams.get("auth_error");
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();

    if (mode === "login" || mode === "register") {
      const passErr = validatePassword(password);
      if (passErr) {
        setError(passErr);
        return;
      }
    }

    setBusy(true);
    setError(null);
    setNotice(null);

    const action = mode === "forgot" ? "forgot_password" : mode;
    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, email, password }),
    });
    const data = await res.json().catch(() => ({ ok: false }));
    setBusy(false);

    if (!data.ok) {
      if (data.restorable) {
        await offerRestore();
        return;
      }
      setError(data.error || "Something went wrong");
      return;
    }
    if (mode === "forgot") {
      setNotice("If that email exists, a password-reset link has been sent. It expires in 1 hour.");
      setMode("login");
      return;
    }
    router.push("/play");
    router.refresh();
  }

  async function offerRestore() {
    if (
      !confirm(
        `This account was deleted and is scheduled for permanent removal. You can restore it for ${RESTORE_WINDOW_LABEL} after deletion. Restore it now and sign in?`,
      )
    ) {
      setError("This account has been deleted.");
      return;
    }
    setBusy(true);
    setError(null);
    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "restore_account", email, password }),
    });
    const data = await res.json().catch(() => ({ ok: false }));
    setBusy(false);
    if (!data.ok) {
      setError(data.error || "Could not restore the account.");
      return;
    }
    router.push("/play");
    router.refresh();
  }

  return (
    <div className={styles.wrap}>
      {authError ? (
        <p className={styles.banner}>{AUTH_ERRORS[authError] || "Sign-in failed. Please try again."}</p>
      ) : null}
      <div className={styles.providers}>
        <a className={styles.provider} href="/api/auth/google">
          <GoogleIcon size={20} />
          Continue with Google
        </a>
        <a className={styles.provider} href="/api/auth/telegram">
          <TelegramIcon size={20} />
          Continue with Telegram
        </a>
      </div>

      <div className={styles.divider}>
        <span>or</span>
      </div>

      <form className={styles.form} onSubmit={submit}>
        <label className={styles.label}>
          Email
          <input
            className={styles.input}
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>

        {mode !== "forgot" ? (
          <label className={styles.label}>
            Password
            <input
              className={styles.input}
              type="password"
              autoComplete={mode === "register" ? "new-password" : "current-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              maxLength={PASSWORD_MAX}
              placeholder="8–20 chars, incl. a special character"
            />
            {mode === "login" || mode === "register" ? (
              <span className={styles.hint}>{PASSWORD_RULE_TEXT}</span>
            ) : null}
          </label>
        ) : null}

        {error ? <p className={styles.error}>{error}</p> : null}
        {notice ? <p className={styles.notice}>{notice}</p> : null}

        <Button type="submit" variant="primary" fullWidth loading={busy}>
          {mode === "login"
            ? "Sign in"
            : mode === "register"
              ? "Create account"
              : "Send reset link"}
        </Button>
      </form>

      <div className={styles.switches}>
        {mode === "login" ? (
          <>
            <button type="button" className={styles.link} onClick={() => setMode("register")}>
              Create an account
            </button>
            <button type="button" className={styles.link} onClick={() => setMode("forgot")}>
              Forgot password?
            </button>
          </>
        ) : (
          <button type="button" className={styles.link} onClick={() => setMode("login")}>
            ← Back to sign in
          </button>
        )}
      </div>
    </div>
  );
}
