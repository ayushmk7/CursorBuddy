# WaveClick — Backend / Bridge Service Product Requirements Document

**Project:** WaveClick — Realtime Voice + Visual Companion for Visual Studio Code  
**Version:** 1.0  
**Date:** April 2026  

**Definition:** In WaveClick, “backend” means **OpenClaw** (required) plus **optional** server-side components (**bridge**) that sit between the **sidecar** and **OpenClaw** or between **OpenClaw** and model providers. **Normative:** the VS Code extension + sidecar **never** replaces OpenClaw with direct vendor API calls in production. Model credentials live in **OpenClaw** (or behind the bridge that OpenClaw uses), not as a “skip OpenClaw” path in the extension.

---

## 1. Component Inventory

| Component | Required? | Runtime | Responsibility |
|-----------|-------------|---------|----------------|
| **OpenClaw** | **Yes** | User / org infra | Workflows, ReAct, tools, memory; emits `AssistantEnvelopeV1` to sidecar transport |
| VS Code Extension | Yes | Extension Host | UX, executor, Git adapter, webview |
| Sidecar | Strongly recommended | Node or native | Audio I/O, **OpenClaw** session transport (WSS/HTTP) |
| Bridge Service | Optional | Node.js 20+ / Bun / Go | mTLS/JWT to OpenClaw, key escrow, org policy, audit logs, optional WSS proxy |
| Model / Realtime APIs | Yes (via OpenClaw) | SaaS or local | Gemini Live, OpenAI Realtime, Ollama, etc.—**configured only inside OpenClaw** |

---

## 2. Bridge vs direct — latency-first decision

OpenClaw is **always** required. The **bridge** is **optional** and must be justified by **policy** or **measured benefit**, not by default.

**Default for speed:** **sidecar → OpenClaw** over TLS with the **fewest intermediaries** and OpenClaw deployed in the **same region** as the chosen model endpoint (often the lowest p50 TTFT). **Gemini Live** (or any other API) is selected **inside OpenClaw** by whichever path is fastest after benchmarking—not by the bridge.

Use a **bridge** when **any** of the following is true **and** you still meet latency SLOs (co-located bridge, HTTP/2 or WSS proxy tuning, connection pooling):

1. **Enterprise forbids** exposing OpenClaw directly to laptops (ZTNA, mTLS to bridge only).
2. You require **centralized audit** of all sessions (who invoked which workflow category—not necessarily raw audio retention).
3. You need **token budgeting** and **per-team rate limits** at the network edge.
4. You must apply **DLP** on transcripts/audio metadata before they reach OpenClaw or leave the VPC.
5. You want **provider key rotation** without touching developer machines (keys stay in vault; OpenClaw pulls via bridge/IAM).

If none apply, **sidecar → OpenClaw** (TLS, user PAT or device token) is the preferred path—**still OpenClaw**, never direct model calls from the extension.

---

## 3. Technology Stack (Bridge)

| Layer | Technology | Notes |
|-------|------------|-------|
| Runtime | Node.js 20+, TypeScript | Express or Fastify |
| Auth | mTLS or signed JWT | Short-lived tokens minted by corporate IdP |
| Transport | HTTPS + WSS proxy | Pass-through **to OpenClaw gateway** and/or model upstream as configured |
| Storage | Append-only log store | S3 / GCS / OpenTelemetry → SIEM |
| Secrets | KMS / Vault | OpenClaw + provider keys never in plaintext on disk |
| Observability | OpenTelemetry | Traces across bridge ↔ sidecar ↔ OpenClaw |

---

## 4. Authentication Flows

### 4.1 Personal Mode (No Bridge, OpenClaw Still Required)

1. User enters **OpenClaw base URL** and **OpenClaw auth token** (PAT or API key issued by their OpenClaw deployment) in WaveClick settings.
2. Extension writes to `context.secrets.store('waveclick.openclawToken', token)` (names illustrative).
3. Sidecar receives token via **one-shot IPC** when session starts (prefer **ephemeral** memory only; avoid writing to `/tmp` files).
4. **Model provider keys** are **not** stored in the extension; they are configured in **OpenClaw** only.

### 4.2 Enterprise Mode (Bridge)

1. User completes OAuth/OIDC with org IdP in browser (outside VS Code) **or** uses device code flow.
2. Bridge returns **session token** JWT:

