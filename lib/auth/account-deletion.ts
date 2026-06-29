// Soft-deleted accounts can be restored by signing in again within this window.
export const RESTORE_WINDOW_DAYS = 30;
export const RESTORE_WINDOW_LABEL = "one month";

const RESTORE_WINDOW_MS = RESTORE_WINDOW_DAYS * 24 * 60 * 60 * 1000;

export function withinRestoreWindow(deletedAt: string | null | undefined): boolean {
  if (!deletedAt) return false;
  const t = Date.parse(deletedAt);
  if (Number.isNaN(t)) return false;
  return Date.now() - t < RESTORE_WINDOW_MS;
}
