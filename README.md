# SpotClip

> Turn TikTok food and travel saves into organized, searchable collections.

---

## Overview

### Problem

People who discover restaurants, cafes, and travel spots through TikTok save videos but struggle to retrieve specific place information later. When it's actually time to visit, they end up rewatching multiple clips just to find a single location name. TikTok's default save system offers no structure, tagging, or filtering — it's a flat list of videos.

### Solution

SpotClip lets you upload screenshots of TikTok posts. An AI extracts the most likely place name from the image, assigns category tags, and saves it into a named collection. Spots can then be filtered by tag, marked as favorites or visited, and annotated with notes — turning passive video saves into an actionable planning list.

---

## How It Works (User Flow)

1. **Open the app** → tap the **upload button** in the floating nav bar.
2. **Pick one or more screenshots** from your camera roll, then tap **Extract Places**. Alternatively, tap **Add Manually** to enter a place name, city, address, and note directly without uploading an image.
3. The backend sends the images to OpenAI, which extracts the most likely place name(s) and proposes 1–3 category tags. Addresses are also inferred automatically.
4. **Review extracted results** in the app — confirm or discard each suggested place.
5. **Save to a collection** — either create a new collection or append to an existing one.
6. Browse your **Collections** tab, filter by tag, tap a place to add a note, mark it as **Visited**, or star it as a **Favorite**.
7. Switch to the **Map** tab to see all saved spots geocoded on a map. Tap a pin to view details, or use **Near Me** to find saved spots close to your current location.
8. The **Favorites** screen aggregates starred spots across all collections.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Mobile app | React Native (Expo ~54), React Navigation v7 |
| Backend | Node.js 18+, Express 4, TypeScript |
| AI extraction | OpenAI API — `gpt-4o-mini` with Vision |
| Data storage | In-memory runtime store (module-level TypeScript Maps) |
| Monorepo | npm workspaces |
| Shared types | `@spotclip/shared` internal package |
| Backend dev runner | `tsx watch` |
| Testing | Vitest + Supertest |

---

## Architecture

### Mobile app (`apps/mobile`)

An Expo React Native app with a tab-based layout managed by a native stack navigator:

- **TabsScreen** — root screen housing two tabs rendered side-by-side with a `FloatingNavBar`: **Collections** and **Map**.
- **CollectionsScreen** — grid of all collections plus a Favorites shortcut card.
- **MapScreen** — interactive map showing all saved spots geocoded to coordinates. Supports location search, a user-location pin, and a **Near Me** bottom sheet that lists saved spots within range.
- **UploadScreen** — modal flow: pick screenshots → AI extracts place names → review results → choose collection. Includes a **manual entry** mode to add a place by name, city, address, and note without uploading images.
- **CollectionDetailScreen** — list of places in a collection with tag-filter chips, inline favorite/visited toggles, edit, and delete.
- **FavoritesDetailScreen** — all favorited places aggregated across every collection.

Reusable components (`PlaceCard`, `PlaceBottomSheet`, `NearMeBottomSheet`, `EditSpotModal`, `CreateCollectionModal`, `CollectionPickerModal`, `NoteViewModal`, `SplashOverlay`, `FloatingNavBar`) keep screen logic thin.

### Backend (`apps/api`)

Node.js + Express + TypeScript server exposing a REST API:

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/clips/ingest` | Accept screenshots (multipart), call OpenAI Vision, return extracted places |
| `GET` | `/collections` | List all collections |
| `POST` | `/collections/:id/places` | Create collection or append places; auto-tags via OpenAI |
| `GET` | `/collections/:id` | Get single collection |
| `PATCH` | `/collections/:collectionId/places/:placeId` | Update isFavorite, isVisited, note, tags |
| `DELETE` | `/collections/:collectionId/places/:placeId` | Remove a place |
| `GET` | `/favorites` | All favorited places across collections |
| `GET` | `/health` | Health check |

### AI extraction + tagging + addressing (`apps/api/src/vision.ts`, `tagging.ts`, `addressing.ts`)

- **Vision prompt:** GPT-4o-mini analyzes each uploaded image and returns the single most likely place name visible on screen as structured JSON. Generic phrases are filtered out; results are deduplicated.
- **Tagging prompt:** A separate GPT-4o-mini call assigns 1–3 tags strictly from the fixed `SPOT_TAGS` set. AI output is treated as assistive — spots are saved even if tagging fails.
- **Address inference:** Another GPT-4o-mini call infers a best-guess street address from the place name and city. Runs automatically when a place is saved without an address; failures are silently ignored.

### Data storage

An in-memory store implemented as module-level TypeScript `Map` objects keyed by collection ID and place ID inside the Express process. Collections and spots persist for the lifetime of the server process and reset on restart.

---

## Setup & Installation

### Prerequisites

- Node.js 18+
- npm 9+ (workspaces support)

### Install all dependencies

```bash
cd spotclip
npm install
```

---

## Environment Variables

Create `spotclip/.env`:

```env
# Required
OPENAI_API_KEY=sk-...

