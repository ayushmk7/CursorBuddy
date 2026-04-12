# Todo Cause Of Env

This file lists every backend item that still depends on environment input.
All values below must stay placeholders until the user supplies real values.
Everything remains local by default.

## Bridge
- `BRIDGE_LISTEN=127.0.0.1:8787`
- `BRIDGE_PUBLIC_HOST=127.0.0.1:8787`
- `JWT_ISSUER=cursorbuddy-bridge`
- `JWT_SECRET=CHANGE_ME_BRIDGE_JWT_SECRET_MIN_32_CHARS`
- `REDIS_URL=redis://127.0.0.1:6379`
- `MAX_SESSION_MINUTES=30`

## OpenClaw Service
- `OPENCLAW_LISTEN=127.0.0.1:9090`
- `OPENCLAW_PUBLIC_HOST=127.0.0.1:9090`
- `OPENCLAW_SERVICE_TOKEN=CHANGE_ME_OPENCLAW_SERVICE_TOKEN`
- `OPENAI_API_KEY=OPENAI_API_KEY_PLACEHOLDER`
- `OPENAI_REALTIME_MODEL=gpt-realtime`
- `OPENCLAW_DEFAULT_VOICE=alloy`
- `OPENCLAW_SESSION_TIMEOUT_MINUTES=30`

## Optional Local Support
- `LOG_LEVEL=info`
- `BRIDGE_VERSION=dev`
- `OPENCLAW_VERSION=dev`

## What breaks if missing
- Missing `OPENAI_API_KEY`: OpenClaw cannot create realtime sessions.
- Missing `OPENCLAW_SERVICE_TOKEN`: bridge cannot authenticate upstream.
- Missing `JWT_SECRET`: bridge cannot mint or validate session tokens.
- Missing bind/public hosts: local websocket URLs are wrong.
