# SpotClip

Extract places from TikTok clips and save them to collections.

## Monorepo structure

```
spotclip/
├── apps/
│   ├── api/        # Express + TypeScript API (port 3001)
│   └── mobile/     # Expo React Native (TypeScript)
├── packages/
│   └── shared/     # Shared TypeScript types
└── package.json    # npm workspaces root
```

## Prerequisites

- Node.js >= 18
- npm >= 8
- Expo CLI (`npx expo`)
- iOS Simulator or Android Emulator (or Expo Go on a physical device)

## Environment variables

| Variable         | Required | Description                          |
| ---------------- | -------- | ------------------------------------ |
| `OPENAI_API_KEY` | Yes      | OpenAI API key for image extraction  |
| `PORT`           | No       | API port (default: 3001)             |
| `SEED_DEMO_DATA` | No       | Set to `true` to seed demo collections on startup (default: false). Dev/demo only. |

Create a `.env` file in the repo root or export the variable:

```bash
export OPENAI_API_KEY=sk-
```

## Getting started

```bash
# Install all dependencies
npm install

# Start the API (http://localhost:3001)
OPENAI_API_KEY=sk-... npm run dev:api

# In a second terminal, start the mobile app
npm run dev:mobile
```

The mobile app uses `expo-crypto` for UUID generation (RN-safe); it is installed with `npm install` from the repo root.

## Available scripts

| Command            | Description                          |
| ------------------ | ------------------------------------ |
| `npm run dev:api`  | Start API dev server with hot reload |
| `npm run dev:mobile` | Start Expo dev server              |
| `npm run build`    | Build all workspaces                 |
| `npm run lint`     | Lint all workspaces                  |
| `npm run test`     | Run tests across all workspaces      |

## API routes

| Method | Route                      | Description                    |
| ------ | -------------------------- | ------------------------------ |
| POST   | `/clips/ingest`            | Upload media + TikTok URL      |
| POST   | `/collections/:id/places`  | Save places to a collection    |
| GET    | `/collections/:id`         | Retrieve a collection          |
| GET    | `/health`                  | Health check                   |

### POST /clips/ingest

Multipart form with:
- `tiktok_url` (string) - the TikTok video URL
- `media` (file[]) - one or more video/image files

Extraction behavior depends on upload type:
- **Images** — real extraction via OpenAI Vision (gpt-4o-mini). Returns actual place names found in the images.
- **Video** — returns mock extracted places (real video extraction not yet implemented).

If the OpenAI call fails, the endpoint still returns 200 with an empty places array and an `error` field.

### POST /collections/:id/places

JSON body: `{ name: string, places: ExtractedPlace[] }`

## Demo mode

When developing or demoing the app, you can pre-fill the API with demo collections so the app is not empty on launch.

- **Enable:** set `SEED_DEMO_DATA=true` when starting the API (e.g. `SEED_DEMO_DATA=true npm run dev:api` or add to `.env`).
- **What gets created:** Two collections are added only if they do not already exist (idempotent):
  - **Seattle** — 4 spots (e.g. Pike Place Market, Space Needle, Museum of Pop Culture, Starbucks Reserve Roastery) with a mix of tags, notes, favorites, and visited states.
  - **Manhattan** — 5 spots (e.g. Central Park, Empire State Building, Times Square, The High Line, Katz's Delicatessen) with the same variety for demoing the UI.
- **Reset:** The API uses an in-memory store. Restarting the API clears all data. With `SEED_DEMO_DATA=true`, the demo collections are re-seeded on each restart. If you do not set the flag, the API starts with no collections (current behavior).
- **Safety:** Seeding runs only when `SEED_DEMO_DATA=true`; if the flag is unset or false, no seeding runs and behavior is unchanged.

## Testing

```bash
npm run test
```

Runs vitest tests for the API routes (7 tests covering validation, ingest, and collections).

## Mobile app flow

1. Enter a TikTok URL
2. Pick images or a video file
3. Tap "Extract Places" to upload (images → real extraction, video → mock)
4. Edit or delete extracted places
5. Name and save the collection
