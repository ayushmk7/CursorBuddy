# WaveClick — Implementation Steps (End-to-End)

This document is a **sequential implementation guide** for building **WaveClick** as described in `docsforother/01_GENERAL_PRD.md`, `docsforother/02_TECHNICAL_PRD.md`, and `docsforother/03_BACKEND_PRD.md`. Execute phases in order unless explicitly marked parallelizable.

**Scope:** **OpenClaw pack** (required workflows + tools), VS Code extension (TypeScript), **sidecar** (strongly recommended) with **OpenClaw** transport, optional **bridge** service, **CI/CD**, and **compatibility testing**. **No** production path that skips OpenClaw.

**Related:** `docsforother/04_CLAUDE_CODE_GUIDE.md` (agent prompts), `docsforother/openapi.yaml` (bridge contract), `docsforother/05_FRONTEND_PROMPT.md` (landing + waitlist site), `docsforother/07_LOCAL_CURSOR_AND_COMPANION.md` (local webview + cursor/overlay).

---

## How to use this file

1. Complete **Phase 0** before writing feature code; irreversible security assumptions are decided there.
2. For each subsystem, implement **happy path → schema validation → failure modes → telemetry**.
3. Treat **command ID drift** as a release-blocking issue; maintain a **version matrix** artifact.
4. **Never** ship a build where the model can call `executeCommand` with unconstrained strings.

---

## Phase 0 — Decisions, threat model, and repositories

### Step 0.0 — OpenClaw is non-negotiable (gate)

Before any feature work:

1. Provision **OpenClaw** (docker compose, k8s, or hosted) with network path from developer machines (or VPN).
2. Add **`packages/openclaw-pack`** to the repo with **waveclick** workflow + tools per `docsforother/02_TECHNICAL_PRD.md` §9.
3. CI job **`verify-openclaw-pack`** validates pack structure (filenames, tool stubs).

**Edge cases**

- If OpenClaw is down, the extension shows **blocked** state—**do not** add direct provider SDK as fallback in release builds.

### Step 0.1 — Fix deployment modes (measure before you commit)

Choose the mode with the **lowest measured p50 TTFT** to first envelope that still satisfies security:

| Mode | Description | Typical latency |
|------|-------------|-----------------|
| A — Direct to OpenClaw | Sidecar → TLS → OpenClaw (same region as model) | **Fewest hops**—default for speed |
| B — Enterprise bridge | Sidecar → bridge → OpenClaw | Extra hop—acceptable if bridge is **co-located** / low RTT and policy requires it |

**Deliverable:** `ARCHITECTURE.md` stating the mode, **OpenClaw URL / discovery**, and **latency baseline numbers** (include Gemini Live vs alternatives from OpenClaw config).

**Edge cases**

- Hybrid orgs: some users direct, some bridged → support **runtime switch** via setting `waveclick.connectionMode`.
- Re-benchmark when OpenClaw region or model vendor changes.
- Air-gapped: OpenClaw unreachable → extension degrades to **offline help** (static tips) without throwing; **no** silent cloud bypass.

### Step 0.2 — Threat model sign-off

Review `docsforother/02_TECHNICAL_PRD.md` §5. Add:

- STRIDE one-pager
- Data flow diagram with trust boundaries (Extension Host, Sidecar, Bridge, **OpenClaw**, Model provider)

**Edge cases**

- Malicious `package.json` `tasks` or `launch` configs: **disable** task execution from model by default.

### Step 0.3 — Version support matrix

Table:

| WaveClick | VS Code min | Node (sidecar) | bridge runtime |
|-----------|-------------|----------------|----------------|
| 0.4.x | 1.98.x | 20 | 20 |

**Edge cases**

- Insiders vs Stable: decide policy (support Stable only recommended).

### Step 0.4 — Monorepo tooling

Recommended: `pnpm` workspaces or `npm` workspaces.

