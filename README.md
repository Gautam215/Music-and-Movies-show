# 🎬 Reelscape

Movie, music and ticket-booking platform with an interactive 3D seat theater.

[

![CI](https://github.com/Gautam215/Music-and-Movies-show/actions/workflows/ci.yml/badge.svg)

](https://github.com/Gautam215/Music-and-Movies-show/actions/workflows/ci.yml)
[

![Live Demo](https://img.shields.io/badge/Live%20Demo-Vercel-111827?style=for-the-badge&logo=vercel&logoColor=white)

](https://music-and-movies-show.vercel.app/)

**Live demo:** https://music-and-movies-show.vercel.app/

## Features

- **Home:** Black Hole hero, a two-week featured screening, and a daily "Current Reel" across movies, TV and anime, personalized by viewing history
- **Songs:** Spotify soundtrack player with recommendations
- **Tickets:** showtime selection, interactive 2D seat map, booking codes
- **3D Theater:** Three.js cinema seat view with seat-POV camera and trailer on screen (signed-in users, 2D fallback if WebGL is unavailable)
- **Auth:** email/password sign-up with scrypt hashing and httpOnly cookie sessions
- **Security:** API rate limiting (Redis), same-origin checks, retry with backoff

## Screenshots

| Home | Songs |
|---|---|
| 

![Home](screenshots/home-desktop.png)

 | 

![Songs](screenshots/songs-desktop.png)

 |
| **Tickets** | **Profile** |
| 

![Tickets](screenshots/tickets-desktop.png)

 | 

![Profile](screenshots/profile-desktop.png)

 |

## Tech Stack

**Frontend:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS, Three.js
**Backend:** Next.js Route Handlers, Node.js 22, MongoDB (auth and seat claims)
**Integrations:** TMDB, Spotify Web API (OAuth/PKCE), OMDb, Upstash Redis
**DevOps:** GitHub Actions CI/CD, Vercel, Dependabot

## Quick Start

```bash
git clone https://github.com/Gautam215/Music-and-Movies-show.git
cd Music-and-Movies-show
npm install
cp .env.example .env.local   # add your keys
npm run dev
