# CursorBuddy Landing Page

This folder contains the full public waitlist site and keeps every landing-page file self-contained here.

This site is marketing-only. The real product runs locally in VS Code, where Larry is the guide inside CursorBuddy.

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

Allowed `preferredApp` values: `vscode`, `jetbrains`, `imovie`, `video-editing`, `creative-suite`, `browser`, `terminal`, `all-apps`, `contribute`, `other`.

## Deploy on Vercel

1. Create a project named **`cursorbuddy`** (or link with `vercel link --project cursorbuddy`) with **root directory** = `landingpage/`.
2. In Vercel, add **Neon** (or another Postgres) from **Storage** / Marketplace so **`POSTGRES_URL`** (or `DATABASE_URL`) is set for Production (and Preview if you want test DB).  
   **Do not paste that URL into chat or commit it**—only store it in Vercel **Environment Variables** (or a local `.env` for `vercel dev`).
3. Set **`WAITLIST_EXPORT_SECRET`** to any long random string (e.g. `openssl rand -hex 32`). Without it, CSV export returns 503.
4. Redeploy. The first waitlist submission creates the `waitlist_signups` table if it does not exist.

Copy `.env.example` for local `vercel dev` if you wire a dev database.

### Download waitlist signups as CSV

After `POSTGRES_URL` / `DATABASE_URL` and `WAITLIST_EXPORT_SECRET` are set and the site is deployed:

1. Replace the placeholders below with your production host and the same secret you set in Vercel.

**Option A — Authorization header (preferred):**

```bash
curl -fsSL -H "Authorization: Bearer YOUR_WAITLIST_EXPORT_SECRET" \
  "https://YOUR_DOMAIN.vercel.app/api/export-waitlist" \
  -o cursorbuddy-waitlist.csv
```

**Option B — Query string (easier in a browser; avoid sharing the URL):**

```bash
curl -fsSL "https://YOUR_DOMAIN.vercel.app/api/export-waitlist?secret=YOUR_WAITLIST_EXPORT_SECRET" \
  -o cursorbuddy-waitlist.csv
```

The response is a CSV with columns: `email`, `name`, `preferred_app`, `source`, `created_at`.

**Local:** With `vercel dev` from `landingpage/`, use `http://localhost:3000/api/export-waitlist` (or the port Vercel prints) and the same auth as above.

## Before launch

- Privacy page contact uses the address shown there; update other pages (footer, terms) if you want the same email everywhere
- For Netlify-only hosting, set `waitlistMode: "netlify"` and keep Netlify Forms enabled
- Review the legal copy with counsel if you need jurisdiction-specific terms
