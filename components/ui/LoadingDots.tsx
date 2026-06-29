import styles from "./LoadingDots.module.css";

/** Three-dot loading indicator. */
export function LoadingDots() {
  return (
    <span className={styles.dots} aria-label="Loading">
      <span />
      <span />
      <span />
    </span>
  );
}
