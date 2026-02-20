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

## Getting started

```bash
# Install all dependencies
npm install

# Start the API (http://localhost:3001)
npm run dev:api

# In a second terminal, start the mobile app
npm run dev:mobile
```

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

Returns mock extracted places (real extraction not yet implemented).

### POST /collections/:id/places

JSON body: `{ name: string, places: ExtractedPlace[] }`

## Testing

```bash
npm run test
```

Runs vitest tests for the API routes (7 tests covering validation, ingest, and collections).

## Mobile app flow

1. Enter a TikTok URL
2. Pick images or a video file
3. Tap "Extract Places" to upload and get mock results
4. Edit or delete extracted places
5. Name and save the collection
