# Reelscape React App

This is the full-stack-ready Next.js source tree for the Movie & Entertainment Platform PRD.

## Stack

- Next.js App Router with TypeScript strict mode.
- Tailwind CSS with shadcn-compatible `components/ui` primitives.
- `lucide-react` for interface icons.
- Convex schema and transactional seat-hold functions under `convex/`.
- MongoDB-backed email/password authentication under `app/api/auth/`.
- Two-week TMDB featured screening plus a separate daily Current Reel across movies, TV, and anime with regional guest fallback and logged-in viewing-history personalization.
- Works Wheel from 21st.dev at `components/ui/works-wheel.tsx`.
- Black Hole visual system at `components/ui/black-hole-hero-section.tsx`, used as the global hero language.

## Run

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Why `components/ui`

The Works Wheel imports the shared `cn` helper through `@/lib/utils`, and `components/ui` is the conventional shadcn location for portable primitives. Keeping it there makes future `shadcn add` commands and generated imports work without path changes.

## Backend Boundary

The UI currently uses deterministic in-memory state for review. `convex/schema.ts` and `convex/bookings.ts` define the first production seam: authenticated seat holds, expiry, movies, shows, songs, reviews, and orders. Connect `NEXT_PUBLIC_CONVEX_URL`, then replace the local state mutations with Convex hooks. Payment should remain provider-hosted, with signed webhooks and idempotency before launch.

## Verification

The project was checked with:

```bash
npx tsc --noEmit
npm run build
```

Both completed successfully in the build environment.

## API Rate Limiting

Every `/api/*` request passes through `proxy.ts`. The proxy uses one atomic Redis Lua `EVAL` script to increment a per-client fixed-window counter and set its expiry without race conditions. It works with any Upstash-compatible Redis REST endpoint.

Configure `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` in the deployment environment. The defaults allow 120 requests per client per 60 seconds; override them with `RATE_LIMIT_MAX_REQUESTS` and `RATE_LIMIT_WINDOW_MS`. Set `RATE_LIMIT_FAIL_CLOSED=true` when Redis outages must reject API traffic with `503` instead of temporarily allowing it.

## Authentication

Set `MONGODB_URI` and optionally `MONGODB_DB_NAME` before using `/register`. The form creates users in the `users` collection and stores only scrypt password hashes. Login sessions are opaque, httpOnly cookies backed by the `sessions` collection. The Google button stays disabled until a Google OAuth provider is configured.

Browser API calls use `lib/client-fetch.ts`, which retries transient failures and `429` responses with exponential backoff, jitter, and the server's `Retry-After` value when present.

## Spotify Token Management

Spotify user tokens remain in `httpOnly` cookies. Server routes share one token manager that refreshes an expired access token once per request, persists rotated refresh tokens, caches client-credentials tokens in memory, spaces upstream requests, coordinates concurrent refreshes, and retries transient Spotify responses with exponential backoff while honoring `Retry-After`. The browser throttles session and playlist refreshes, and `429` responses are returned with their retry window so the UI does not immediately hammer Spotify again.
