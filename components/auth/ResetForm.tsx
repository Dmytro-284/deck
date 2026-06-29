"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { PASSWORD_MAX, PASSWORD_RULE_TEXT, validatePassword } from "@/lib/auth/password";
import styles from "./AuthForm.module.css";

/** Redeem the emailed password-reset token: choose a new password, then sign in. */
export function ResetForm() {
  const router = useRouter();
  const params = useSearchParams();
  const email = (params.get("email") || "").trim();
  const token = (params.get("token") || "").trim();

  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const linkValid = !!email && !!token;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const passErr = validatePassword(password);
    if (passErr) {
      setError(passErr);
      return;
    }
    setBusy(true);
    setError(null);
    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reset_password", email, token, newPassword: password }),
    });
    const data = await res.json().catch(() => ({ ok: false }));
    setBusy(false);
    if (!data.ok) {
      setError(data.error || "Could not reset your password.");
      return;
    }
    router.push("/play");
    router.refresh();
  }

  if (!linkValid) {
    return (
      <div className={styles.wrap}>
        <p className={styles.banner}>This reset link is incomplete or invalid.</p>
        <div className={styles.switches}>
          <a className={styles.link} href="/">
            ← Back to sign in
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.wrap}>
      <form className={styles.form} onSubmit={submit}>
        <label className={styles.label}>
          New password
          <input
            className={styles.input}
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            maxLength={PASSWORD_MAX}
            placeholder="8–20 chars, incl. a special character"
          />
          <span className={styles.hint}>{PASSWORD_RULE_TEXT}</span>
        </label>

        {error ? <p className={styles.error}>{error}</p> : null}

        <Button type="submit" variant="primary" fullWidth loading={busy}>
          Set new password
        </Button>
      </form>

      <div className={styles.switches}>
        <a className={styles.link} href="/">
          ← Back to sign in
        </a>
      </div>
    </div>
  );
}
