"use client";
import type { ButtonHTMLAttributes } from "react";
import { LoadingDots } from "./LoadingDots";
import styles from "./Button.module.css";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "ghost";
  fullWidth?: boolean;
  loading?: boolean;
}

/** Minimal button used by the auth/settings forms. */
export function Button({
  variant = "primary",
  fullWidth,
  loading,
  disabled,
  children,
  className,
  ...rest
}: Props) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={[
        styles.btn,
        variant === "ghost" ? styles.ghost : styles.primary,
        fullWidth ? styles.full : "",
        className ?? "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {loading ? <LoadingDots /> : children}
    </button>
  );
}
