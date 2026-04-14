# AstroDecide — Complete Project Handoff

> This document captures the full context of the AstroDecide project as built in a previous Claude Code session. Paste this into a new Claude chat to continue from exactly where we left off.

---

## What Is This?

**AstroDecide** is a conversational Vedic astrology web app — a Jarvis-style cosmic AI guide called **ALIA** that tells you what to do and when based on your birth chart. Gen Z / Gen Alpha aesthetic. Think Co-Star meets ChatGPT.

**Live URL:** https://astrodecide.vercel.app
**Local dev:** `cd ~/astrodecide && npm run dev` → http://localhost:3001
**Local project path:** `/Users/aksshaypathak/astrodecide`

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16.2.2 (App Router) |
| Bundler (dev) | Webpack (`next dev --webpack`) — Turbopack has a known bug with PostCSS on nvm-installed Node |
| Bundler (prod) | Turbopack (Vercel uses it by default, works fine for prod builds) |
| Styling | Tailwind CSS v4 — uses `@import "tailwindcss"` + `@theme {}` blocks in CSS, NOT a `tailwind.config.ts` |
| PostCSS | `@tailwindcss/postcss` plugin |
| Fonts | `next/font/google` — Playfair Display (weight 400 only) + Inter (300, 400) injected as CSS variables |
| AI | Anthropic Claude (`claude-opus-4-6`) via `@anthropic-ai/sdk ^0.82.0` |
| Astrology | Built-in ephemeris (`src/lib/ephemeris.ts`) — NO external astrology API needed |
| Geocoding | OpenStreetMap Nominatim (free, no API key) |
| Storage | Browser cookies (`astro_profile`) — no database needed for MVP |
| Supabase | Installed but NOT used — optional future upgrade |
| Deployment | Vercel (deployed, live) |
| Node | v20.20.2 via nvm |

---

## Environment Variables

**Local:** `/Users/aksshaypathak/astrodecide/.env.local` (gitignored)
**Vercel:** Set via Vercel dashboard / CLI

```
ANTHROPIC_API_KEY=your_key_here
NEXT_PUBLIC_SUPABASE_URL=        (blank — not used)
NEXT_PUBLIC_SUPABASE_ANON_KEY=   (blank — not used)
SUPABASE_SERVICE_ROLE_KEY=       (blank — not used)
NEXT_PUBLIC_APP_URL=http://localhost:3001
```

---

## Design System

### Colors
```
Background:   #070710   (deep space, near-black with blue tint)
Surface:      rgba(255,255,255,0.04)  (glass morphism)
Border:       rgba(255,255,255,0.06)
Accent:       #8B5CF6   (violet — used VERY sparingly)
Accent glow:  rgba(139,92,246,0.2)
Text:         #ffffff
Text dim:     #9090A8   (cool grey)
Text muted:   #3D3D52   (dark muted)
```

### Typography
- **Display / ALIA voice:** Playfair Display serif, weight 400, italic style
- **UI / labels / user messages:** Inter sans-serif, weight 300–400
- **Font loading:** via `next/font/google` CSS variables `--font-playfair` and `--font-inter`
- **Important:** Playfair Display does NOT support weight 300 — use 400 only

### Aesthetic Rules
- Deep space dark background everywhere
- Ambient animated starfield always on (canvas, fixed, z-index 0, pointer-events none)
- Subtle cosmic purple radial gradient overlay (CSS `body::after`)
- Glass morphism for input bars and bottom sheets
- Violet `#8B5CF6` glow only for: ALIA dot indicator, active nav, send button
- All planet/zodiac unicode symbols need `\uFE0E` suffix to force text (not emoji) rendering
- Pill-shaped inputs and chips (border-radius: 999px)
- Typing indicator (3 bouncing dots) while ALIA is generating
- `slideUp` animation on new messages

### No:
- No border-radius on content areas (only chips/inputs/buttons)
- No color in chart wheel (monochrome SVG only)
- No external CSS `@import url()` (breaks Turbopack/webpack with PostCSS)

---

## App Architecture

