# CursorBuddy Landing Page

This folder contains the full public waitlist site and keeps every landing-page file self-contained here.

## What is included

- Static marketing site with homepage, waitlist flow (modal), legal pages, and `404.html`
- **Vercel serverless API** (`/api/waitlist`, `/api/export-waitlist`) backed by **Postgres** (Neon via Vercel is the expected path)
- Shared assets in `assets/`
- Netlify and Vercel deployment config
- CSP-safe no-build frontend
- Playwright smoke checks

## Local preview

From this folder:

```bash
python3 -m http.server 4173
```

Then open `http://127.0.0.1:4173`. On localhost the waitlist form uses **browser `localStorage`** (no API) so you can iterate without a database.

## Smoke tests

From this folder:

```bash
npm install
npm run test:smoke
```

Playwright starts the same static server automatically (see `playwright.config.js`).

## Waitlist submission modes

Configured in `assets/config.js` and `assets/site.js`:

| Host | Behavior |
|------|-----------|
| `localhost` / `127.0.0.1` | **Mock**: saves to `localStorage` |
| Production (e.g. Vercel) | **API**: `POST /api/waitlist` with JSON (`email`, `name`, `preferredApp`, …) |
| Netlify | Set `waitlistMode: "netlify"` in `config.js` so the form posts like a Netlify Form |

Example JSON payload to `/api/waitlist`:

```json
{
  "email": "you@company.com",
  "name": "Ada Lovelace",
  "preferredApp": "vscode",
  "source": "cursorbuddy-landingpage",
  "submittedAt": "2026-04-08T00:00:00.000Z"
}
```

Allowed `preferredApp` values: `vscode`, `jetbrains`, `imovie`, `video-editing`, `creative-suite`, `browser`, `terminal`, `all-apps`, `other`.

## Deploy on Vercel

1. Create a project named **`cursorbuddy`** (or link with `vercel link --project cursorbuddy`) with **root directory** = `landingpage/`.
2. In Vercel, add **Neon** (or another Postgres) from **Storage** / Marketplace so **`POSTGRES_URL`** (or `DATABASE_URL`) is set for Production (and Preview if you want test DB).
3. Optional: set **`WAITLIST_EXPORT_SECRET`** to download signups as CSV:
   - `GET /api/export-waitlist` with header `Authorization: Bearer <WAITLIST_EXPORT_SECRET>`
   - or `GET /api/export-waitlist?secret=<WAITLIST_EXPORT_SECRET>`
4. Redeploy. The first waitlist submission creates the `waitlist_signups` table if it does not exist.

Copy `.env.example` for local `vercel dev` if you wire a dev database.

## Before launch

- Replace `hello@cursorbuddy.dev` with the production contact address
- For Netlify-only hosting, set `waitlistMode: "netlify"` and keep Netlify Forms enabled
- Review the legal copy with counsel if you need jurisdiction-specific terms
