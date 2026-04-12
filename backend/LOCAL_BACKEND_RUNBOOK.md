# Local Backend Runbook

## Goal

Run the local Go backend stack for CursorBuddy using placeholder environment
values until real credentials are supplied.

## Services

- Bridge: `127.0.0.1:8787`
- OpenClaw service: `127.0.0.1:9090`
- Redis: `127.0.0.1:6379`

## Environment inputs

These values are tracked in:
- `.env.example`
- `toddocauseofenv.md`

Copy `.env.example` to `.env` before starting services.

## Startup steps

1. Copy `.env.example` to `.env`.
2. Leave all placeholder secrets unchanged until real values are available.
3. Start Redis if enabled.
4. Start `packages/openclaw-service`.
5. Start `packages/bridge`.
6. Verify `GET /healthz` on both services.
7. Open a websocket through the bridge and confirm proxying to OpenClaw.

## Example commands

```bash
docker compose up redis
go run ./packages/openclaw-service/cmd/openclaw
go run ./packages/bridge/cmd/bridge
curl http://127.0.0.1:9090/healthz
curl http://127.0.0.1:8787/v1/healthz
```

## Expected failure modes with placeholders

- `OPENAI_API_KEY=OPENAI_API_KEY_PLACEHOLDER`
  OpenClaw starts for local scaffolding, but real Realtime calls will fail.
- `OPENCLAW_SERVICE_TOKEN=CHANGE_ME_OPENCLAW_SERVICE_TOKEN`
  Bridge and OpenClaw can agree locally only if both use the same placeholder.
- `JWT_SECRET=CHANGE_ME_BRIDGE_JWT_SECRET_MIN_32_CHARS`
  Bridge token minting works locally, but tokens are not suitable for real use.
- Missing or incorrect bind hosts
  Session mint responses produce the wrong websocket URL.

## Verification targets

- Bridge health responds with version and upstream-configured state.
- OpenClaw health responds with version and realtime model.
- `POST /v1/sessions` returns a `ws://127.0.0.1:8787/v1/stream/{sessionId}` URL for local host usage.