```
astrodecide/
├── src/
│   ├── app/
│   │   ├── layout.tsx              ← Root layout: fonts, AmbientBackground, metadata
│   │   ├── page.tsx                ← Root redirect: → /ask (profile) or /onboarding
│   │   ├── globals.css             ← Tailwind v4 config + all CSS custom properties + animations
│   │   ├── onboarding/
│   │   │   └── page.tsx            ← Conversational onboarding (ALIA asks questions as chat)
│   │   ├── (app)/                  ← Route group with BottomNav shell
│   │   │   ├── layout.tsx          ← App shell: main + BottomNav
│   │   │   ├── ask/page.tsx        ← ★ MAIN SCREEN: ALIA chat, proactive daily greeting
│   │   │   ├── chart/page.tsx      ← Birth chart (wheel SVG + table), planet bottom sheet
│   │   │   ├── you/page.tsx        ← Profile: name, Rising/Moon/Sun, Dasha, insights
│   │   │   └── today/page.tsx      ← Daily insights (legacy screen, still works)
│   │   ├── settings/
│   │   │   └── page.tsx            ← Settings page (basic)
│   │   └── api/
│   │       ├── onboarding/route.ts ← POST: geocode → calculate chart → set cookie
│   │       ├── chat/route.ts       ← POST: streaming Claude response (SSE)
│   │       ├── daily/route.ts      ← GET: 4 daily insights (Career/Love/Self/Energy)
│   │       ├── chart/route.ts      ← GET: return chart data from cookie
│   │       ├── chart/interpret/route.ts ← POST: Claude interpretation of single planet
│   │       └── profile/route.ts    ← GET: profile + Claude-generated insights
│   ├── components/
│   │   ├── AmbientBackground.tsx   ← Canvas starfield (130 stars, always on, fixed)
│   │   ├── BottomNav.tsx           ← 3-tab nav: ✦ ALIA / ◎ CHART / ◇ YOU
│   │   ├── ChartWheel.tsx          ← SVG Vedic birth chart wheel
│   │   ├── PlanetGlyph.tsx         ← Unicode planet symbols with \uFE0E text rendering
│   │   └── StarLoader.tsx          ← Canvas constellation loader animation
│   └── lib/
│       ├── ephemeris.ts            ← ★ Built-in Vedic astrology calculator (no external API)
│       ├── alia.ts                 ← ALIA system prompt + chart/transit context builders
│       ├── astrology.ts            ← Geocoding (Nominatim) + AstrologyAPI.com stubs (unused)
│       ├── storage.ts              ← localStorage helpers (SSR-safe)
│       └── supabase.ts             ← Supabase client (installed, not used)
├── package.json                    ← "dev": "next dev --webpack" ← CRITICAL
├── postcss.config.mjs              ← @tailwindcss/postcss
└── .env.local                      ← API keys (gitignored)
```

---

## User Flow

### First Visit
1. `/` → checks `astro_profile` cookie → no cookie → redirect to `/onboarding`
2. `/onboarding` → ALIA types intro messages ("Hi ✦ I'm ALIA...") with typing indicators
3. ALIA asks: name → birth date (DD/MM/YYYY) → birth time (HH:MM 24h) → birthplace (City, Country)
4. User responds in chat-style input at the bottom
5. On completion → POST `/api/onboarding` → geocode city → calculate chart → set cookie → redirect to `/ask`

### Returning Visit
1. `/` → has `astro_profile` cookie → redirect to `/ask`
2. ALIA loads today's briefing from `/api/daily` (Claude generates 4 insights using chart data)
3. Shows as opening message: "Good morning ✦\n\n[insight text]"
4. Quick action chips appear: "What's blocking me today?" / "Should I trust this decision?" etc.
5. User types anything or taps a chip → streams response from `/api/chat`
6. Category chips (CAREER/LOVE/MONEY/FAMILY/TRAVEL/HEALTH/TIMING) appear after first message

### Navigation (BottomNav — 3 tabs)
- **✦ ALIA** → `/ask` — main chat with proactive daily briefing
- **◎ CHART** → `/chart` — birth chart (WHEEL toggle / TABLE toggle)
- **◇ YOU** → `/you` — profile, Rising/Moon/Sun, Dasha period

