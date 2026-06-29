# ⚔ Deckforge

Темне-фентезі roguelike deckbuilder у стилістиці D&D. 16 героїв (сітка 4×4:
архетип × ступінь), 4 акти, групи ворогів (вибір цілі + AoE), **d20-бій**,
статуси, реліквії, Кодекс, щоденний забіг, таблиця лідерів. Над забігом —
**мета-прогрес**: рівні героїв, валюта, розблокування ступенів, досягнення.
Лише зареєстровані акаунти (без гостя), хмарне збереження. Next.js + TypeScript,
deploy на Vercel.

Гра живе на `/play` (потрібен вхід).

## Стек

- **Next.js 16** (App Router) + **React 19** + **TypeScript**
- **zustand** — стан гри
- **Supabase** (service-role, як БД) — акаунти, хмарне збереження, лідери
- **next/font** — Cinzel (заголовки) + Lora (кирилиця)
- **Vitest** — юніт-тести ігрового ядра

## Архітектура

Чисте розділення **дані / логіка / рендер** (strangler-fig міграція з прототипу):

```
core/                 framework-agnostic: нуль React/DOM, нуль Math.random
  types.ts            Card (effects[]), Relic, Enemy, Intent, Hero, NodeType…
  state.ts            рантайм-стан (RunState, CombatState, CombatEvent, AC, roll)
  rng.ts              seeded mulberry32 + d20() — забіг відтворюваний за seed
  engine.ts           d20-бій + статуси + генерація мапи + нагороди (чисті ф-ції)
  profile.ts          мета-прогрес: профіль, лінії героїв, розблокування (чисте)
  achievements.ts     досягнення + видача нагород (чисте)
  *.test.ts           51 юніт-тест (engine + profile + achievements)
  content/            контент як дані (heroes 4×4 grid, cards, relics, encounters,
                      nodes, events, lore) + sprites.ts (SVG, редагується руками)
store/
  useGame.ts          zustand — оркестрація run/combat/shop/events над engine
lib/
  cloud.ts            хмарний шар над /api/* (сейв, лідери) через акаунт-сесію
  profile.ts          хмарний шар мета-профілю (localStorage + /api/profile)
  auth/               кастом-auth: session (HMAC-cookie + pbkdf2), password,
                      profile, account-deletion, require-user, actions
  supabase/service.ts service-role клієнт (тільки сервер; RLS обходиться) + rate-limit
  db/                 saves, scores, profiles, bootstrap (доступ до deckforge_*)
  base-url.ts         канонічний origin для OAuth redirect / лінків
  sfx.ts              звук (Web Audio) + гаптика
types/db.generated.ts  типи Supabase (users / deckforge_saves / deckforge_scores)
components/           ClassSelect, MapView, Combat, Shop, Modals, StatBar, Sprite,
                      CardView, Bgfx, fx; icons.tsx (Material Symbols хром-іконки),
                      combaticons.tsx (тематичні SVG-гліфи бою), status.tsx
                      (реєстр статус-ефектів: гліф+підпис+клас); auth/ (AuthForm,
                      ResetForm, SettingsClient, BrandIcons); ui/ (Button, LoadingDots)
app/
  page.tsx            головна = форма входу/реєстрації; залогінених → /play
  play/page.tsx       React-гра
  reset               скидання пароля (login/ лишився лише з .module.css)
  settings/page.tsx   акаунт: нік+аватар, провайдери, email+пароль, видалення
  codex, leaderboard  бібліотека й рейтинги
  achievements        перегляд досягнень
  api/                register (login/register/reset/link/unlink/delete/restore
                      /update_display_name), me, auth/google(+callback),
                      auth/telegram(+callback), save, score, profile,
                      settings/avatar
  globals.css         ігровий CSS (D&D-скін)
proxy.ts              гейт автентифікації (/play, /achievements → /login)
core/content/sprites.ts  SVG-спрайти героїв/ворогів (джерело, редагується руками)
```

Ключове: `core/` не знає про React. Бій тестується юнітами без браузера, а UI —
тонкий шар, що читає engine через store і самоанімується.

## Команди

```bash
npm run dev       # localhost:3000
npm test          # юніт-тести ядра (vitest)
npm run build     # прод-білд
```

## Геймплей

Лендинг `/` → грати гостем або увійти → вибір героя → мапа (бій / еліт /
магазин / подія / багаття / бос). У бою: **дії** 3/хід (поповнюються), карти
atk/blk/poison/heal/str + статуси, вибір цілі та AoE проти груп, наміри ворогів.

**d20-бій:** кожна атака (герой і вороги) кидає d20 + мод (4 + Сила) проти **AC**
цілі. Нат.20 — крит ×2, нат.1 — фамбл ½, ≥AC — повний урон, <AC — ковзний ½.
Промаху нема (удар завжди ≥1). AC статичний за тиром: герой 12, вороги 11
(звич.) / 13 (еліт) / 15 (бос). Лог показує кидок і бенд (крит/ковзний/схибив).

Карти — декларативні `effects[]`: урон / обладунок / отрута / зцілення / сила
плюс статуси (вразливість, слабкість, реген, шипи, добір). Деякі вороги
посилюються по ходу бою (`buff`). Реліквії — пасивні бонуси. Втеча зі звичайного
бою — штраф ~25% HP без нагороди; боса оминути не можна. 4 акти → перемога над
Володарем Порожнечі; після кожного боса — благословіння (+макс. HP / реліквія /
золото+зцілення).

**Кодекс** (`/codex`) — лор, герої, картки, реліквії, бестіарій. **Щоденний
забіг** — спільний сід на день. Звук і гаптика — з тумблером у грі.

## Акаунти й хмара

Вхід — **кастомна сесія** (підписаний cookie + pbkdf2), не Supabase Auth:
Google, Telegram (OIDC+PKCE) і email/пароль. Supabase використовується лише як
БД через service-role; гейтинг — у роутах `/api/*` за сесією на `public.users`.

- **Гість** грає на localStorage. **Вхід** дає хмарний сейв (`deckforge_saves`)
  + лідерборд (`deckforge_scores`); гостьовий прогрес пушиться в хмару при вході.
- Хмара best-effort: мережеві/auth-помилки ковтаються, localStorage лишається
  джерелом істини.

### Env (Vercel / `.env.local` — див. `.env.example`)

`SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `SESSION_SECRET` (≥16),
`GOOGLE_CLIENT_ID/SECRET`, `TELEGRAM_CLIENT_ID/SECRET`, `RESEND_API_KEY` (опц.,
листи скидання). `NEXT_PUBLIC_BASE_URL` опційний — на Vercel origin для OAuth
redirect виводиться з host запиту / `VERCEL_PROJECT_PRODUCTION_URL`.

OAuth redirect URI: `${origin}/api/auth/{google,telegram}/callback`.

## Деплой

Vercel автодетектить Next.js. Продакшн-гілка — `main`. Env вище мають бути
виставлені у проекті (Production), інакше вхід/хмара недоступні (гра грабельна
гостем).
