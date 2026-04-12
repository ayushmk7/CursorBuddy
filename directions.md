# CursorBuddy Setup Directions

This file is the step-by-step setup guide for everything in this repo that requires your intervention.

It covers:

- the real Larry runtime path in VS Code
- the OpenAI and OpenClaw pieces
- local Redis and bridge setup
- the marketing waitlist site
- Vercel + Neon deployment for the waitlist

The canonical product path for this repo is:

```text
Larry overlay in VS Code -> extension -> sidecar -> Go bridge -> OpenClaw service -> OpenAI Realtime Mini
```

Useful repo docs:

- [`ARCHITECTURE.md`](./ARCHITECTURE.md)
- [`todo.md`](./todo.md)
- [`docs/01_GENERAL_PRD.md`](./docs/01_GENERAL_PRD.md)
- [`docs/03_BACKEND_PRD.md`](./docs/03_BACKEND_PRD.md)
- [`docs/06_BACKEND_IMPLEMENTATION_STEPS.md`](./docs/06_BACKEND_IMPLEMENTATION_STEPS.md)
- [`landingpage/README.md`](./landingpage/README.md)

## 1. What you need to provide

These values need to come from you. They should not be invented in code and should not be committed to git.

### Required for the real Larry path

1. An [OpenAI API key](https://platform.openai.com/api-keys) with access to the [Realtime API](https://developers.openai.com/api/docs/guides/realtime).
2. An OpenClaw runtime to point the bridge at.
3. An OpenClaw service token.
4. A bridge JWT secret.
5. A JWT issuer value.
6. Local or deployed hostnames/ports for the bridge and OpenClaw service.

### Required for the waitlist deployment

1. A [Vercel account](https://vercel.com/signup).
2. A [Neon account](https://console.neon.tech/signup) or another Postgres provider.
3. A long random `WAITLIST_EXPORT_SECRET`.

## 2. Current repo reality

This repo already contains:

- a Go bridge in `packages/bridge`
- a VS Code extension in `packages/extension`
- a sidecar in `packages/sidecar`
- an OpenClaw pack in `packages/openclaw-pack`
- a marketing/waitlist site in `landingpage/`

This repo does **not** currently contain a runnable in-repo real OpenClaw service package. That means the real Larry path is still blocked until you either:

1. Provide an existing OpenClaw service endpoint and token, or
2. Build/add that OpenClaw service separately and then point the bridge at it

Until then, the extension can be launched against the mock path for UI/dev work, but that is not the real production path.

## 3. Install local prerequisites

### macOS tools

1. Install [Node.js 20+](https://nodejs.org/en/download).
2. Install [Go](https://go.dev/doc/install).
3. Install [Docker Desktop](https://www.docker.com/products/docker-desktop/) if you want the easiest Redis setup.
4. Install [VS Code](https://code.visualstudio.com/Download).
5. Install [Homebrew](https://brew.sh/) if you do not already have it.
6. Install SoX for microphone support:

```bash
brew install sox
```

The sidecar checks for `sox` at startup. Without it, microphone capture will not work.

### Optional local Redis without Docker

If you do not want Docker, you can install Redis directly:

- [Redis on macOS](https://redis.io/docs/latest/operate/oss_and_stack/install/archive/install-redis/install-redis-on-mac-os/)

## 4. Install repo dependencies

From the repo root:

```bash
npm install
```

This installs the workspace dependencies for the extension, sidecar, shared package, and related tooling.

## 5. Set up bridge environment variables

The bridge reads its local configuration from the repo-root `.env` file pattern shown in [`.env.example`](./.env.example).

Create a local `.env` in the repo root and fill in real values:

```bash
cp .env.example .env
```

Then update these values:

- `BRIDGE_LISTEN=127.0.0.1:8787`
- `BRIDGE_PUBLIC_HOST=127.0.0.1:8787`
- `OPENCLAW_UPSTREAM_URL=...`
- `OPENCLAW_SERVICE_TOKEN=...`
- `JWT_ISSUER=...`
- `JWT_SECRET=...`
- `REDIS_URL=redis://localhost:6379`

What each one means:

- `OPENCLAW_UPSTREAM_URL`: the real OpenClaw endpoint the bridge will proxy to
- `OPENCLAW_SERVICE_TOKEN`: the credential the bridge uses to authenticate to OpenClaw
- `JWT_SECRET`: the bridge signing secret for dev HS256 auth
- `JWT_ISSUER`: the issuer name embedded in bridge-issued tokens

Reference:

- [`docs/03_BACKEND_PRD.md`](./docs/03_BACKEND_PRD.md)
- [OpenAI quickstart](https://developers.openai.com/api/docs/quickstart)

## 6. Start Redis

### Option A: Docker Compose from this repo

From the repo root:

```bash
docker compose up -d redis
```

The repo already includes a Redis service in [`docker-compose.yml`](./docker-compose.yml).

### Option B: Local Redis service

If installed locally, start Redis however your machine is configured, then make sure `REDIS_URL` matches it.

## 7. Decide how you are handling OpenClaw

This is the biggest manual intervention point.

### Option A: You already have a real OpenClaw service

If you already have one, do this:

1. Get the service URL.
2. Get the service token.
3. Put them into your repo-root `.env` as:
   - `OPENCLAW_UPSTREAM_URL`
   - `OPENCLAW_SERVICE_TOKEN`
4. Make sure that OpenClaw itself has your `OPENAI_API_KEY` configured on the backend side.

### Option B: You do not yet have a real OpenClaw service

Right now, this repo gives you the contract and integration points, but not the full runnable service package. That means you need to do one of these before the real Larry path can work:

1. Build the OpenClaw service separately from the contract in [`packages/openclaw-pack`](./packages/openclaw-pack) and the backend docs.
2. Add a real `packages/openclaw` service to this repo and wire it to OpenAI Realtime.
3. Use the mock path temporarily only for development while the real service is being built.

Docs that define what OpenClaw must do:

- [`packages/openclaw-pack/SKILL.md`](./packages/openclaw-pack/SKILL.md)
- [`docs/03_BACKEND_PRD.md`](./docs/03_BACKEND_PRD.md)
- [`docs/06_BACKEND_IMPLEMENTATION_STEPS.md`](./docs/06_BACKEND_IMPLEMENTATION_STEPS.md)
- [OpenAI Realtime API guide](https://developers.openai.com/api/docs/guides/realtime)

## 8. Set up OpenAI for the real backend

This is your OpenAI checklist.

1. Sign in to the [OpenAI platform](https://platform.openai.com/).
2. Create a project/API key at [API keys](https://platform.openai.com/api-keys).
3. Review the [Quickstart](https://developers.openai.com/api/docs/quickstart).
4. Review the [Realtime API guide](https://developers.openai.com/api/docs/guides/realtime).
5. Put `OPENAI_API_KEY` into the environment for the real OpenClaw service, not the VS Code extension and not the sidecar.

Important repo rule:

- The extension should not hold your raw OpenAI key.
- The sidecar should not talk directly to OpenAI in production.
- OpenAI credentials belong on the backend/OpenClaw side.

## 9. Start the bridge

From the repo root:

```bash
go run ./packages/bridge/cmd/bridge
```

If your `.env` is not being loaded automatically by your shell, export the values first or use your preferred env loader.

The bridge will fail to start if required values are missing.

Useful code paths:

- `packages/bridge/cmd/bridge/main.go`
- `packages/bridge/internal/config/config.go`

## 10. Build the sidecar and extension

From the repo root:

```bash
npm run build --workspace=packages/shared
npm run build --workspace=packages/sidecar
npm run build --workspace=packages/extension
```

There is also a VS Code task for this in [`.vscode/tasks.json`](./.vscode/tasks.json).

## 11. Launch the VS Code extension

1. Open the repo in VS Code.
2. Open the Run and Debug panel.
3. Use the launch configs in [`.vscode/launch.json`](./.vscode/launch.json).

Important note:

- The provided launch configs are currently mock-oriented:
  - `Run Extension (mock OpenClaw)`
  - `Run Extension Only (mock already running)`

For the real path, you will need to run the bridge and point the extension/sidecar at the real OpenClaw-backed route instead of relying on `WAVECLICK_MOCK_OPENCLAW=1`.

## 12. Configure the extension inside VS Code

Inside the Extension Development Host:

1. Open Settings.
2. Search for `CursorBuddy`.
3. Review these settings in `packages/extension/package.json`:
   - `cursorbuddy.connectionMode`
   - `cursorbuddy.openclaw.baseUrl`
   - `cursorbuddy.openclaw.workflow`
   - `cursorbuddy.openclaw.auth`

Current repo caveat:

- The extension currently still exposes `direct` and `bridge` modes, but the session code is still wired around `openclaw.baseUrl`.
- For the real architecture, you should use the bridge-backed path and store the auth token in VS Code secure storage with the `CursorBuddy: Set Auth Token` command.

Commands available in the extension:

- `CursorBuddy: Start Session`
- `CursorBuddy: Stop Session`
- `CursorBuddy: Set Auth Token`

## 13. Real Larry smoke test

After Redis, OpenClaw, the bridge, the sidecar, and the extension are all ready:

1. Start Redis.
2. Start the real OpenClaw service with `OPENAI_API_KEY`.
3. Start the bridge.
4. Launch the extension in VS Code.
5. Run `CursorBuddy: Set Auth Token`.
6. Run `CursorBuddy: Start Session`.
7. Try a safe question such as "How do I commit?"
8. Verify Larry can connect, respond, and guide you without any direct extension-to-OpenAI shortcut.

If the real OpenClaw service is missing, this step will not work end to end yet.

## 14. Temporary mock-only dev path

If you want to work on the extension UI before the real OpenClaw service exists:

1. Open the repo in VS Code.
2. Run the launch config `Run Extension (mock OpenClaw)`.

That launch config runs the mock path defined in:

- [`.vscode/launch.json`](./.vscode/launch.json)
- [`.vscode/tasks.json`](./.vscode/tasks.json)
- [`docker-compose.yml`](./docker-compose.yml)

This is useful for local UI iteration, but it is not the real Larry architecture.

## 15. Run the marketing waitlist site locally

If you only want the landing page and waitlist locally, you do not need OpenAI, OpenClaw, or Redis.

From `landingpage/`:

```bash
python3 -m http.server 4173
```

Then open:

- [http://127.0.0.1:4173](http://127.0.0.1:4173)

On localhost, the waitlist form uses browser `localStorage`, so no database is required for local preview.

Reference:

- [`landingpage/README.md`](./landingpage/README.md)

## 16. Deploy the waitlist site to Vercel

This is the separate setup flow for the public waitlist site.

### Step 1: Create or import the Vercel project

1. Create/import a project in [Vercel](https://vercel.com/dashboard).
2. Set the project root directory to `landingpage/`.

Helpful docs:

- [Vercel project setup](https://vercel.com/docs)
- [Vercel environment variables](https://vercel.com/docs/environment-variables)

### Step 2: Create the database

1. Create a Neon project in [Neon Console](https://console.neon.tech/).
2. Follow the [Neon getting started docs](https://neon.com/docs/introduction).
3. Get a Postgres connection string.

Helpful docs:

- [Neon docs](https://neon.com/docs/introduction)
- [Connect to Neon](https://neon.com/docs/get-started/connect-neon)
- [Manage databases](https://neon.com/docs/manage/databases)

### Step 3: Add waitlist env vars in Vercel

Use [`landingpage/.env.example`](./landingpage/.env.example) as the template.

Add these in Vercel Project Settings -> Environment Variables:

- `POSTGRES_URL` or `DATABASE_URL`
- `WAITLIST_EXPORT_SECRET`

Do not commit those values.

### Step 4: Redeploy

After env vars are set, redeploy the project in Vercel.

### Step 5: Verify submissions

Once deployed:

1. Submit the form from the live site.
2. Confirm the `waitlist_signups` table is created automatically.
3. Test CSV export with your `WAITLIST_EXPORT_SECRET`.

The repo documents this flow here:

- [`landingpage/README.md`](./landingpage/README.md)

## 17. Quick checklist

Use this as the shortest possible setup summary.

### Real Larry path

1. Install Node, Go, VS Code, SoX, and Redis or Docker.
2. Run `npm install`.
3. Create repo-root `.env` from [`.env.example`](./.env.example).
4. Provide `OPENCLAW_UPSTREAM_URL`, `OPENCLAW_SERVICE_TOKEN`, `JWT_SECRET`, and `JWT_ISSUER`.
5. Configure `OPENAI_API_KEY` in the real OpenClaw backend.
6. Start Redis.
7. Start OpenClaw.
8. Start the bridge with `go run ./packages/bridge/cmd/bridge`.
9. Build shared, sidecar, and extension workspaces.
10. Launch the extension in VS Code.
11. Save the auth token with `CursorBuddy: Set Auth Token`.
12. Start a session and test a safe navigation flow.

### Waitlist site

1. Local only: run `python3 -m http.server 4173` from `landingpage/`.
2. Production: create a Vercel project rooted at `landingpage/`.
3. Add Neon/Postgres credentials.
4. Add `WAITLIST_EXPORT_SECRET`.
5. Redeploy and test form submissions.

## 18. Biggest blockers right now

If you want the real end-to-end Larry setup, these are the current blockers that require your intervention:

1. You must provide or build the real OpenClaw runtime.
2. You must provide the OpenAI API key for that backend.
3. You must choose and set the bridge/OpenClaw secrets.
4. You must decide whether you are only running locally or also deploying public infrastructure.

If you want, the next step can be a second doc that turns this into a copy-paste startup checklist with the exact commands you should run in order on your Mac.
