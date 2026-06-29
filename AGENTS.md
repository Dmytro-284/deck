<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Deckforge — project rules

Roguelike deckbuilder. See `README.md` for the full layout.

- **Keep `core/` pure.** No React, no DOM, no `Math.random` — all randomness
  goes through the `Rng` from `core/rng.ts` so runs stay reproducible by seed.
  Game logic (combat, map, rewards) lives in `core/engine.ts` and is unit
  tested in `core/engine.test.ts` — run `npm test` after touching it.
- **Combat is d20.** Every attack rolls `rng.d20()` + mod (4 + strength) vs the
  target's AC: nat 20 = crit (×2), nat 1 = fumble (½), ≥AC = full, <AC = glance
  (½); never a hard miss (min 1 dmg). AC is static by tier (hero 12, enemy
  11/13/15). Damage events carry `roll`+`band` for the UI. Use the isolated
  `d20()` (not `int(20)`) so tests can force rolls without disturbing shuffles;
  in tests stub it via `{ ...makeRng(seed), d20: () => N }`.
- **Content is data.** Cards, relics, enemies, encounters, heroes, events and
  lore live under `core/content/` as typed data, not code. Add content there,
  not in the engine. The card model is a declarative `effects[]` array
  (damage/block/poison/heal/strength + statuses vulnerable/weak/regen/thorns/
  draw); `core/engine.ts` interprets it. Enemies can also gain strength via a
  `buff` intent.
- **`core/content/sprites.ts` is the sprite source** — hand-maintained SVG
  strings (no longer generated from the old prototype). Each value is a
  self-contained 100×100 SVG; keep gradient ids unique across sprites. New
  heroes/enemies need a sprite entry here plus its key in `SpriteKey`
  (`core/types.ts`). `components/Sprite.tsx` renders them.
- **Integrations live in `lib/`, never in `core/`.** Auth is a custom signed
  cookie (`lib/auth/*`: HMAC session + pbkdf2), NOT Supabase Auth; Supabase is
  reached only via the service-role client (`lib/supabase/service.ts`, server
  only) with gating in `app/api/*` route handlers on `public.users`. `lib/db/*`
  wraps the `deckforge_*` tables; `lib/cloud.ts` (run save + leaderboard) and
  `lib/profile.ts` (meta progression) are the client shims over `/api/*`. Avatar
  upload goes to the public Supabase storage `avatars` bucket (`POST
  /api/settings/avatar`, ≤2 MB, stored on `users.photo_url`). **Guest play is
  disabled** — `proxy.ts` (Next 16's renamed middleware) redirects `/play` +
  `/achievements` to `/login` without a session cookie; every cloud call still
  degrades gracefully (errors swallowed), localStorage is the offline cache.
  `lib/sfx.ts` = synthesised sound/haptics.
- **Meta progression** (`core/profile.ts`, pure + tested) is the persistent
  layer above a run: coins, unlocked heroes, per-hero campaign "lines"
  (level/xp/acts), and achievements (`core/achievements.ts`). Heroes form a 4×4
  grid (archetype × tier; `HERO_GRID`); base tier free, higher tiers unlock by
  coins or full clear. Stored in `deckforge_saves.meta` jsonb (no extra table).
- **UI is a thin layer.** Components in `components/` read engine state via the
  `store/useGame.ts` zustand store and self-animate (see `components/fx.tsx`).
  The store calls engine functions; it doesn't reimplement rules.
- **Mobile-first is mandatory.** A large share of players are on phones —
  every screen must stay usable and unbroken down to ~360px wide. New/changed
  UI needs responsive rules in the `@media (max-width:600px)` (and `380px`)
  blocks of `app/globals.css`: no horizontal overflow of the page, tap targets
  ≥36px, modals fit the viewport (`max-height` + scroll), wide tables/grids
  scroll inside their own container (e.g. `.heroGridScroll`) rather than the
  page. Verify layout at a narrow width before considering a UI change done.
- **Icons split by role.** Functional chrome (buttons, counters, tools rail)
  uses Material Symbols via `<Icon>` from `components/icons.tsx` — monochrome,
  tints with `currentColor`, font loaded in `app/layout.tsx`, base `.mi` class in
  globals. Game flavour (status effects, intents, enemy nameplate) uses themed
  inline SVGs from `components/combaticons.tsx`. Combat status visuals
  (glyph+label+badge class) come from the registry in `components/status.tsx` —
  add/restyle a status there, not inline. Illustrative content emoji (card art,
  relics, hero icons) stay as data in `core/content/`. Don't scatter raw emoji
  in components.
- **Theme (D&D skin).** Dungeon palette + frames live in `app/globals.css` via
  CSS vars (`--bg/--panel/--line/--gold/--ember`…); prefer the vars over new
  hardcoded colours. Fonts: `--font-display` (Cinzel, latin titles),
  `--font-body` (Lora, Cyrillic) from `next/font` in `app/layout.tsx`. The
  ember background (`components/Bgfx.tsx`) renders globally behind every page.
- **Deploy.** Vercel production branch is `main`; secrets live in the Vercel
  project env (see README / `.env.example`). Verify with `npm run build` +
  `npm test` before pushing.
