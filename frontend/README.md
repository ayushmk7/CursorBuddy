# Frontend

This folder is for the **local application frontend only**.

That means the UI that runs **on the user's device**:

- the **sidebar webview**
- the **cursor-adjacent companion / overlay**
- transcript, steps, confirmations, and local status UI
- theme-aware frontend assets that will eventually plug into the host app

This folder is **not** the marketing site and **not** the waitlist landing page. Leave `landingpage/` alone unless a task explicitly asks for marketing-site work.

## What lives here

- Local frontend guidance in [`agents/docs/README.md`](agents/docs/README.md)
- Contract pointers in [`agents/contracts/README.md`](agents/contracts/README.md)
- A runnable local UI prototype in [`index.html`](index.html)

## Scope boundary

Use this folder for:

- on-device UI
- host-theme-aware components
- local interaction states
- overlay and sidebar presentation

Do **not** use this folder for:

- landing-page copy or waitlist UX
- public marketing pages
- web growth funnels
- Next.js account/admin surfaces unless the product scope changes explicitly

## Local preview

From this folder:

```bash
python3 -m http.server 4174
```

Then open `http://127.0.0.1:4174`.
