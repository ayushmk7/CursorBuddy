# CursorBuddy Backend — Bridge + OpenClaw Pack + Shared Contracts Design

**Date:** 2026-04-09  
**Scope:** Server-side vertical slice (Phase 0 / 0.5 / 1 / 7 from `docs/06_BACKEND_IMPLEMENTATION_STEPS.md`)  
**Language:** Go for bridge, TypeScript/Zod for shared contracts  

---

## 1. Architecture Decision

**Mode A selected:** `Sidecar → TLS → OpenClaw` direct is the low-latency default. The Go bridge is the optional enterprise tier deployed alongside OpenClaw (co-located, low RTT).

**OpenClaw is mandatory.** No production path calls model vendor APIs from the extension. All reasoning, tool loops, and `AssistantEnvelopeV1` emission happen inside OpenClaw.

**Trust boundaries:**

```
[Sidecar] --JWT/TLS--> [Bridge (Go)] --mTLS/service-account--> [OpenClaw] --> [Model APIs]
         OR
[Sidecar] --PAT/TLS--> [OpenClaw] (direct, no bridge)
```

Docs driving this: `docs/03_BACKEND_PRD.md §2`, `docs/02_TECHNICAL_PRD.md §1.1`.

---

## 2. Packages to Build

### 2a. `packages/openclaw-pack`

**Purpose:** Deployed into OpenClaw operator's instance. Defines the workflow and tools CursorBuddy depends on.

**Contents:**
- `workflows/cursorbuddy_session.yaml` — trigger on sidecar connect; steps: ingest_audio → agent_loop → emit_envelope
- `tools/vscode_probe_state.md` — JSON schema for workspace/Git snapshot tool
- `tools/cursorbuddy_emit_envelope.md` — validates `AssistantEnvelopeV1` before transport
- `SKILL.md` — user-facing agent capability description
- `policy/default.yaml` — default DLP rules, alias overrides, vision_allowed: false

Driven by: `docs/02_TECHNICAL_PRD.md §9`, `docs/06_BACKEND_IMPLEMENTATION_STEPS.md Phase 0.5`.

### 2b. `packages/shared`

**Purpose:** Single source of truth for `AssistantEnvelopeV1` schema. Consumed by extension, sidecar, and bridge.

**Contents:**
- `src/envelope.ts` — Zod strict schema with discriminated union for all action types
- `src/command-map.ts` — loader for versioned `command-map.vscode-*.json` files
- `maps/command-map.vscode-1.98.json` — starter alias map
- `maps/command-map.vscode-1.99.json`
- `src/__tests__/envelope.test.ts` — fixtures: valid envelopes, invalid (extra props, dup ids, bad risk)

Driven by: `docs/02_TECHNICAL_PRD.md §4`, `docs/06_BACKEND_IMPLEMENTATION_STEPS.md Phase 1`.

### 2c. `packages/bridge`

**Purpose:** Optional Go HTTP/WSS bridge between sidecar and OpenClaw. Handles org auth, policy, rate limits, audit.

**API surface** (from `docs/openapi.yaml`):
- `GET /v1/healthz` — liveness probe (no auth)
- `GET /v1/policy` — org policy overrides (Bearer JWT)
- `POST /v1/sessions` — mint proxied upstream connection to OpenClaw (Bearer JWT)
- `POST /v1/sessions/{id}/telemetry` — batch telemetry ingest (Bearer JWT)
- `POST /v1/auth/refresh` — JWT refresh (Bearer JWT)
- `GET /v1/stream/{sessionId}` — WebSocket upgrade → transparent proxy to OpenClaw

**Internal components:**
- `cmd/bridge/main.go` — entrypoint, reads env
- `internal/api/` — HTTP handlers (chi router)
- `internal/auth/` — JWT validate + mint; mTLS option
- `internal/proxy/` — WebSocket transparent proxy with idle timeout + byte counters
- `internal/ratelimit/` — Redis token bucket (fail-closed on Redis down by default)
- `internal/dlp/` — text redaction pipeline (email, AKIA, PEM)
- `internal/telemetry/` — structured slog JSON logger + optional OTel

**Config (env vars):**
```
BRIDGE_LISTEN=127.0.0.1:8787
OPENCLAW_UPSTREAM_URL=https://openclaw.dev.internal
OPENCLAW_SERVICE_TOKEN=<rotated>
REDIS_URL=redis://localhost:6379
JWT_ISSUER=https://idp.example.com
JWT_SECRET=<for dev HS256; prod uses RS256 from JWKS>
LOG_LEVEL=info
```

Driven by: `docs/03_BACKEND_PRD.md §3–7`, `docs/openapi.yaml`.

---

## 3. Security Controls

| Control | Implementation |
|---------|---------------|
| JWT validation | `golang-jwt/jwt` v5; RS256 in prod, HS256 dev |
| mTLS (optional) | `tls.Config` with `ClientAuth: RequireAndVerifyClientCert` |
| Rate limiting | Redis token bucket: 5 sessions/min burst, 30/hr sustain |
| DLP | Regex pipeline on text payloads before forwarding |
| Log redaction | `sk-…` and `AIza…` patterns replaced before emit |
| Localhost binding | `BRIDGE_LISTEN=127.0.0.1:8787` default |
| WSS idle timeout | 120s configurable; bridge pings upstream |

Driven by: `docs/02_TECHNICAL_PRD.md §5`, `docs/03_BACKEND_PRD.md §10`.

---

## 4. Testing Strategy

| Layer | How |
|-------|-----|
| `packages/shared` | `vitest` unit tests with valid/invalid envelope fixtures |
| `packages/bridge` | `go test ./...` using `httptest.NewServer`; mock OpenClaw WSS server |
| `packages/openclaw-pack` | CI job: YAML lint + required-file check |

---

## 5. Local Dev

```bash
# Install Go (if missing)
brew install go

# Start Redis
docker run -p 6379:6379 redis:alpine

# Run bridge
cd packages/bridge && go run ./cmd/bridge

# Test
go test ./...
```

`docker-compose.yml` at repo root covers Redis + mock OpenClaw stub for CI.

---

## 6. What Remains (Post This Slice)

Per `docs/06_BACKEND_IMPLEMENTATION_STEPS.md`:
- Phase 2–3: Extension skeleton + webview (local runtime)
- Phase 4: Git + workspace adapters
- Phase 5: Action Executor
- Phase 6: Sidecar (audio + OpenClaw transport)
- Phase 8+: Telemetry deep dive, packaging, hardening
