# Reelscape React App

This is the full-stack-ready Next.js source tree for the Movie & Entertainment Platform PRD.

[![CI](https://github.com/Gautam215/Music-and-Movies-show/actions/workflows/ci.yml/badge.svg)](https://github.com/Gautam215/Music-and-Movies-show/actions/workflows/ci.yml)
[![Live Demo](https://img.shields.io/badge/Live%20Demo-music--and--movies--show.vercel.app-111827?style=for-the-badge&logo=vercel&logoColor=white)](https://music-and-movies-show.vercel.app/)

## Showcase

The live UI is available at [music-and-movies-show.vercel.app](https://music-and-movies-show.vercel.app/).
Run `npm run screenshots` against a production server on `localhost:3000` to refresh the desktop and mobile captures below.

### Home

![Black Hole hero on Home](screenshots/home-desktop.png)
Black Hole hero and featured screening on Home (desktop).

![Black Hole hero on Home on mobile](screenshots/home-mobile.png)
Black Hole hero and featured screening on Home (mobile).

### Songs

![Soundtrack player on Songs](screenshots/songs-desktop.png)
Spotify soundtrack player and recommendations on Songs (desktop).

![Soundtrack player on Songs on mobile](screenshots/songs-mobile.png)
Spotify soundtrack player and recommendations on Songs (mobile).

### Tickets

![Seat selection on Tickets](screenshots/tickets-desktop.png)
Showtime selection and interactive seat map on Tickets (desktop).

![Seat selection on Tickets on mobile](screenshots/tickets-mobile.png)
Showtime selection and interactive seat map on Tickets (mobile).

### Profile

![Profile experience on Profile](screenshots/profile-desktop.png)
Personal signal and saved content on Profile (desktop).

![Profile experience on Profile on mobile](screenshots/profile-mobile.png)
Personal signal and saved content on Profile (mobile).

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

## Screenshots

The screenshot script covers Home, Songs, Tickets, and Profile at 1440px desktop and 375px mobile widths.
Install Chromium once before running it locally:

```bash
npx playwright install chromium
npm run build
npm run start
npm run screenshots
```

Set `BASE_URL` to capture another running deployment, for example `BASE_URL=https://music-and-movies-show.vercel.app npm run screenshots`.

## Why `components/ui`

The Works Wheel imports the shared `cn` helper through `@/lib/utils`, and `components/ui` is the conventional shadcn location for portable primitives. Keeping it there makes future `shadcn add` commands and generated imports work without path changes.

## Backend Boundary

The UI currently uses deterministic in-memory state for review. `convex/schema.ts` and `convex/bookings.ts` define the first production seam: authenticated seat holds, expiry, movies, shows, songs, reviews, and orders. Connect `NEXT_PUBLIC_CONVEX_URL`, then replace the local state mutations with Convex hooks. Payment should remain provider-hosted, with signed webhooks and idempotency before launch.

## Verification

Run the complete local verification pipeline after installing dependencies:

```bash
npm ci
npm run format:check
npm run typecheck
npm run lint
npm test
npm run build
npm run test:api
npm run audit
```

`npm run test:api` starts the production build on an isolated local port and checks public pages, rate-limit headers, authentication boundaries, Spotify error responses, and cross-origin request rejection. It should run after `npm run build`.

The unit tests use Node's built-in test runner and cover same-origin validation, transient upstream retries, safe versus unsafe retry behavior, and fallback rate-limit headers.

## CI/CD

`.github/workflows/ci.yml` runs formatting, type-checking, lint, dependency audit, unit tests, the production build, API regression checks, and UI screenshot capture for pushes to `main` and pull requests. The Vercel preview job runs after those checks for same-repository pull requests. The production job runs only after every check is green on a push to `main` and uses the Vercel CLI explicitly, so deployment failures fail the workflow.

The deployment jobs require these GitHub Actions secrets under **Settings → Secrets and variables → Actions**:

- `VERCEL_TOKEN`: a Vercel access token with deployment permission.
- `VERCEL_ORG_ID`: the Vercel team or account ID that owns the project.

The workflow links the `music-and-movies-show` Vercel project by name, so a project ID secret is not required. Never commit these values or put them in `.env` files. Pull requests from forks intentionally skip the preview deployment because GitHub does not expose repository secrets to untrusted fork workflows.

## Stack Inventory

- Languages: TypeScript, TSX, JavaScript, ECMAScript modules, CSS, HTML, JSON, YAML, Markdown.
- Frontend: Next.js 16 App Router, React 19, Tailwind CSS 3, Lucide React, shadcn-compatible UI utilities, CSS animations, Spotify Web Playback SDK integration.
- Backend: Next.js Route Handlers and middleware proxy, Node.js 22 runtime, MongoDB Node driver, Convex schema/mutations, scrypt password hashing, opaque httpOnly cookie sessions.
- External services: TMDB, OMDb, Spotify Web API, Spotify OAuth/PKCE, and optional Upstash-compatible Redis rate limiting.
- Tooling: npm lockfile, TypeScript compiler, ESLint 9 with `eslint-config-next`, Prettier 3, Node test runner, Next.js production server, GitHub Actions, Dependabot.
- Deployment boundary: the app is a standard Next.js deployment; environment variables in `.env.example` are server configuration and must be supplied by the deployment platform.

## API Rate Limiting

Every `/api/*` request passes through `proxy.ts`. The proxy uses one atomic Redis Lua `EVAL` script to increment a per-client fixed-window counter and set its expiry without race conditions. It works with any Upstash-compatible Redis REST endpoint.

Configure `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` in the deployment environment. The defaults allow 120 requests per client per 60 seconds; override them with `RATE_LIMIT_MAX_REQUESTS` and `RATE_LIMIT_WINDOW_MS`. Set `RATE_LIMIT_FAIL_CLOSED=true` when Redis outages must reject API traffic with `503` instead of temporarily allowing it.

## Authentication

Set `MONGODB_URI` and optionally `MONGODB_DB_NAME` before using `/register`. The form creates users in the `users` collection and stores only scrypt password hashes. Login sessions are opaque, httpOnly cookies backed by the `sessions` collection. The Google button stays disabled until a Google OAuth provider is configured.

Browser API calls use `lib/client-fetch.ts`, which retries transient failures and `429` responses with exponential backoff, jitter, and the server's `Retry-After` value when present.

## Spotify Token Management

Spotify user tokens remain in `httpOnly` cookies. Server routes share one token manager that refreshes an expired access token once per request, persists rotated refresh tokens, caches client-credentials tokens in memory, spaces upstream requests, coordinates concurrent refreshes, and retries transient Spotify responses with exponential backoff while honoring `Retry-After`. The browser throttles session and playlist refreshes, and `429` responses are returned with their retry window so the UI does not immediately hammer Spotify again.
