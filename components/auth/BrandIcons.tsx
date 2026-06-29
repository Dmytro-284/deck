/** Shared provider brand icons (login + settings). Self-sized via props, no CSS dependency. */

interface IconProps {
  size?: number;
  className?: string;
}

/** Official multicolor Google "G" mark. */
export function GoogleIcon({ size = 20, className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 48 48" aria-hidden width={size} height={size}>
      <path
        fill="#4285F4"
        d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17z"
      />
      <path
        fill="#34A853"
        d="M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.31-9.07H4.34v5.7C7.96 41.07 15.4 46 24 46z"
      />
      <path
        fill="#FBBC05"
        d="M11.69 28.18C11.25 26.86 11 25.45 11 24s.25-2.86.69-4.18v-5.7H4.34A21.99 21.99 0 0 0 2 24c0 3.55.85 6.91 2.34 9.88l7.35-5.7z"
      />
      <path
        fill="#EA4335"
        d="M24 10.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 4.18 29.93 2 24 2 15.4 2 7.96 6.93 4.34 14.12l7.35 5.7c1.73-5.2 6.58-9.07 12.31-9.07z"
      />
    </svg>
  );
}

/** Telegram paper-plane mark (brand blue circle baked in). */
export function TelegramIcon({ size = 20, className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 240 240" aria-hidden width={size} height={size}>
      <circle cx="120" cy="120" r="120" fill="#29A9EB" />
      <path
        fill="#fff"
        d="M53 118.5l122.6-47.3c5.7-2 10.7 1.4 8.8 10.1l.01-.01-20.9 98.4c-1.5 7-5.7 8.7-11.5 5.4l-31.9-23.5-15.4 14.8c-1.7 1.7-3.1 3.1-6.4 3.1l2.3-32.6 59.3-53.6c2.6-2.3-.6-3.6-4-1.3l-73.3 46.1-31.6-9.9c-6.9-2.2-7-6.9 1.5-10.2z"
      />
    </svg>
  );
}

/** Generic envelope/letter mark for the email login method. */
export function EmailIcon({ size = 20, className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden width={size} height={size}>
      <rect x="2.5" y="4.5" width="19" height="15" rx="2.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M3 6.5l9 6 9-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  );
}
