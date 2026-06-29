/**
 * Canonical site origin used to build OAuth redirect URIs and reset links.
 *
 * Order:
 *  1. NEXT_PUBLIC_BASE_URL — explicit pin (set this to force one origin).
 *  2. The incoming request's host — so the redirect_uri matches whatever domain
 *     the user is actually on (e.g. d3ckk3r.vercel.app), which is what must be
 *     registered with Google/Telegram and must match between authorize→token.
 *  3. VERCEL_PROJECT_PRODUCTION_URL — stable prod domain when no request given.
 *  4. localhost — dev.
 */
export function baseUrl(req?: { headers: Headers }): string {
  if (process.env.NEXT_PUBLIC_BASE_URL) return process.env.NEXT_PUBLIC_BASE_URL;
  if (req) {
    const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
    if (host) {
      const proto = req.headers.get("x-forwarded-proto") || "https";
      return `${proto}://${host}`;
    }
  }
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL)
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  return "http://localhost:3000";
}