```
packages/openclaw-pack    # REQUIRED workflows, tools, SKILL.md
packages/extension
packages/sidecar
packages/bridge
packages/shared            # zod schemas, types
```

**Edge cases**

- **Duplicate zod** versions → hoist carefully; single `schema_version` enum in `shared`.

---

## Phase 0.5 — OpenClaw pack delivery (`packages/openclaw-pack`)

### Step 0.5.1 — Workflow file

- Define **`waveclick_session`** entry: triggers on sidecar connect or HTTP webhook from bridge.
- Steps: `ingest_audio`, `agent_loop`, `emit_envelope` (names illustrative—match OpenClaw’s actual workflow DSL).

### Step 0.5.2 — Tools

- **`vscode_probe_state`**: documents JSON schema returned from extension RPC.
- **`waveclick_emit_envelope`**: validates `AssistantEnvelopeV1` with same Zod as extension **before** transport.

### Step 0.5.3 — Version coupling

- Tag `openclaw-pack@x.y.z` in lockstep with extension **minor** when envelope schema changes.

---

## Phase 1 — Shared contracts (`packages/shared`)

### Step 1.1 — JSON Schema / Zod for `AssistantEnvelopeV1`

Implement:

- `AssistantEnvelopeV1Schema` with `strict()` / `additionalProperties: false` equivalent
- `ActionUnion` discriminated by `type`
- Unit tests: **fixtures/** for valid + invalid payloads

**Edge cases**

- Model emits Markdown fences around JSON → preprocessor strips ```json blocks.
- Duplicate `action.id` → reject entire envelope (fail closed).

### Step 1.2 — Command alias map format

YAML or JSON per VS Code family:

```
command-map.vscode-1.98.json
command-map.vscode-1.99.json
```

Loader selects **best ≤ current vscode.version**.

**Edge cases**

- Unknown version: pick **nearest lower** map; log warning in output channel.

### Step 1.3 — Risk policy defaults

Encode defaults:

- `low`: auto-run
- `medium`: toast + 5s undo window (if implementable) or informational only
- `high`: modal confirm

**Edge cases**

- User toggles **“YOLO mode”** → require typed confirmation string `COMMIT` to enable.

---

## Phase 2 — Extension skeleton (`packages/extension`)

### Step 2.1 — Generator baseline

Use `yo code` or manual scaffold with:

- `esbuild` bundling extension + webview
- `eslint` + `typescript` strict
- `@vscode/vscode-api` pinned

**Edge cases**

- **Dual package.json** for webview bundling vs extension — document clearly.

### Step 2.2 — Activation & output channel

Implement:

- `activate(context)` registers commands **lazily**
- `WaveClick` output channel for structured logs (JSON lines in dev)

**Edge cases**

- Double activation in tests → guard with `if (already) return`.

### Step 2.3 — SecretStorage wrapper

API:

```typescript
export async function getOpenClawToken(context: vscode.ExtensionContext): Promise<string | undefined>;
export async function setOpenClawToken(context: vscode.ExtensionContext, token: string): Promise<void>;
export async function deleteOpenClawToken(context: vscode.ExtensionContext): Promise<void>;
```

**Edge cases**

- Token rotation: notify sidecar to drop in-memory copy.
- **Never** store raw model API keys in SecretStorage in production builds.

### Step 2.4 — Configuration schema

`package.json` `contributes.configuration`:

- `waveclick.connectionMode`
- `waveclick.provider`
- `waveclick.privacy.redactTranscript`
- `waveclick.audio.deviceId` (optional)

Validate on change via `vscode.workspace.onDidChangeConfiguration`.

---

## Phase 3 — Webview UI (`packages/extension/src/webview`)

### Step 3.1 — WebviewViewProvider

Implement sidebar provider with:

- `enableScripts: true`
- `localResourceRoots` restricted to `dist/webview`
- CSP: `default-src 'none'; style-src ${nonce}; script-src 'nonce-…'; img-src data: https:; font-src ${webview.cspSource};`

**Edge cases**

- **CSP nonce** regeneration per webview HTML generation.

### Step 3.2 — Message protocol Extension ↔ Webview

Typed messages:

```typescript
type HostToWebview =
  | { type: 'state'; payload: SessionState }
  | { type: 'transcript_delta'; payload: { role: 'user' | 'assistant'; text: string } }
  | { type: 'steps'; payload: Step[] };

type WebviewToHost =
  | { type: 'ui_ready' }
  | { type: 'push_to_talk'; payload: { down: boolean } }
  | { type: 'confirm_result'; payload: { actionId: string; ok: boolean } };
```

**Edge cases**

- Webview reloaded mid-session → host replays last `state` snapshot.

### Step 3.3 — Visual implementation

Follow `docsforother/07_LOCAL_CURSOR_AND_COMPANION.md` for sidebar webview layout and motion; inject VS Code theme CSS variables in HTML template. Marketing site follows `docsforother/05_FRONTEND_PROMPT.md`.

**Edge cases**

- High contrast theme: test focus rings and danger buttons.

---

## Phase 4 — Git & workspace probes (`packages/extension/src/adapters`)

### Step 4.1 — `GitAdapter`

Implement snapshot:

```typescript
export interface GitSnapshot {
  repositories: Array<{
    rootUri: vscode.Uri;
    headName?: string;
    workingTreeCount: number;
    indexCount: number;
  }>;
}
```

**Edge cases**

- Git extension disabled by user → clear error surfaced to model tool as `git: unavailable`.

### Step 4.2 — `WorkspaceAdapter`

Return folder list, **active editor** metadata, language IDs.

**Edge cases**

- Untitled files: URI scheme `untitled:` — model must not receive absolute paths off workspace.

### Step 4.3 — Optional `ScreenshotAdapter` (v1.1)

User-triggered only; use desktop capturer **if** running in environment that supports it; otherwise disable.

---

## Phase 5 — Action Executor (`packages/extension/src/executor`)

### Step 5.1 — Core loop

```
parse → validate schema → sort actions by implicit order → execute sequentially
```

**Edge cases**

- Partial failure: stop chain, mark following steps `blocked`, notify UI.

### Step 5.2 — `execute_command` implementation

Pseudo:

```typescript
const entry = aliasMap[action.alias];
if (!entry) throw new CommandNotAllowed(action.alias);
if (!semver.satisfies(vscode.version, entry.vscode)) throw new VersionMismatch();
await vscode.commands.executeCommand(entry.commands[0], ...(action.args ?? []));
```

**Edge cases**

- Command throws: capture `e.message`, feed back to model session as tool error **without** stack to provider unless dev flag.

### Step 5.3 — Confirm gate

For `risk === 'high'`, open modal webview or `window.showWarningMessage` with **Cancel default**.

**Edge cases**

- User closes VS Code mid-modal → treat as cancel.

### Step 5.4 — Rate limit local actions

Prevent model loops:

- Max **10** command executions per minute unless user confirms burst.

---

## Phase 6 — Sidecar (`packages/sidecar`)

### Step 6.1 — Process supervisor (extension)

Spawn:

- `waveclick-sidecar` with `stdio: ['pipe','pipe','pipe']`
- Pass env: `WC_LOG_LEVEL`, optional `WC_BRIDGE_URL`

Restart on crash with exponential backoff capped at 30s.

**Edge cases**

- Windows AV false positives → code-sign binaries.

### Step 6.2 — IPC framing

Use **newline-delimited JSON** or **length-prefixed binary** for robustness.

Messages:

- `audio_frame` (base64 or raw binary in sidecar-native build)
- `provider_event`
- `session_start` / `session_stop`

**Edge cases**

- Large messages: implement backpressure; drop audio frames if upstream slow (signal UI).

### Step 6.3 — OpenClaw transport client interface

```typescript
export interface OpenClawSessionClient {
  connect(opts: { baseUrl: string; token: string; workflow: string }): Promise<void>;
  sendAudio(chunk: Uint8Array): void;
  sendTextTurn(text: string): void;
  onTranscript(cb: (t: TranscriptEvent) => void): void;
  onEnvelope(cb: (e: AssistantEnvelopeV1) => void): void;
  dispose(): void;
}
```

Implementations:

- `OpenClawWebsocketClient` (bind to OpenClaw gateway)
- `MockOpenClawClient` (CI / dev only; stripped in release)

**Edge cases**

- Token refresh mid-session: reconnect preserving `session_id` mapping table.

### Step 6.4 — Audio capture

Choose library; document platform permissions.

**Edge cases**

- Bluetooth headset sample rate changes → resample to provider-required rate.

---

## Phase 7 — Bridge service (`packages/bridge`, optional; OpenClaw still required)

### Step 7.1 — OpenAPI implementation

Implement paths from `docsforother/openapi.yaml`:

- Health
- Session minting
- Policy fetch

**Edge cases**

- Clock skew: JWT `exp` validation window ±60s leeway.

### Step 7.2 — WSS proxy

Transparent pipe with:

- idle timeout (e.g. 120s no audio)
- max duration (policy)
- byte counters for billing

**Edge cases**

- Upstream **OpenClaw** sends ping frames → forward.

### Step 7.3 — Rate limiting

Redis token bucket per org/user.

**Edge cases**

- Redis down: **fail closed** (deny new sessions) or **fail open** (enterprise choice — document).

---

## Phase 8 — Telemetry & logging

### Step 8.1 — Structured logs

Use `pino` in bridge; JSON lines in sidecar; VS Code output channel in extension.

Fields: `session_id`, `utterance_id`, `action_id`, `latency_ms`, `result`.

### Step 8.2 — Opt-in telemetry

If using VS Code telemetry API, declare in `package.json`.

**Edge cases**

- EU users: respect decision; no fingerprinting.

---

## Phase 9 — Testing strategy

### Step 9.1 — Unit tests

- Schema validation
- Alias resolution
- Executor rejection paths

### Step 9.2 — `@vscode/test-electron`

Integration test harness:

1. Download VS Code test instance
2. Open temp workspace with git repo
3. Run command to start session with **`MockOpenClaw`** (canned envelopes) — **dev/CI only**
4. Assert SCM view visible after envelope
5. Assert production build flag **disables** mock path

### Step 9.3 — Bridge tests

- `supertest` against Fastify app
- Mock upstream WebSocket server

### Step 9.4 — Manual QA script (`docs/QA.md` in extension repo)

Checklist: multi-root, SSH remote, WSL, large repos.

---

## Phase 10 — Packaging & distribution

### Step 10.1 — `vsce` packaging

- README with GIFs (screen recording)
- CHANGELOG
- License

### Step 10.2 — Sidecar binaries

CI matrix:

- `darwin-arm64`, `darwin-x64`, `win32-x64`, `linux-x64`

Embed version stamp; verify SHA256 in extension at download (if downloaded) or ship inside VSIX.

### Step 10.3 — Marketplace listing

- Categories: Other, Machine Learning (if applicable)
- Privacy policy URL

---

## Phase 11 — Documentation & open source hygiene

### Step 11.1 — SECURITY.md

Disclosure email, scope (extension only vs bridge).

### Step 11.2 — CONTRIBUTING.md

Build instructions, test commands.

### Step 11.3 — Architecture diagrams

Keep PNG/SVG updated when IPC changes.

---

## Phase 12 — Hardening pass (pre-1.0)

### Step 12.1 — Fuzz JSON parser

Fuzz envelope strings; ensure no throws escape executor.

### Step 12.2 — Pen test focus areas

- Localhost server if any
- Path traversal in `reveal_uri`
- Command argument injection

### Step 12.3 — Supply chain

- `npm audit` in CI
- Lockfile committed

---

## Unifying “full product” locally (dev ergonomics)

### Dev script orchestration

`pnpm dev` runs:

1. `esbuild --watch` for extension
2. `esbuild --watch` for webview
3. `tsc --watch` for sidecar
4. `F5` in VS Code for Extension Development Host

### Environment variables (local)

```
WAVECLICK_MOCK_OPENCLAW=1
WAVECLICK_LOG_LEVEL=debug
```

### End-to-end dry run

1. Open sample workspace with Git repo
2. Start session
3. Speak or inject mock transcript
4. Observe SCM navigation
5. Trigger high-risk action → confirm modal

---

## Appendix A — Executor pseudocode (reference)

```typescript
export async function executeEnvelope(env: AssistantEnvelopeV1, ctx: ExecContext): Promise<void> {
  const parsed = AssistantEnvelopeV1Schema.parse(env);
  for (const action of parsed.actions) {
    if (action.risk === 'high' && !ctx.userApproved.has(action.id)) {
      const ok = await ctx.confirm(action);
      if (!ok) break;
    }
    await dispatch(action, ctx);
  }
}
```

---

## Appendix B — Command alias CI check (sketch)

```bash
node scripts/verify-commands.js --vscode-version 1.99.0 --map ./maps/command-map.vscode-1.99.json
```

Script loads VS Code’s `defaultCommands` snapshot artifact (checked into `dev/artifacts/` weekly) and fails on missing IDs.

---

## Appendix C — OpenClaw handoff (**required**)

**OpenClaw is mandatory** for all production sessions.

1. OpenClaw runs workflows and tools; it emits **only** `AssistantEnvelopeV1` JSON (or equivalent tool event) to the sidecar transport.
2. Bridge (if present) validates schema **identically** to extension before optional audit log.
3. Extension **never** executes raw arbitrary tool JSON from the network—only **schema-validated** `AssistantEnvelopeV1` with session correlation.
4. Pack artifacts live in **`packages/openclaw-pack`** and are versioned with the extension.

---

## Completion criteria (Definition of Done for v1)

- [ ] **`packages/openclaw-pack`** published/versioned with workflow + tools documented
- [ ] Sidebar webview functional in light/dark/HCT; **OpenClaw** connection states visible
- [ ] **OpenClaw** (or CI `MockOpenClaw` only) drives envelopes; SCM opens on clean workspace
- [ ] Production build **cannot** bypass OpenClaw to call model vendors directly
- [ ] High-risk commit action requires confirmation
- [ ] SecretStorage stores **OpenClaw** auth only; never logs tokens
- [ ] CI: unit + integration + bridge tests green
- [ ] Docs: user-facing README + security policy + OpenClaw operator runbook

---

## Related Documents

- `docsforother/01_GENERAL_PRD.md`  
- `docsforother/02_TECHNICAL_PRD.md`  
- `docsforother/03_BACKEND_PRD.md`  
- `docsforother/openapi.yaml`  

---

## Phase 13 — Remote Development Parities (SSH / WSL / Containers / Codespaces)

### Step 13.1 — Where the sidecar runs

| Environment | Sidecar location | Implication |
|-------------|------------------|-------------|
| Local window | Host OS | Mic access on laptop |
| Remote SSH | **Remote** machine by default | Mic is wrong device unless UI captures on local and forwards (out of scope v1) |
| WSL | WSL2 VM | Windows mic passthrough latency |
| Dev Container | Container | Usually **no** mic — document limitation |
| GitHub Codespaces | Browser / remote | Browser audio APIs differ |

**v1 recommendation:** detect `extensionKind` / `remoteName`; if remote, show banner **“Voice sessions require local window or supported setup.”** Offer **text-only** mode.

### Step 13.2 — Git in remote contexts

`vscode.git` API reads **remote workspace** repos correctly. Executor paths must use `Uri` objects, not string paths, to avoid drive letter vs POSIX mistakes.

### Step 13.3 — Testing matrix row

Add CI job (manual nightly acceptable) that runs integration test against **Remote-Containers** stub workspace with expectation: extension activates, executor rejects voice start with clear error.

---

## Phase 14 — Release Engineering & Supply Chain

### Step 14.1 — Semantic versioning policy

- **MAJOR:** breaking IPC or schema_version change
- **MINOR:** new aliases, new provider
- **PATCH:** bugfixes

### Step 14.2 — Changelog discipline

Every PR touching `command-map*.json` must include changelog entry **“Verified commands on VS Code x.y.z.”**

### Step 14.3 — SLSA / provenance (enterprise)

Publish build provenance attestation for VSIX and sidecar binaries to satisfy customer Infosec questionnaires.

---

## Phase 15 — Observability Deep Dive

### Step 15.1 — Trace IDs

Propagate `traceparent` W3C header from bridge → provider if supported.

### Step 15.2 — Log redaction regex

Apply before emitting logs:

- `sk-[A-Za-z0-9]{20,}` → `[REDACTED_OPENAI]`
- `AIza[0-9A-Za-z_-]{20,}` → `[REDACTED_GOOGLE]`

### Step 15.3 — Metrics (optional Prometheus)

Bridge exposes:

- `waveclick_sessions_active`
- `waveclick_session_mint_total{result}`
- `waveclick_proxy_bytes_total{dir}`

---

## Phase 16 — Legal & Marketplace Compliance

### Step 16.1 — Privacy policy sections

Explicitly state:

- Audio goes to provider X
- Retention defaults (none)
- Enterprise recording exception

### Step 16.2 — Third-party notices

Generate `ThirdPartyNotices.txt` from `pnpm licenses list`.

---

## Phase 17 — Disaster Recovery (Bridge)

### Step 17.1 — Backup

Redis AOF or RDB; KMS key versions for JWT signing keys.

### Step 17.2 — Rollback

Blue/green deploy; keep prior VSIX compatible for 1 major version where possible.

---

## Appendix D — Sample `launch.json` for Extension Development

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Run Extension + Sidecar (mock)",
      "type": "extensionHost",
      "request": "launch",
      "args": ["--extensionDevelopmentPath=${workspaceFolder}/packages/extension"],
      "outFiles": ["${workspaceFolder}/packages/extension/dist/**/*.js"],
      "env": {
        "WAVECLICK_MOCK_OPENCLAW": "1"
      }
    }
  ]
}
```

---

## Appendix E — Redis Key Layout (Bridge)

| Key pattern | TTL | Value |
|-------------|-----|-------|
| `wg:session:{id}` | session max | upstream metadata JSON |
| `wg:rl:user:{sub}` | 1h rolling window | token bucket counters |
| `wg:jti:{id}` | JWT exp | `"1"` if revoked |

---

## Appendix F — Nginx Stream Proxy Sketch (Optional)

For enterprises terminating TLS at Nginx before bridge:

```
map $http_upgrade $connection_upgrade {
  default upgrade;
  '' close;
}

server {
  listen 443 ssl;
  location /v1/stream/ {
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection $connection_upgrade;
    proxy_read_timeout 3600s;
    proxy_pass http://127.0.0.1:8787;
  }
}
```

**Caveat:** WebSocket idle timeouts must exceed longest expected “thinking” pause or send periodic pings.

---

## Appendix G — Executor Unit Test Case Matrix

| Case | Input | Expected |
|------|-------|----------|
| Unknown alias | `alias: "rm_rf"` | reject, no command |
| Extra properties | envelope with `foo: 1` | reject schema |
| High risk no confirm | user flag default | modal shown |
| Command throws | `executeCommand` rejection | tool error to model, UI error row |
| Cycle in `requires` | a→b→a | reject envelope |

---

## Appendix H — Open Questions Log (Track to Resolution)

1. Exact Gemini Live message schema versioning — pin SDK version quarterly.
2. Whether `git.commit` accepts arguments on all platforms — verify macOS/Win/Linux.
3. Corporate proxy authentication (NTLM) for sidecar — may require native fetch patch.