```json
{
  "sub": "user-id",
  "org": "acme",
  "exp": 1712592000,
  "scopes": ["openclaw:waveclick", "audit:write"],
  "rl": { "rpm": 60 }
}
```

3. Sidecar presents JWT to bridge; bridge **authenticates to OpenClaw** on the user’s behalf (mTLS/service account) and opens the **WaveClick** workflow session. Provider credentials remain in **OpenClaw** or vault accessible only to OpenClaw.

### 4.3 Token Refresh

- JWT refresh via `/auth/refresh` with rotation; old `jti` blacklisted in Redis (optional).

---

## 5. API Surface (Normative Summary)

Full OpenAPI: `docsforother/openapi.yaml`.

Endpoints (illustrative):

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/v1/sessions` | Mint ephemeral upstream connection params |
| `POST` | `/v1/sessions/{id}/telemetry` | Non-audio metrics batch |
| `GET` | `/v1/healthz` | Liveness |
| `GET` | `/v1/policy` | Fetch org allowlist overrides |

**Note:** Actual **audio streaming** may be **transparent proxy** (TCP/WebSocket upgrade) rather than REST-shaped.

---

## 6. Session Minting (`POST /v1/sessions`)

### 6.1 Request

```json
{
  "client": {
    "vscode_version": "1.99.0",
    "extension_version": "0.4.2",
    "os": "darwin",
    "sidecar_version": "0.4.2"
  },
  "openclaw_workflow": "waveclick_session",
  "desired_model_tier_hint": "flash",
  "locale": "en-US"
}
```

`desired_model_tier_hint` is **non-binding**; OpenClaw policy selects the actual model.

### 6.2 Response

```json
{
  "session_id": "uuid",
  "upstream": {
    "type": "websocket",
    "url": "wss://bridge.example.com/v1/stream/uuid",
    "headers": {
      "Authorization": "Bearer …"
    }
  },
  "expires_at": "2026-04-08T12:00:00Z",
  "policy": {
    "vision_allowed": false,
    "max_session_minutes": 30
  }
}
```

The **bridge** proxies bytes between sidecar and **OpenClaw** (and OpenClaw connects to configured model providers). Provider secrets stay in **OpenClaw / vault**, not in the extension.

---

## 7. Rate Limiting & Quotas

### 7.1 Dimensions

- Per `sub` (user)
- Per `org`
- Global (protect bridge)

### 7.2 Algorithm

Token bucket in Redis:

- **Burst:** 5 sessions / minute
- **Sustain:** 30 sessions / hour

Return `429` with `Retry-After`.

---

## 8. Data Handling & Retention

| Data | Default retention | Notes |
|------|-------------------|-------|
| Audio | **Not stored** | Unless org enables compliance recording (explicit banner) |
| Transcripts | 0 days (ephemeral) | Optional 7-day encrypted store for debugging tickets |
| Action envelopes | 30 days hashed | Store SHA256 of canonical JSON + outcome |

---

## 9. DLP Pipeline (Optional)

Ordered transforms on **text** outbound to provider:

1. Email regex → `[REDACTED_EMAIL]`
2. AWS key pattern → `[REDACTED_AKIA]`
3. PEM blocks → `[REDACTED_PEM]`

Configurable per org; **over-redaction** may confuse model—provide toggle.

---

## 10. Security Controls

### 10.1 mTLS (Sidecar ↔ Bridge)

Client cert issued per machine or per user; bridge verifies CA.

### 10.2 Localhost Binding

If bridge runs on developer machine (unlikely), bind `127.0.0.1` only.

### 10.3 CORS

Not applicable to sidecar WSS; browser CORS only if web-based config portal exists.

---

## 11. Deployment Topologies

### 11.1 SaaS Bridge (Single Region)

```
Sidecar → Internet → Bridge (us-east) → OpenClaw → Model provider(s)
```

### 11.2 VPC Private Egress

Bridge and **OpenClaw** run in VPC with **NAT** allowing only approved endpoints; developers VPN into corp network or use ZTNA.

### 11.3 Minimal personal dev (no bridge)

```
Sidecar → TLS → OpenClaw (localhost or LAN) → Model provider(s)
```

---

## 12. OpenClaw Integration Pattern (Required)

**OpenClaw is the planner; WaveClick is the actuator.** Normative pattern:

1. **Workflow** `waveclick_session` (name illustrative) starts when the sidecar connects.
2. Audio/text user turns are **ingested by OpenClaw**; tools such as **`vscode_probe_state`** return workspace/Git metadata from the extension via sidecar RPC.
3. OpenClaw completes a turn by invoking **`waveclick_emit_envelope`** with **validated** `AssistantEnvelopeV1` JSON.
4. Sidecar forwards the envelope to the extension **Action Executor**; optional bridge **logs** envelope hash + outcome for audit.

OpenClaw should **not** receive raw repo file bodies by default—only tool metadata unless the user explicitly opts in.

---

## 13. Local Development

### 13.1 Env Vars (Bridge)

```
BRIDGE_LISTEN=127.0.0.1:8787
OPENCLAW_UPSTREAM_URL=https://openclaw.dev.internal
OPENCLAW_SERVICE_TOKEN=...
REDIS_URL=redis://localhost:6379
JWT_ISSUER=https://idp.example.com
```

(Model provider keys belong in **OpenClaw** config, not necessarily in the bridge.)

### 13.2 Mock OpenClaw (CI only)

Implement **`MockOpenClawGateway`** that returns canned envelopes for automated tests. **Forbidden** in production VSIX builds (see Technical PRD §9.4).

---

## 14. Operational Runbooks

### 14.1 OpenClaw or provider outage

- If **OpenClaw** is down: **no session**; display error `E_OPENCLAW`.
- If **model** inside OpenClaw is down: OpenClaw may set `policy.fallback_mode` for REST; sidecar still talks only to OpenClaw.

### 14.2 Key leak

- Rotate OpenClaw service tokens and provider keys in KMS; invalidate active sessions (`session_id` list in Redis).

---

## 15. Related Documents

- `docsforother/openapi.yaml`  
- `docsforother/02_TECHNICAL_PRD.md`  
- `docsforother/06_BACKEND_IMPLEMENTATION_STEPS.md`  

---

## 16. Capacity Planning (Back-of-Envelope)

| Variable | Example | Notes |
|----------|---------|-------|
| Concurrent sessions / bridge instance | 200–2000 | Dominated by WSS proxy memory + file descriptors |
| Egress Mbps per active audio session | 0.05–0.3 | Opus vs PCM; stereo vs mono |
| CPU | ~0.1–0.5 core per 100 sessions | If only proxying; transcoding changes math |

**Sizing rule:** load test with `k6` WebSocket scenario before promising SLAs.

---

## 17. Multi-Region & Latency

- Prefer **OpenClaw** (and bridge, if used) **geographically close** to users when audio uplink passes through them.
- Co-locate OpenClaw with model egress if enterprise policy allows to reduce agent-step latency.

---

## 18. Credential Rotation Runbook

1. Rotate **OpenClaw** service credentials and **model provider** keys per your secret manager.
2. Write to KMS secret version `vN+1`.
3. Rolling restart **OpenClaw** and bridge pods (staggered).
4. Monitor `401` / `E_OPENCLAW` rate; rollback if spike.
5. Revoke old key after 24h stable.

---

## 19. Schema Evolution Policy

- OpenAPI **minor** bump for additive REST fields.
- **Major** bump if JWT claims or session mint response breaks clients.
- Sidecar and extension negotiate `bridge_api_version` in `SessionMintRequest.client`.

---

## 20. Example Fastify Route Stubs (Reference Only)

```typescript
app.post('/v1/sessions', async (req, reply) => {
  const parsed = SessionMintRequestSchema.parse(req.body);
  const sessionId = randomUUID();
  // mint upstream, store policy in Redis
  reply.code(201).send({
    session_id: sessionId,
    upstream: {
      type: 'websocket',
      url: `wss://bridge.example.com/v1/stream/${sessionId}`,
      headers: { Authorization: `Bearer ${mintEphemeral(sessionId)}` },
    },
    expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    policy: { vision_allowed: false, max_session_minutes: 30, fallback_mode: 'none' },
  });
});
```

---

## 21. Compliance Mappings (Informative)

Map controls to your org’s framework (SOC2, ISO27001):

- **CC6.1** logical access: JWT + mTLS  
- **CC7.2** monitoring: OTel + audit logs  
- **A.8.24** cryptography: TLS1.2+, modern ciphers  

This section is **non-exhaustive** and not legal advice.
