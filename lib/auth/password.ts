/**
 * Shared password policy, used by both the client form and the API route so the rules
 * can't drift apart. Policy: 8–20 characters, with at least one special character.
 */
export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 20;

// At least one character that is not a letter or digit (covers !@#$%^&* etc.).
const SPECIAL_RE = /[^A-Za-z0-9]/;

export const PASSWORD_RULE_TEXT = `${PASSWORD_MIN}–${PASSWORD_MAX} characters, with at least one special character (e.g. !@#$%).`;

/** Returns an error message if the password is invalid, or null if it passes. */
export function validatePassword(password: string): string | null {
  if (password.length < PASSWORD_MIN || password.length > PASSWORD_MAX) {
    return `Password must be ${PASSWORD_MIN}–${PASSWORD_MAX} characters.`;
  }
  if (!SPECIAL_RE.test(password)) {
    return "Password must include at least one special character (e.g. !@#$%).";
  }
  return null;
}