---

## Cookie Schema (`astro_profile`)

Stored as JSON string in browser cookie. Contains:
```json
{
  "name": "Akshay",
  "dob": "15/08/1995",
  "tob": "14:30",
  "pob": "Mumbai, India",
  "lat": "19.0760",
  "lon": "72.8777",
  "tzone": "5.5",
  "chart_data": "{...stringified ChartResult...}",
  "dasha_data": "{...stringified dasha info...}"
}
```

---

## Ephemeris Engine (`src/lib/ephemeris.ts`)

Completely built-in — no AstrologyAPI.com or Swiss Ephemeris dependency.

**What it calculates:**
- Julian Day Number from Gregorian date + time
- Lahiri Ayanamsha for sidereal conversion (subtracts ~23.85° from tropical)
- Sun, Moon, Mercury, Venus, Mars, Jupiter, Saturn longitudes (simplified mean motion formulas)
- Rahu (mean north node) and Ketu (opposite point)
- Ascendant via Local Sidereal Time (LST) from geographic coordinates
- House system: equal house from Ascendant
- Nakshatra (27 × 13°20′ divisions) and pada
- Vimsottari Dasha (120-year cycle): which planet Dasha is active based on Moon nakshatra lord

**Function signature:**
```ts
calculateChart(day, month, year, hour, min, lat, lon, tzone): ChartResult
```

**Accuracy:** Good enough for demonstration/MVP. Moon can be off ±2°, good for sign/nakshatra level.

---

## ALIA Persona (`src/lib/alia.ts`)

```
ALIA is a wise, warm Vedic astrologer.
- Speaks like a trusted elder: specific, grounded, never generic
- Always references specific chart placements ("With your Moon in Scorpio in the 4th house...")
- Uses Vedic/Jyotish terminology naturally (Rahu, Ketu, Dasha, Nakshatra, etc.)
- Ends every response with a timing insight OR concrete actionable step
- Max 4 paragraphs
- Never says "as an AI"
- Never fatalistic — shows energy and choices
- If unclear, asks ONE focused clarifying question
```

The system prompt is injected per-request with:
- Full chart data (planets, signs, houses, nakshatras)
- Current dasha period
- User's name
- Category context (if chip selected)

---

## API Routes

### `POST /api/onboarding`
**Input:** `{ name, dob, tob, pob }` (dob=DD/MM/YYYY, tob=HH:MM)
**What it does:**
1. Geocodes `pob` via Nominatim → gets lat/lon/timezone
2. Parses dob/tob into day/month/year/hour/min
3. Calls `calculateChart()` from `ephemeris.ts`
4. Sets `astro_profile` cookie with all data + chart_data + dasha_data

**Response:** `{ success: true, ascendant, sun, moon }`

---

### `POST /api/chat`
**Input:** `{ messages: [{role, content}], category? }`
**What it does:**
1. Reads `astro_profile` cookie
2. Builds system prompt: ALIA_SYSTEM_PROMPT + chart context + dasha + category
3. Streams Claude `claude-opus-4-6` response as SSE

**SSE format:**
```
data: {"delta":{"text":"chunk"}}\n\n
data: [DONE]\n\n
```

---

### `GET /api/daily`
**What it does:**
1. Reads cookie, builds birth data + transits
2. Asks Claude to generate exactly 4 insights: Career/Love/Self/Energy
3. Returns JSON array:
```json
[{"id":"...", "text":"...", "planet":"Mercury", "house":10, "category":"Career"}]
```

---

### `GET /api/chart`
**Returns:** Full chart data from cookie, formatted:
```json
{
  "chart": {
    "planets": [{"planet":"Sun","sign":"Cancer","house":9,"nakshatra":"Ashlesha","degree":"12.4"}],
    "ascendant": {"sign":"Scorpio","degree":"5.2"},
    "sun": {"sign":"Cancer"},
    "moon": {"sign":"Pisces"}
  }
}
```

---

### `POST /api/chart/interpret`
**Input:** `{ planet: "Mercury" }`
**Returns:** `{ interpretation: "..." }` — Claude's 3-4 sentence reading of that placement

