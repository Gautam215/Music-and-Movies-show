# Reelscape React App

This is the full-stack-ready Next.js source tree for the Movie & Entertainment Platform PRD.

## Stack

- Next.js App Router with TypeScript strict mode.
- Tailwind CSS with shadcn-compatible `components/ui` primitives.
- `lucide-react` for interface icons.
- Convex schema and transactional seat-hold functions under `convex/`.
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
