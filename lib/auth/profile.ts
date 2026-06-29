/**
 * Shared display-name policy, used by both the rename UI and the server action so the
 * rules can't drift apart. Policy: 2–20 characters (trimmed).
 */
export const DISPLAY_NAME_MIN = 2;
export const DISPLAY_NAME_MAX = 20;

/** Validate a display name; returns a UA error string, or null when valid. */
export function validateDisplayName(name: string): string | null {
  const n = name.trim();
  if (n.length < DISPLAY_NAME_MIN)
    return `Нік має містити щонайменше ${DISPLAY_NAME_MIN} символи.`;
  if (n.length > DISPLAY_NAME_MAX)
    return `Нік не довший за ${DISPLAY_NAME_MAX} символів.`;
  return null;
}
