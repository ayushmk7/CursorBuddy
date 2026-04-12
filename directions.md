# CursorBuddy Setup Directions

This guide is the canonical real-runtime setup path for this repo.

```text
Larry overlay in VS Code -> extension -> sidecar -> Go bridge -> OpenClaw service -> OpenAI Realtime
```

## 1. Required inputs

Provide these external values and keep them out of git:

1. `OPENAI_API_KEY` (Realtime-capable key) for the OpenClaw backend runtime.
2. `OPENCLAW_SERVICE_TOKEN` shared between bridge and OpenClaw.
3. `JWT_SECRET` and `JWT_ISSUER` for bridge auth.
4. local or deployed hostnames for bridge and OpenClaw.

## 2. Install prerequisites

1. Node.js 20+
2. Go
3. Docker Desktop (or local Redis install)
4. VS Code
5. SoX (`brew install sox`)

## 3. Install dependencies

From repo root:

```bash
npm install
```

## 4. Configure env

```bash
cp .env.example .env
```

Set required fields in `.env`:

- Bridge:
  - `BRIDGE_LISTEN=127.0.0.1:8787`
  - `BRIDGE_PUBLIC_HOST=127.0.0.1:8787`
  - `OPENCLAW_UPSTREAM_URL=ws://127.0.0.1:9090`
  - `OPENCLAW_SERVICE_TOKEN=...`
  - `JWT_ISSUER=...`
  - `JWT_SECRET=...`
  - `REDIS_URL=redis://localhost:6379`
- OpenClaw:
  - `OPENCLAW_LISTEN_PORT=9090`
  - `OPENAI_API_KEY=sk-...`
  - `OPENAI_REALTIME_MODEL=gpt-realtime`
  - `OPENCLAW_DEFAULT_VOICE=marin`

Important:
- `OPENAI_API_KEY` belongs only in backend/OpenClaw runtime.
- Extension and sidecar must not hold raw OpenAI keys.

## 5. Start Redis

```bash
docker compose up -d redis
```

## 6. Start OpenClaw runtime

```bash
npm run build --workspace=packages/openclaw
node packages/openclaw/dist/index.js
```

Expected log:

```text
[openclaw] listening on ws://localhost:9090
```

## 7. Start bridge

```bash
go run ./packages/bridge/cmd/bridge
```

Or use VS Code task `start-bridge`.

## 8. Build sidecar and extension

```bash
npm run build --workspace=packages/shared
npm run build --workspace=packages/sidecar
npm run build --workspace=packages/extension
```

## 9. Run extension

Use `.vscode/launch.json` config:

- `Run Extension (real OpenClaw)` or
- `Run Extension Only (real backend already running)`

`Run Extension (real OpenClaw)` now uses `build-start-real-stack`, which starts OpenClaw and bridge before launching the extension host.

In VS Code settings:

- `cursorbuddy.connectionMode=bridge`
- `cursorbuddy.bridge.baseUrl=http://127.0.0.1:8787`
- `cursorbuddy.openclaw.workflow=cursorbuddy_session`

Store user auth using:

- `CursorBuddy: Set Auth Token`

## 10. Real-path smoke test

1. Start session in extension.
2. Hold push-to-talk and ask a safe navigation request.
3. Verify sidecar receives envelope events and executes aliases through the executor.
4. Verify OpenClaw requests `vscode_probe_state` when needed and receives tool results.

If any service is down (OpenClaw, bridge, Redis), no session should silently fall back to a mock runtime.
