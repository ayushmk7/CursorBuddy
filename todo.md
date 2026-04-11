# CursorBuddy — Getting It Running

Three modes, ordered from easiest to hardest.

---

## Mode A: Mock mode (no real OpenClaw) — works right now

Everything is already wired. This is what you want tonight.

### Prerequisites

```bash
# Node.js 20+
node --version   # must be >= 20

# sox (microphone input)
brew install sox

# Confirm
sox --version
```

### Steps

**1. Install all dependencies (run once from repo root)**
```bash
npm install
```

**2. Press F5 in VS Code**

Select `Run Extension (mock OpenClaw)` from the debug dropdown.

This automatically:
- Builds `shared`, `sidecar`, `extension`, and `mock-openclaw`
- Starts the mock OpenClaw server on `ws://localhost:9090`
- Launches a new VS Code Extension Development Host window with `WAVECLICK_MOCK_OPENCLAW=1`

**3. In the Extension Development Host window:**
- Click the CursorBuddy icon in the activity bar (left sidebar)
- Run command: `CursorBuddy: Start Session`
- The sidebar shows "live" and you get a greeting message
- Hold the Push-to-Talk button and speak
- Release — the mock returns a canned response (opens Source Control panel)

### What mock mode does
The mock OpenClaw (`packages/mock-openclaw/`) is a real WebSocket server on port 9090. On `session_start` it sends a greeting envelope. On `audio_end` (released PTT) it sends a canned envelope that opens the SCM panel. No AI, no network calls — fully offline.

### If the mock is already running
Use `Run Extension Only (mock already running)` instead. It skips starting the mock and just builds + launches.

---

## Mode B: Real OpenClaw — direct connection

Use this when you have an actual OpenClaw WebSocket backend.

### Steps

**1. Set the auth token (stored securely in VS Code SecretStorage)**

Open command palette → `CursorBuddy: Set Auth Token` → paste your token.

Or for quick dev, add it to VS Code settings (NOT for production):
```json
// .vscode/settings.json
{
  "cursorbuddy.openclaw.auth": "your-token-here"
}
```

**2. Set the backend URL if it's not localhost:9090**

```json
// .vscode/settings.json
{
  "cursorbuddy.openclaw.baseUrl": "ws://your-openclaw-host:9090",
  "cursorbuddy.openclaw.workflow": "cursorbuddy_session"
}
```

**3. Create a real-mode launch config (remove the mock env var)**

Add this to `.vscode/launch.json` under `configurations`:
```json
{
  "name": "Run Extension (real OpenClaw)",
  "type": "extensionHost",
  "request": "launch",
  "args": ["--extensionDevelopmentPath=${workspaceFolder}/packages/extension"],
  "outFiles": ["${workspaceFolder}/packages/extension/dist/**/*.js"],
  "preLaunchTask": "build-all",
  "sourceMaps": true
}
```
Note: no `WAVECLICK_MOCK_OPENCLAW` env var — that's intentional.

**4. Press F5 with the new config selected, then `CursorBuddy: Start Session`**

---

## Mode C: Bridge mode (needs code + infra work)

> Not functional yet. The `cursorbuddy.connectionMode` setting exists but
> `SessionManager` ignores it and always connects direct. Code fix needed before
> any of the env vars below matter.

### Code fix needed first

`packages/extension/src/sessionManager.ts` — when `connectionMode === 'bridge'`,
it needs to:
1. Call the bridge HTTP API to exchange the OpenClaw auth token for a short-lived
   bridge JWT
2. Pass that JWT in `session.start` → `bridgeJwt` field (the type already has it)
3. Use the bridge WebSocket URL instead of the raw OpenClaw URL

### Bridge server env vars

The Go binary at `packages/bridge/` reads these at startup — all are required
unless marked optional:

| Variable | Required | Description | Example |
|---|---|---|---|
| `OPENCLAW_UPSTREAM_URL` | Yes | WebSocket URL of real OpenClaw | `wss://openclaw.example.com` |
| `OPENCLAW_SERVICE_TOKEN` | Yes | Service-to-service token the bridge uses to authenticate with OpenClaw | get from OpenClaw admin |
| `JWT_ISSUER` | Yes | String embedded in JWTs the bridge issues to clients | `cursorbuddy-bridge` |
| `JWT_SECRET` | Yes | HS256 secret for signing/verifying those JWTs | any long random string |
| `BRIDGE_LISTEN` | No | Host:port the bridge HTTP server binds to | `127.0.0.1:8787` (default) |
| `BRIDGE_PUBLIC_HOST` | No | Public host used in WSS URL construction | defaults to `BRIDGE_LISTEN` |
| `REDIS_URL` | No | Redis for rate limiting | `redis://localhost:6379` (default) |
| `MAX_SESSION_MINUTES` | No | Session TTL in minutes | `30` (default) |
| `LOG_LEVEL` | No | `info` or `debug` | `info` (default) |

### Build and run the bridge

```bash
cd packages/bridge
go build -o bridge ./cmd/bridge
./bridge
```

Or with env vars inline:
```bash
OPENCLAW_UPSTREAM_URL=wss://openclaw.example.com \
OPENCLAW_SERVICE_TOKEN=svc-token-here \
JWT_ISSUER=cursorbuddy-bridge \
JWT_SECRET=your-long-random-secret \
./bridge
```

### Redis (required by bridge)
```bash
brew install redis
brew services start redis
```

---

## Checklist for tonight (mock mode)

- [ ] `node --version` shows 20+
- [ ] `brew install sox` done, `sox --version` works
- [ ] `npm install` run from repo root
- [ ] F5 → `Run Extension (mock OpenClaw)` → Extension Development Host opens
- [ ] CursorBuddy sidebar appears in activity bar
- [ ] `CursorBuddy: Start Session` → sidebar shows "live"
- [ ] Greeting message appears in sidebar
- [ ] Hold PTT → release → Source Control panel opens (canned response)
- [ ] Check `CursorBuddy` output channel for any errors

## Checklist for real OpenClaw (when you have the backend)

- [ ] Auth token set via `CursorBuddy: Set Auth Token`
- [ ] `cursorbuddy.openclaw.baseUrl` points to your backend
- [ ] No `WAVECLICK_MOCK_OPENCLAW=1` in your launch config
- [ ] Session starts and you get real AI responses

## Checklist for bridge mode (future)

- [ ] Fix `sessionManager.ts` to branch on `connectionMode === 'bridge'`
- [ ] Set all required bridge env vars
- [ ] Redis running
- [ ] Bridge binary built and running
- [ ] Set `cursorbuddy.connectionMode` to `bridge` in settings
