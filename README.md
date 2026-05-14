# snapchef

Smart Recipe Planner — snap ingredients, get personalized recipes with AI-powered matching and adaptation.

## Get the app on your phone

1. Download Expo Go:
   - [iOS (App Store)](https://apps.apple.com/app/expo-go/id982107779)
   - [Android (Play Store)](https://play.google.com/store/apps/details?id=host.exp.exponent)

2. Scan the QR code below with your phone (iOS camera app or Expo Go's "Scan QR code" on Android):

   ![QR code for snapchef in Expo Go](./docs/expo-qr.png)

3. **Or search inside Expo Go** — open the app, tap the Profile tab, search `@drnohan/snapchef` and tap to open

> First load takes ~10–15 seconds while the bundle downloads. After that it's instant.

## Features

- **Photo ingredient detection** — Take a photo of ingredients, Claude Vision identifies them
- **Ingredient normalization** — Detected items matched to Algolia's recipe vocabulary with alternatives picker
- **Recipe matching** — Find recipes using your ingredients (1M recipe database)
- **"Can make now" filter** — Only show recipes you have all ingredients for
- **LLM recipe adaptation** — "Make it with what I have" substitutes missing ingredients
- **AI-powered search** — Natural language queries ("quick weeknight pasta")
- **Pantry management** — Persistent ingredient inventory (Clerk auth + Supabase)
- **Multi-platform** — Works on web, iOS, and Android via Expo

## Running Locally

### Prerequisites

- **Node.js 20+** (we use 24.x, but 20+ works)
- **npm** (comes with Node)

### Setup

```bash
# Clone
git clone https://github.com/rsinha-brex/snapchef.git
cd snapchef

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Fill in your own service credentials (see below)

# Start the dev server
npx expo start --web --port 8081
```

Then open http://localhost:8081 in your browser.

### Environment Variables

Copy `.env.example` to `.env` and fill in:

| Variable | Source | Required |
|----------|--------|----------|
| `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` | [Clerk](https://clerk.com) → API Keys | Yes |
| `CLERK_SECRET_KEY` | Clerk → API Keys | Yes |
| `ALGOLIA_APP_ID` | [Algolia](https://algolia.com) → API Keys | Yes |
| `ALGOLIA_SEARCH_API_KEY` | Algolia → API Keys | Yes |
| `SUPABASE_URL` | [Supabase](https://supabase.com) → Settings → API | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API | Yes |
| `DATABASE_URL` | Supabase → Settings → Database → Connection string (pooler) | Yes |
| `DIRECT_URL` | Supabase → Settings → Database → Connection string (direct) | Yes |
| `OPENROUTER_API_KEY` | [OpenRouter](https://openrouter.ai) → API Keys | Yes |

### Running on Mobile (Expo Go)

```bash
npx expo start
```

Scan the QR code with Expo Go (iOS/Android). Requires SDK 54 compatible Expo Go.

## Tech Stack

- **Framework**: Expo SDK 54 + Expo Router 6
- **UI**: React Native (cross-platform)
- **Auth**: Clerk
- **Database**: Supabase (PostgreSQL)
- **Recipe Search**: Algolia (1M recipes indexed)
- **AI/LLM**: Claude via OpenRouter (vision detection, recipe adaptation, AI search)
- **State**: Zustand (ephemeral counter store)

## Architecture

```
app/
  (auth)/          — Sign-in screen
  (tabs)/
    recipes/       — Browse, filter, AI search, detail + adaptation
    counter/       — Photo detection, manual add, recipe matching
    pantry/        — Persistent ingredient inventory
    saved/         — Saved recipes & adaptations
  api/             — Server-side API routes (Expo Router)
    recipes/       — search, match-pantry, adapt, ai-search
    vision/        — Claude Vision ingredient detection
    ingredients/   — normalize, autocomplete
    me/            — User pantry CRUD (authenticated)

lib/               — Algolia, Supabase, Anthropic clients
stores/            — Zustand counter store
components/        — Shared UI (RecipeCard, ManualAddSheet, etc.)
scripts/           — Test suite (300 browser tests)
```

## Recipe Data

1M recipes from [RecipeNLG](https://recipenlg.cs.put.poznan.pl/) (open-source), enriched with:
- Heuristic labels (cook time, dietary tags, protein type)
- LLM-generated labels (cuisine, meal type, difficulty)
- Indexed in Algolia with searchable attributes + facets

## Testing

```bash
# Run 300 production stress tests (requires GTM browser on :9223)
node scripts/browser-tests/run-production.mjs

# Run specific category
node scripts/browser-tests/run-production.mjs --cat=7  # API only
```
