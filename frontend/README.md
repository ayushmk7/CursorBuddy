# Frontend

This folder is for the **local application frontend only**.

That means the UI that runs **on the user's device**:

- **Larry** as the primary local guide surface
- minimal support UI for transcript, logs, settings, and failure states
- local status and confirmation UI
- theme-aware frontend assets that will eventually plug into the host app

This folder is **not** the marketing site and **not** the waitlist landing page. Leave `landingpage/` alone unless a task explicitly asks for marketing-site work.

## What lives here

- Local frontend guidance in [`agents/docs/README.md`](agents/docs/README.md)
- Contract pointers in [`agents/contracts/README.md`](agents/contracts/README.md)
- A runnable local UI prototype in [`index.html`](index.html)

If we want to move fast and get the vibe right before the real extension path is complete, a simple local web preview is a good move. That preview should exist only to show how Larry should look and feel at a local URL, not to redefine the real architecture.

## Scope boundary

Use this folder for:

- on-device UI
- host-theme-aware components
- local interaction states
- Larry presentation and support UI

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