---

### `GET /api/profile`
**Returns:**
```json
{
  "profile": {
    "name": "Akshay",
    "rising": "Scorpio",
    "moon": "Pisces",
    "sun": "Cancer",
    "dasha": "Sun Mahadasha",
    "dashaEnd": "2029",
    "insights": {
      "career": "...",
      "relationships": "...",
      "self": "..."
    }
  }
}
```

---

## Key Technical Fixes Applied (Important Context)

### 1. Turbopack + PostCSS bug
**Problem:** `next dev` (Turbopack default) panics with PostCSS/Tailwind v4 on nvm Node installations.
**Fix:** `package.json` dev script uses `"next dev --webpack"`. Production builds on Vercel use Turbopack and work fine.

### 2. Playfair Display weight 300 doesn't exist
**Problem:** `next/font` throws error for weight "300" on Playfair Display.
**Fix:** Only load `weight: ["400"]` for Playfair Display. Use Inter for weight 300 text.

### 3. Zodiac/planet symbols render as colorful emoji
**Problem:** Unicode symbols like ♈ ♀ ♂ render as colorful emoji in browser.
**Fix:** Append `\uFE0E` (Unicode text variation selector) to every symbol to force monochrome text rendering.

### 4. AstrologyAPI.com dependency removed
**Problem:** Original spec used AstrologyAPI.com but no credentials available.
**Fix:** Built complete ephemeris calculator in `src/lib/ephemeris.ts`. Zero external dependencies for chart calculation.

### 5. Fonts via `next/font/google`, not CSS `@import`
**Problem:** CSS `@import url('https://fonts.googleapis.com/...')` causes Turbopack panic.
**Fix:** Fonts loaded via `next/font/google` in `layout.tsx`, injected as CSS variables `--font-playfair` and `--font-inter`.

### 6. Global launch.json needs `--webpack`
**File:** `~/.claude/launch.json`
The AstroDecide entry must include `"--webpack"` in runtimeArgs or the preview server still uses Turbopack.

---

## Deployment

### Vercel (Live)
- **URL:** https://astrodecide.vercel.app
- **Project:** `mailakshay90-4702s-projects/astrodecide`
- **Env var set:** `ANTHROPIC_API_KEY` (production)

### To Redeploy After Changes
```bash
cd ~/astrodecide
source ~/.nvm/nvm.sh
vercel --prod --yes
```

### Local Dev
```bash
cd ~/astrodecide
npm run dev
# → http://localhost:3001
```

---

## What's Implemented vs Not

### ✅ Done
- Conversational onboarding (ALIA asks questions as chat)
- Built-in Vedic ephemeris (no external API)
- ALIA chat with SSE streaming
- Proactive daily briefing on app open
- Quick action chips (6 suggestions)
- Category chips (CAREER/LOVE/MONEY/FAMILY/TRAVEL/HEALTH/TIMING)
- Birth chart SVG wheel (monochrome)
- Planet table (sign, house, nakshatra, degree, retrograde)
- Planet tap → bottom sheet with Claude interpretation
- YOU screen: name, Rising/Moon/Sun, Dasha period, profile insights
- Ambient starfield canvas background (always on)
- New cosmic aesthetic: deep space dark, violet accent, glass morphism
- 3-tab nav: ✦ ALIA / ◎ CHART / ◇ YOU
- Typing indicator (3 bouncing dots) while ALIA generates
- Markdown `**bold**` stripped from all Claude responses
- Cookie-based profile storage (no database)
- Deployed to Vercel with API key set

### ❌ Not Yet Done / Future Ideas
- **User accounts / auth** — currently profile is per-browser (cookie). No login, no cross-device sync. Could add Supabase Auth (already installed).
- **Push notifications** — "Today's cosmic weather" daily notification
- **Custom domain** — currently `astrodecide.vercel.app`. Can add in Vercel dashboard.
- **Onboarding time picker** — currently free-text HH:MM. Could be a time input wheel.
- **Transit alerts** — "Important transit happening today for you"
- **Social sharing** — share your Rising/Moon/Sun card as image
- **Chart accuracy** — current ephemeris is simplified mean motion. For production accuracy, integrate Swiss Ephemeris (requires C bindings or WASM build).
- **Supabase integration** — persist profiles server-side, allow cross-device
- **Multiple profiles** — read chart for a partner/friend
- **Chart synastry** — compare two charts
- **Settings page** — currently exists as stub (`src/app/settings/page.tsx`), needs content