# Optional — seeds two demo collections (Seattle + Manhattan) on startup
SEED_DEMO_DATA=true
```

> The backend reads `.env` from the monorepo root (`spotclip/.env`).

---

## Running the Project

### Backend

```bash
# From repo root
npm run dev:api
```

The API starts on `http://0.0.0.0:3001`.

### Mobile app

```bash
# From repo root
npm run dev:mobile
```

Then press `i` for iOS simulator, `a` for Android, or scan the QR code with Expo Go.

> **Note:** The mobile app's API base URL (`apps/mobile/src/api.ts`) is currently hardcoded to a local IP. Update it to match your machine's LAN IP or `localhost` before running.

---

## How to Use the App

1. Start the backend (`npm run dev:api`).
2. Start the mobile app (`npm run dev:mobile`) and open it on a device or simulator.
3. Tap the **upload button** in the floating nav bar.
4. Select screenshots using the image picker, then tap **Extract Places** — or tap **Add Manually** to enter a place directly.
5. Review extracted place names — remove any that look wrong.
6. Choose **Save** → create a new collection or add to an existing one.
7. Navigate to the **Collections** tab to browse your spots.
8. In a collection, use the tag filter chips to narrow results. Tap a card to edit its note, toggle the heart (favorite) or checkmark (visited) icons.
9. Tap **Favorites** from the collections screen to see all starred places.
10. Switch to the **Map** tab to view all saved spots on a map. Tap **Near Me** to see spots close to your current location.

---

## Project Structure

```
spotclip/
├── .env                          # OPENAI_API_KEY + SEED_DEMO_DATA
├── package.json                  # npm workspaces root
├── tsconfig.base.json            # shared TS config
├── packages/
│   └── shared/
│       └── src/
│           └── index.ts          # shared types: Collection, ExtractedPlace, SPOT_TAGS, etc.
└── apps/
    ├── api/                      # Express backend
    │   └── src/
    │       ├── index.ts          # server entrypoint (port 3001)
    │       ├── app.ts            # Express app, all routes, in-memory store
    │       ├── vision.ts         # OpenAI Vision place extraction
    │       ├── tagging.ts        # OpenAI tag inference
    │       ├── addressing.ts     # OpenAI address inference
    │       ├── seedDemoData.ts   # optional demo collections seeder
    │       ├── mock.ts           # mock extraction data (offline fallback)
    │       └── __tests__/
    │           └── routes.test.ts
    └── mobile/                   # Expo React Native app
        ├── App.tsx               # navigation container + stack definition
        ├── src/
        │   ├── api.ts            # typed API client
        │   ├── tagColors.ts      # pastel color map for tags
        │   ├── ToastContext.tsx  # global toast notifications
        │   ├── PlaceCard.tsx     # shared place card component
        │   ├── navigation/
        │   │   └── types.ts      # RootStackParamList
        │   ├── screens/
        │   │   ├── TabsScreen.tsx
        │   │   ├── CollectionsScreen.tsx
        │   │   ├── MapScreen.tsx
        │   │   ├── UploadScreen.tsx
        │   │   ├── CollectionDetailScreen.tsx
        │   │   └── FavoritesDetailScreen.tsx
        │   ├── components/
        │   │   ├── FloatingNavBar.tsx
        │   │   ├── PlaceBottomSheet.tsx
        │   │   ├── NearMeBottomSheet.tsx
        │   │   ├── SplashOverlay.tsx
        │   │   ├── CreateCollectionModal.tsx
        │   │   ├── CollectionPickerModal.tsx
        │   │   ├── EditSpotModal.tsx
        │   │   └── NoteViewModal.tsx
        │   └── utils/
        │       ├── geocode.ts    # geocoding helpers
        │       └── nearbySpots.ts # distance calculation + nearby spot filtering
        └── assets/
```

