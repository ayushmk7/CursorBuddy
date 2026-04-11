# CursorBuddy — Architecture Decision Record

**Date:** 2026-04-09  
**Status:** Accepted  

## Deployment Mode

**Mode A (default) — Direct sidecar → OpenClaw:**

```
[VS Code Extension] ←stdio/NDJSON→ [Sidecar] ──TLS──▶ [OpenClaw] ──▶ [Model APIs]
```

Fewest network hops. Preferred when no enterprise proxy requirement.
Sidecar authenticates with a user-scoped OpenClaw PAT stored in VS Code SecretStorage.

**Mode B (enterprise) — Bridge tier:**

```
[Sidecar] ──JWT/TLS──▶ [Bridge (Go, this repo)] ──mTLS──▶ [OpenClaw] ──▶ [Model APIs]
```

Use Mode B when: ZTNA policy, centralized audit, token budget, DLP on audio metadata.
Bridge is co-located with OpenClaw (same VPC/region) to preserve latency SLOs.

## OpenClaw is Mandatory

All production reasoning, tool calls, and `AssistantEnvelopeV1` emission happen inside
OpenClaw. The extension and bridge are actuator + policy tier only. No model vendor keys
are stored in the extension or bridge; they live in OpenClaw's secret store.

## Latency Baseline (to measure before v1 release)

| Path | Expected p50 |
|------|-------------|
| Sidecar → OpenClaw (same region) | 200–600 ms to first envelope |
| Sidecar → Bridge → OpenClaw (co-located) | +20–50 ms bridge overhead |

Benchmark using `k6` WebSocket scenario. Regression threshold: +200 ms p95.

## Trust Boundaries

| Boundary | Authentication |
|----------|---------------|
| Extension Host → Sidecar | stdio (same process group, OS enforced) |
| Sidecar → Bridge | JWT HS256 (dev) / RS256 (prod) |
| Bridge → OpenClaw | mTLS service account + service token |
| Sidecar → OpenClaw (direct) | User PAT in SecretStorage |

## STRIDE Summary

| Threat | Mitigation |
|--------|-----------|
| Spoofed envelope | Session/utterance ID correlation; schema validation rejects extras |
| Prompt injection via file content | `vscode_probe_state` never returns file bodies by default |
| Malicious workspace task execution | Executor does not run tasks from model output |
| Command injection via executeCommand | Alias map blocks unconstrained strings |
| Rogue extension | mTLS / HMAC on sidecar-bridge socket |
| Credential exfiltration | No model keys in extension; SecretStorage for OpenClaw token only |
| JWT detail disclosure in 401 | Auth errors return static message; details logged server-side only |

## What Remains (Post This Slice)

Per `docs/06_BACKEND_IMPLEMENTATION_STEPS.md`:

- [ ] Phase 2: Extension skeleton (TypeScript, activation, SecretStorage)
- [ ] Phase 3: Webview sidebar UI
- [ ] Phase 4: GitAdapter + WorkspaceAdapter
- [ ] Phase 5: Action Executor (Zod validate → alias resolve → executeCommand)
- [ ] Phase 6: Sidecar (audio capture, OpenClaw transport, IPC framing)
- [ ] Phase 8: OTel traces, Prometheus metrics on bridge
- [ ] Phase 9: @vscode/test-electron integration tests
- [ ] Phase 10: VSIX packaging + sidecar binary matrix