---

## Dependencies (`package.json`)

```json
{
  "dependencies": {
    "@anthropic-ai/sdk": "^0.82.0",
    "@supabase/ssr": "^0.10.0",
    "@supabase/supabase-js": "^2.101.1",
    "next": "16.2.2",
    "react": "19.2.4",
    "react-dom": "19.2.4"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4",
    "@types/node": "^20",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "eslint": "^9",
    "eslint-config-next": "16.2.2",
    "tailwindcss": "^4",
    "typescript": "^5"
  }
}
```

---

## Component Reference

### `AmbientBackground.tsx`
- Fixed canvas, z-index 0, pointer-events none, opacity 0.75
- 130 stars, slowly drifting (dx/dy 0.05px/frame), wrapping edges
- Twinkling via sine wave opacity (0.15–0.5 range)
- Listens to window resize

### `BottomNav.tsx`
- Fixed bottom, z-index 100
- Glass background: `rgba(7,7,16,0.88)` + backdrop-filter blur(24px)
- Border-top: `rgba(255,255,255,0.06)`
- Active state: symbol turns `#8B5CF6` with drop-shadow glow; label turns `#e8e8ff`
- Safe area padding for iPhone notch: `env(safe-area-inset-bottom)`

### `ChartWheel.tsx`
- SVG 320×320 viewBox
- Three concentric circles: outer (sign ring), middle (transition), inner (house area)
- Ascendant placed at 9 o'clock (180° angle)
- Houses are equal (30° each from Ascendant)
- All symbols use `\uFE0E` variation selector

### `StarLoader.tsx`
- 60 stars, pre-computed connections for pairs within 80px distance
- Connection lines drawn at `rgba(255,255,255, avgOpacity * 0.3)`
- Used in loading states throughout the app

### `PlanetGlyph.tsx`
- Renders inline `<span>` with `font-family: serif`
- All glyphs have `\uFE0E` suffix

---

## Conversation Context for Claude

The user's name is **Akshay**. He is the product owner and is not very technical — he prefers you to do things for him rather than give him instructions. He uses the app himself (born 15/08/1995, 14:30, Mumbai, India — Sun in Cancer house 9, Moon in Pisces house 5, Scorpio rising, Sun Mahadasha until 2029).

**Preferences:**
- Don't explain what you're about to do, just do it
- Fix issues autonomously without asking
- He prefers clean, minimal outputs
- He does not want to run commands himself unless absolutely necessary

**How to run things:**
```bash
# Always source nvm first
source ~/.nvm/nvm.sh

# Dev server
cd ~/astrodecide && npm run dev

# Deploy to Vercel
cd ~/astrodecide && vercel --prod --yes

# Clear Next.js cache (if needed)
rm -rf ~/astrodecide/.next
```

---

## Preview Server Config

**File:** `~/.claude/launch.json`
```json
{
  "version": "0.0.1",
  "configurations": [
    {
      "name": "AstroDecide",
      "runtimeExecutable": "/Users/aksshaypathak/.nvm/versions/node/v20.20.2/bin/node",
      "runtimeArgs": [
        "/Users/aksshaypathak/astrodecide/node_modules/.bin/next",
        "dev",
        "--webpack"
      ],
      "port": 3001,
      "autoPort": true,
      "cwd": "/Users/aksshaypathak/astrodecide"
    }
  ]
}
```

---

## Git Status

The project is a git repo at `~/astrodecide`. Last commit: `"AstroDecide — full app with ALIA conversational interface"`. Everything is committed. There is no remote GitHub repo — deployment is done directly from local via Vercel CLI.

---

*Generated from Claude Code session — April 3, 2026*
