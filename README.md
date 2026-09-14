# BD Map Quiz

An interactive Bangladesh district map quiz. A district is highlighted on the map, and you pick the correct name from multiple-choice options.

**Live:** [bd-map-quiz.vercel.app](https://bd-map-quiz.vercel.app)

## Features

- Interactive SVG map of Bangladesh districts
- Three quiz modes (Classic, Rapid Quiz, Today Challenge)
- Score, streak, XP, and level progression (saved in `localStorage`)
- Achievements (First Win, On Fire, Perfect Classic, Daily Challenger, and more)
- Full-map view page
- Keyboard shortcuts `1`–`4` for options
- Google Analytics 4 + Vercel Analytics

## Quiz modes

| Mode | Route | Rules |
|------|--------|--------|
| **Classic** | `/quiz/classic` | 10 random questions, 30s each |
| **Rapid Quiz** | `/quiz/rapid-quiz` | Answer as many as you can in 60 seconds |
| **Today Challenge** | `/quiz/today-challenge` | Same 10 questions for everyone that day (date-seeded); +50 XP on first perfect 10/10 |

Home (`/`) opens the mode menu. Progress (XP, achievements, daily completion) is stored locally in the browser.

## Tech stack

- [Next.js](https://nextjs.org) (App Router) + React + TypeScript
- [Tailwind CSS](https://tailwindcss.com)
- [react-toastify](https://fkhadra.github.io/react-toastify/) for feedback toasts
- [@vercel/analytics](https://vercel.com/docs/analytics) and optional GA4

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

```bash
npm run build   # production build
npm run start   # run production server
npm run lint    # ESLint
```

## Environment variables

Copy `.env.example` to `.env.local` and set:

```env
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
```

Leave it unset to skip Google Analytics locally. On Vercel, add the same key under Project → Settings → Environment Variables, then redeploy (required for `NEXT_PUBLIC_*` vars).

## Project structure

```
app/
  page.tsx                 # Home / mode menu
  layout.tsx               # Root layout, fonts, analytics
  components/
    GuessTheDistrictGame.tsx   # Main quiz UI & game loop
    GoogleAnalytics.tsx
    FullMapViewer.tsx
  lib/
    game-progress.ts       # XP, achievements, daily seed, scoring
  data/
    bd-districts.ts        # District + division data (Bengali labels)
    bd-svg-paths/          # Map path data
  quiz/
    classic/
    rapid-quiz/
    today-challenge/
  view-map/                # Static full map view
```

## Notes

- District and division names in the quiz UI are in **Bengali**; chrome/UI copy is in English.
- Map boundaries are for education only and may differ from official sources.
- Daily Challenge questions are deterministic per calendar day (local timezone via `todayKey()`).

## Deploy

Deploy on [Vercel](https://vercel.com). Set `NEXT_PUBLIC_GA_MEASUREMENT_ID` if you use GA4, then redeploy after changing env vars.
