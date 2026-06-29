"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { LoadingDots } from "@/components/ui/LoadingDots";
import { Icon } from "@/components/icons";
import { GoogleIcon, TelegramIcon, EmailIcon } from "@/components/auth/BrandIcons";
import { PASSWORD_MAX, validatePassword } from "@/lib/auth/password";
import { DISPLAY_NAME_MAX, validateDisplayName } from "@/lib/auth/profile";
import { RESTORE_WINDOW_LABEL } from "@/lib/auth/account-deletion";
import { setPlayerName } from "@/lib/cloud";
import styles from "@/app/settings/settings.module.css";

interface SettingsData {
  displayName: string;
  email: string | null;
  photoUrl: string | null;
  linkedGoogle: boolean;
  linkedTelegram: boolean;
  hasPassword: boolean;
  isSyntheticEmail: boolean;
}

const AVATAR_MAX_BYTES = 2 * 1024 * 1024; // 2 MB

async function postAction(body: Record<string, unknown>) {
  const res = await fetch("/api/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json().catch(() => ({ ok: false, error: "Помилка мережі" }));
}

/** Deterministic avatar gradient derived from the nick, so it shifts on rename. */
function avatarColor(name: string): string {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const hue = h % 360;
  return `linear-gradient(135deg, hsl(${hue} 52% 46%), hsl(${(hue + 42) % 360} 58% 34%))`;
}

export function SettingsClient({ initial }: { initial: SettingsData }) {
  const [data, setData] = useState(initial);
  const [msg, setMsg] = useState<string | null>(null);

  const [editing, setEditing] = useState(false);
  const [nameDraft, setNameDraft] = useState(initial.displayName);
  const [nameBusy, setNameBusy] = useState(false);
  const [avatarBusy, setAvatarBusy] = useState(false);

  const [curPw, setCurPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [linkEmail, setLinkEmail] = useState("");
  const [linkPw, setLinkPw] = useState("");
  const [pwBusy, setPwBusy] = useState(false);
  const [unlinking, setUnlinking] = useState<"google" | "telegram" | "email" | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function uploadAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-picking the same file
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setMsg("Можна завантажити лише зображення.");
      return;
    }
    if (file.size > AVATAR_MAX_BYTES) {
      setMsg("Зображення завелике (макс. 2 МБ).");
      return;
    }
    setAvatarBusy(true);
    setMsg(null);
    const body = new FormData();
    body.append("avatar", file);
    const out = await fetch("/api/settings/avatar", { method: "POST", body })
      .then((r) => r.json())
      .catch(() => ({ ok: false, error: "Помилка мережі" }));
    setAvatarBusy(false);
    if (out.ok) setData((d) => ({ ...d, photoUrl: out.photoUrl }));
    else setMsg(out.error || "Не вдалося завантажити аватар.");
  }

  async function saveName(e: React.FormEvent) {
    e.preventDefault();
    const name = nameDraft.trim();
    const nameErr = validateDisplayName(name);
    if (nameErr) {
      setMsg(nameErr);
      return;
    }
    setNameBusy(true);
    setMsg(null);
    const out = await postAction({ action: "update_display_name", displayName: name });
    setNameBusy(false);
    if (out.ok) {
      const saved = out.displayName || name;
      setData((d) => ({ ...d, displayName: saved }));
      setPlayerName(saved); // keep the leaderboard nick in sync
      setEditing(false);
    } else setMsg(out.error || "Не вдалося змінити нік.");
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    const passErr = validatePassword(newPw);
    if (passErr) {
      setMsg(passErr);
      return;
    }
    setPwBusy(true);
    setMsg(null);
    const out = await postAction({ action: "change_password", currentPassword: curPw, newPassword: newPw });
    setPwBusy(false);
    if (out.ok) {
      setMsg("Пароль змінено.");
      setCurPw("");
      setNewPw("");
    } else setMsg(out.error || "Не вдалося змінити пароль.");
  }

  async function addEmail(e: React.FormEvent) {
    e.preventDefault();
    const passErr = validatePassword(linkPw);
    if (passErr) {
      setMsg(passErr);
      return;
    }
    setPwBusy(true);
    setMsg(null);
    const out = await postAction({ action: "link_email", email: linkEmail, password: linkPw });
    setPwBusy(false);
    if (out.ok) {
      setData((d) => ({ ...d, hasPassword: true, email: linkEmail, isSyntheticEmail: false }));
      setMsg("Email і пароль додано.");
      setLinkEmail("");
      setLinkPw("");
    } else setMsg(out.error === "email_taken" ? "Цей email уже використовується." : out.error || "Не вдалося додати email.");
  }

  async function unlink(provider: "google" | "telegram" | "email") {
    setMsg(null);
    setUnlinking(provider);
    const out = await postAction({ action: "unlink", provider });
    if (out.ok) {
      setData((d) => ({
        ...d,
        linkedGoogle: provider === "google" ? false : d.linkedGoogle,
        linkedTelegram: provider === "telegram" ? false : d.linkedTelegram,
        hasPassword: provider === "email" ? false : d.hasPassword,
      }));
    } else setMsg(out.error || "Не вдалося від’єднати.");
    setUnlinking(null);
  }

  async function logout() {
    setLoggingOut(true);
    await fetch("/api/me", { method: "DELETE" });
    window.location.href = "/";
  }

  async function deleteAccount() {
    if (
      !confirm(
        `Видалити акаунт? Його можна відновити, увійшовши знову протягом ${RESTORE_WINDOW_LABEL}; після цього його буде видалено назавжди.`,
      )
    )
      return;
    setDeleting(true);
    await postAction({ action: "delete_account" });
    window.location.href = "/";
  }

  const initials = data.displayName.slice(0, 2).toUpperCase();

  return (
    <div className={styles.wrap}>
      <div className={styles.topRow}>
        <h1>Налаштування</h1>
        <a className={styles.back} href="/play">
          ← Назад
        </a>
      </div>
      {msg ? <p className={styles.msg}>{msg}</p> : null}

      <section className={styles.headerCard}>
        <label className={styles.avatarWrap} title="Змінити аватар (макс. 2 МБ)">
          {data.photoUrl ? (
            <img src={data.photoUrl} alt="Аватар" className={styles.avatarImg} />
          ) : (
            <span className={styles.avatarFallback} style={{ background: avatarColor(data.displayName) }}>
              {initials}
            </span>
          )}
          <span className={styles.avatarCam} aria-hidden>
            {avatarBusy ? <LoadingDots /> : <Icon name="photo_camera" size={16} />}
          </span>
          <input
            type="file"
            accept="image/*"
            hidden
            disabled={avatarBusy}
            onChange={uploadAvatar}
          />
        </label>
        <div className={styles.headerText}>
          {editing ? (
            <form className={styles.nameEdit} onSubmit={saveName}>
              <input
                className={styles.nameInput}
                value={nameDraft}
                maxLength={DISPLAY_NAME_MAX}
                autoFocus
                onChange={(e) => setNameDraft(e.target.value)}
              />
              <button type="submit" className={styles.iconBtn} disabled={nameBusy} title="Зберегти">
                {nameBusy ? <LoadingDots /> : <Icon name="check" size={18} />}
              </button>
              <button
                type="button"
                className={styles.iconBtn}
                onClick={() => {
                  setEditing(false);
                  setNameDraft(data.displayName);
                }}
                title="Скасувати"
              >
                <Icon name="close" size={18} />
              </button>
            </form>
          ) : (
            <div className={styles.nameRow}>
              <p className={styles.name}>{data.displayName}</p>
              <button
                type="button"
                className={styles.iconBtn}
                onClick={() => {
                  setNameDraft(data.displayName);
                  setEditing(true);
                }}
                title="Редагувати нік"
              >
                <Icon name="edit" size={16} />
              </button>
            </div>
          )}
          <p className={styles.muted}>
            {data.isSyntheticEmail ? "Акаунт Telegram" : data.email || "Без email"}
          </p>
          <div className={styles.badges}>
            {data.linkedGoogle ? (
              <span className={styles.badge}>
                <GoogleIcon size={14} />
                Google
              </span>
            ) : null}
            {data.linkedTelegram ? (
              <span className={styles.badge}>
                <TelegramIcon size={14} />
                Telegram
              </span>
            ) : null}
            {data.hasPassword ? (
              <span className={styles.badge}>
                <EmailIcon size={14} />
                Email
              </span>
            ) : null}
          </div>
        </div>
      </section>

      <section className={styles.card}>
        <h2 className={styles.h2}>Підключені акаунти</h2>
        <div className={styles.row}>
          <span className={styles.rowLabel}>
            <GoogleIcon size={18} />
            Google
          </span>
          {data.linkedGoogle ? (
            <button
              type="button"
              className={styles.linkBtn}
              disabled={unlinking === "google"}
              onClick={() => unlink("google")}
            >
              {unlinking === "google" ? <LoadingDots /> : "Від’єднати"}
            </button>
          ) : (
            <a className={styles.connectBtn} href="/api/auth/google">
              Підключити
            </a>
          )}
        </div>
        <div className={styles.row}>
          <span className={styles.rowLabel}>
            <TelegramIcon size={18} />
            Telegram
          </span>
          {data.linkedTelegram ? (
            <button
              type="button"
              className={styles.linkBtn}
              disabled={unlinking === "telegram"}
              onClick={() => unlink("telegram")}
            >
              {unlinking === "telegram" ? <LoadingDots /> : "Від’єднати"}
            </button>
          ) : (
            <a className={styles.connectBtn} href="/api/auth/telegram">
              Підключити
            </a>
          )}
        </div>
        <div className={styles.row}>
          <span className={styles.rowLabel}>
            <EmailIcon size={18} />
            Email
          </span>
          {data.hasPassword ? (
            <button
              type="button"
              className={styles.linkBtn}
              disabled={unlinking === "email"}
              onClick={() => unlink("email")}
            >
              {unlinking === "email" ? <LoadingDots /> : "Від’єднати"}
            </button>
          ) : (
            <span className={styles.muted}>Не задано</span>
          )}
        </div>
      </section>

      <section className={styles.card}>
        {data.hasPassword ? (
          <>
            <h2 className={styles.h2}>Зміна пароля</h2>
            <form className={styles.form} onSubmit={changePassword}>
              <input className={styles.input} type="text" autoComplete="username" value={data.email ?? ""} readOnly hidden />
              <input
                className={styles.input}
                type="password"
                placeholder="Поточний пароль"
                autoComplete="current-password"
                value={curPw}
                onChange={(e) => setCurPw(e.target.value)}
              />
              <input
                className={styles.input}
                type="password"
                placeholder="Новий пароль (8–20, зі спецсимволом)"
                autoComplete="new-password"
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                maxLength={PASSWORD_MAX}
              />
              <Button type="submit" loading={pwBusy}>
                Оновити пароль
              </Button>
            </form>
          </>
        ) : (
          <>
            <h2 className={styles.h2}>Додати email і пароль</h2>
            <p className={styles.muted}>Додай вхід за email як альтернативний спосіб увійти.</p>
            <form className={styles.form} onSubmit={addEmail}>
              <input
                className={styles.input}
                type="email"
                placeholder="Email"
                autoComplete="email"
                value={linkEmail}
                onChange={(e) => setLinkEmail(e.target.value)}
              />
              <input
                className={styles.input}
                type="password"
                placeholder="Пароль (8–20, зі спецсимволом)"
                autoComplete="new-password"
                value={linkPw}
                onChange={(e) => setLinkPw(e.target.value)}
                maxLength={PASSWORD_MAX}
              />
              <Button type="submit" loading={pwBusy}>
                Додати email і пароль
              </Button>
            </form>
          </>
        )}
      </section>

      <section className={styles.card}>
        <div className={styles.dangerRow}>
          <Button variant="ghost" loading={loggingOut} onClick={logout}>
            Вийти
          </Button>
          <button type="button" className={styles.deleteBtn} disabled={deleting} onClick={deleteAccount}>
            {deleting ? <LoadingDots /> : "Видалити акаунт"}
          </button>
        </div>
        <p className={styles.deleteHint}>
          Передумав? Акаунт можна відновити, увійшовши знову протягом {RESTORE_WINDOW_LABEL}. Після цього його буде
          видалено назавжди.
        </p>
      </section>
    </div>
  );
}
