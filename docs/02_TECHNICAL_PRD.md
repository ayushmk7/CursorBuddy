# WaveClick — Technical Product Requirements Document

**Project:** WaveClick — Realtime Voice + Visual Companion for Visual Studio Code  
**Version:** 1.0  
**Date:** April 2026  

---

## 1. System Architecture

### 1.1 Logical Topology (OpenClaw required)

**Normative:** Every production session **terminates in OpenClaw** for reasoning, tool use, and envelope generation. The VS Code extension **never** substitutes a direct vendor SDK path for orchestration in release builds.

**Latency:** The **bridge** is optional and **not** preferred on latency grounds alone—use it when security or ops require it, otherwise prefer the **shortest** path from sidecar to OpenClaw that meets policy. Co-locate OpenClaw with the **model edge** (same region / VPC egress) where possible.

```
┌────────────────────────────────────────────────────────────────────────────┐
│                           VISUAL STUDIO CODE                                │
│  ┌──────────────────────┐    postMessage      ┌──────────────────────────┐ │
│  │  Extension Host      │◄──────────────────►│  Webview (Sidebar UI)     │ │
│  │  (Node, CommonJS/ESM)│                    │  (sandboxed, no Node)     │ │
│  │  - Activation        │                    │  - Transcript / steps     │ │
│  │  - State service     │                    │  - Mic visualization      │ │
│  │  - Action Executor   │                    │  - OpenClaw status        │ │
│  └──────────┬───────────┘                    └──────────────────────────┘ │
│             │ IPC (stdio / localhost TLS)                                     │
│             ▼                                                               │
│  ┌──────────────────────┐         ┌──────────────────────────────────────┐ │
│  │  Sidecar Process     │  WSS/   │         OPENCLAW RUNTIME             │ │
│  │  (recommended)       ├────────►│  - Workflows / ReAct loop             │ │
│  │  - Audio capture     │  HTTP   │  - SOUL / MEMORY / SKILL             │ │
│  │  - VAD / resample    │         │  - Tool: vscode_probe_state          │ │
│  │  - Session lifecycle │◄────────┤  - Tool: waveclick_emit_envelope *   │ │
│  └──────────┬───────────┘         │  - Model routing (realtime / REST)    │ │
│             │                     └─────────────────┬────────────────────┘ │
│             │ optional path                         │                       │
│             ▼                                       ▼                       │
│  ┌──────────────────────┐              ┌────────────────────────────────────┐ │
│  │  Bridge Service      │              │  Model APIs (via OpenClaw only)    │ │
│  │  (optional—latency-  │              │  Fastest path per OpenClaw config  │ │
│  │   measured)          │              │  (e.g. Gemini Live if fastest)     │ │
│  │  mTLS + JWT to OC    │              └────────────────────────────────────┘ │
│  └──────────────────────┘                                                   │
└────────────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    vscode.* APIs, built-in Git extension

* `waveclick_emit_envelope` is the logical name for the OpenClaw tool that outputs
  validated AssistantEnvelopeV1 to the sidecar/extension transport.
```

### 1.2 Why a Sidecar?

The Extension Host is **not** designed for:

- Long-blocking **microphone** capture at stable latency.
- Maintaining **multiple minutes** of WebSocket heartbeats without interfering with extension responsiveness.
- **Binary audio frame** handling at high frequency.

A **small native or Node sidecar** (signed binary per OS, spawned by extension) provides:

- Isolated crash domain (sidecar restart without killing editor).
- Clear **permission prompts** at OS level (mic) separate from VS Code.
- Easier **certificate pinning** for enterprise MITM proxies (optional).

**MVP alternative:** implement realtime client **inside Extension Host** using `node-fetch` / `ws` with `mic` package—acceptable for prototyping, higher risk of UI jank.

---

## 2. VS Code Integration Surface

### 2.1 Extension Manifest (`package.json`) — Required Contributions

| Contribution | Purpose |
|--------------|---------|
| `activationEvents` | Prefer `onCommand:waveclick.startSession` over `*` to preserve startup performance |
| `viewsContainers` / `views` | Sidebar primary UI |
| `commands` | Start/stop session, toggle privacy, emergency stop |
| `keybindings` | Push-to-talk default chord (user-overridable) |
| `configuration` | OpenClaw URL, workflow id, modes, allowlists |
| `menus` | Command palette entries, view title actions |

### 2.2 Core VS Code APIs Used

| Capability | API entry points | Notes |
|------------|------------------|-------|
| Execute workbench commands | `vscode.commands.executeCommand` | Must validate against allowlist |
| Query command list | `vscode.commands.getCommands(true)` | Diff-based discovery for version skew |
| Reveal SCM | `executeCommand('workbench.view.scm')` | Exact IDs validated per VS Code version matrix §8 |
| Git state | `extensions.getExtension('vscode.git')` → API | Official Git extension exports repository model |
| Workspace folders | `vscode.workspace.workspaceFolders` | Multi-root changes session grounding |
| Open documents | `vscode.window.showTextDocument` | URI validation to prevent path escape |
| Decorations | `createTextEditorDecorationType` | Highlight lines referenced in plan |
| Webview | `vscode.window.createWebviewPanel` or sidebar provider | Strict CSP |
| Secrets | `context.secrets` (`SecretStorage`) | API keys, refresh tokens |
| Status bar | `vscode.window.createStatusBarItem` | Session state indicator |

### 2.3 Git Extension Integration (Technical Detail)

The built-in Git extension exposes an API via `getAPI(version)`. WaveClick MUST:

1. Request a **compatible API version** range (pin minimum supported VS Code version in README).
2. Enumerate `repositories: Repository[]` from `gitAPI.repositories`.
3. Read:

   - `repo.rootUri`
   - `repo.state.HEAD`, `repo.state.remotes`
   - `repo.state.workingTreeChanges`, `repo.state.indexChanges` (naming varies by API version—abstract behind `GitAdapter` interface).

4. Never shell out to `git` directly **unless** Git extension API is unavailable (remote edge case)—if shelling out, use `child_process.spawn` with **argument arrays**, never string concatenation; cwd locked to `rootUri.fsPath`.

### 2.4 Honesty Constraints (SCM Input & Webview Limitations)

VS Code **does not** expose a stable public API to:

- Place the text cursor inside the **SCM commit message input** as if it were an editor.
- Read the **current text** of that input programmatically.

Therefore PRD language like “cursor follows” must be implemented as:

- **Focus** Source Control view + **highlight** (decoration in active editor is wrong target) → use **webview** sidebar callout + optional **notification** pointing to SCM.
- For commit message prefill, prefer:

  - `git.commit` / related palette commands where available, or
  - **Instructional** UX rather than simulating typing into SCM box.

Document this in user-facing copy to avoid false expectations.

---

## 3. Realtime Cloud Session Layer

### 3.1 Session Lifecycle State Machine

```
[Inactive] --start--> [Connecting_OpenClaw] --ok--> [Live]
   ^                         | fail                  |
   |                         v                       |
   +-------------------- [Blocked] ------------------+
   |                         |
   |   OpenClaw may use REST fallback internally ----+
   |
   +--user stop / error--> [Inactive]
```

- **Connecting_OpenClaw**: TLS + auth to OpenClaw; load workflow **waveclick_session** (name illustrative).
- **Live**: audio and/or text user turns flow **through OpenClaw**; structured envelopes returned to extension.
- **Blocked**: OpenClaw unreachable or unauthorized—**no** direct provider fallback in production.
- **Degraded_REST**: only if OpenClaw is up but realtime model path failed **inside** OpenClaw config; extension behavior unchanged (still receives envelopes from OpenClaw).

### 3.2 Latency Budget (Navigation Intent)

| Stage | Budget (p50 target) | Notes |
|-------|---------------------|-------|
| Capture + frame | 5–20 ms | Sidecar buffering |
| Uplink encode | 5–30 ms | Opus vs PCM |
| **OpenClaw ingress + agent step** | 80–600 ms | Depends on tool count + model |
| Model/realtime (inside OpenClaw) | 150–800 ms | Network + provider |
| Envelope egress to extension | 5–40 ms | Same region helps |
| JSON parse + validate | 1–5 ms | Local |
| `executeCommand` | 1–50 ms | VS Code main process |

**Total p50:** ~300 ms–1.8 s excluding user speech duration (OpenClaw hop adds variable cost).

### 3.3 Model path selection (latency-first; Gemini Live optional)

WaveClick does **not** mandate **Gemini Live**. OpenClaw **must** be configured to use the **lowest-latency** stack that still meets quality and compliance for each deployment:

| Priority | Guidance |
|----------|----------|
| 1 | **Measure** TTFT and time-to-envelope for candidate paths (Gemini Live, OpenAI Realtime, other realtime, fast REST). |
| 2 | Prefer **realtime/bidirectional audio** when it wins on **p50** latency for voice turns; **Gemini Live** is a strong default candidate but must be **validated**, not assumed. |
| 3 | Use **smallest / Flash-class** tiers for interactive navigation; escalate to heavier models only when user enables “complex reasoning” or OpenClaw policy requires it. |
| 4 | If realtime is down or slower than a **small REST** completion for a given turn, OpenClaw may switch path **inside** the same session (extension unchanged). |

**Required:** OpenClaw orchestration. **Not required:** any single vendor or product name.

Configuration keys in **VS Code** (example)—**not** provider keys; those belong in **OpenClaw**:

```json
{
  "waveclick.openclaw.baseUrl": "https://openclaw.internal.example",
  "waveclick.openclaw.workflow": "waveclick_session",
  "waveclick.openclaw.auth": "bearer_from_secret_storage"
}
```

Concrete model and realtime API selection (including whether **Gemini Live** is primary) is configured **only in OpenClaw**.

### 3.4 Vision Policy

Default: **no continuous video.**

Optional modes:

| Mode | Trigger | Payload |
|------|---------|---------|
| `none` | default | workspace metadata only |
| `screenshot_once` | user button or voice “look at my screen” | single JPEG/WebP, downscaled (max edge 1024px) |
| `low_fps` | advanced, off by default | 1 fps keyframes, aggressive compression |

Screenshots **must** redact **other monitors** if OS permits per-window capture; prefer **VS Code window capture** only.

---

## 4. Structured Action Protocol

### 4.1 Design Principles

1. **OpenClaw proposes; the local executor disposes.** The model path inside OpenClaw may be cloud or local; the **envelope** is the only actuator input.
2. **Schema validation** rejects unknown fields (`additionalProperties: false`).
3. **No arbitrary strings** passed to `executeCommand`—map through **alias table** to canonical command IDs.
4. **Mutations** require `risk: "high"` flag + UI confirmation unless user policy overrides (OpenClaw policy may **pre-block** high-risk aliases for some users).
5. **Correlation:** each envelope carries `session_id` / `utterance_id` matching OpenClaw session logs for audit.

### 4.2 Canonical Envelope (JSON)

```json
{
  "schema_version": "1.0",
  "session_id": "uuid",
  "utterance_id": "uuid",
  "assistant_text": "Plain language summary for UI/TTS.",
  "confidence": 0.0,
  "actions": [
    {
      "id": "a1",
      "type": "execute_command",
      "risk": "low",
      "alias": "open_scm",
      "args": [],
      "undo_hint": null
    }
  ],
  "telemetry_note": "optional, non-PII"
}
```

### 4.3 Action Types (v1)

| `type` | Fields | Executor behavior |
|--------|--------|-------------------|
| `execute_command` | `alias`, optional validated `args` | Map alias → allowlisted command |
| `show_information_message` | `message`, `modal`? | `window.showInformationMessage` |
| `reveal_uri` | `uri` (workspace-relative) | Resolve via `WorkspaceFolder`, `openTextDocument` |
| `set_editor_selection` | `uri`, `start`, `end` | Validate file in workspace; then selection |
| `request_user_confirm` | `title`, `details` | Blocking confirm before subsequent high-risk actions |
| `noop` | `reason` | Log + show in UI |

### 4.4 Alias Registry (Illustrative — must be version-gated)

Maintained as `command-map.vscode-1.98.json` etc.

```yaml
aliases:
  open_scm:
    commands: ["workbench.view.scm"]
    risk: low
  open_command_palette:
    commands: ["workbench.action.showCommands"]
    risk: low
  git_stage_all:
    commands: ["git.stageAll"]
    risk: medium
  git_commit:
    commands: ["git.commit"]
    risk: high
```

**Version matrix job (CI):** run integration test that `getCommands(true)` contains expected strings for supported VS Code versions; fail build when Microsoft renames commands.

### 4.5 Tool Loop (Optional Provider Feature)

If the realtime API supports **function calling**, expose a single tool:

`vscode_probe_state` → returns JSON snapshot:

```json
{
  "vscode_version": "1.99.0",
  "workspace_folders": [{ "name": "app", "uri": "file:///..." }],
  "git": {
    "repositories": [
      {
        "root": "file:///.../app",
        "head": "refs/heads/feature/waveclick",
        "working_tree_changes": 3,
        "index_changes": 1
      }
    ]
  },
  "active_editor": {
    "uri": "file:///.../src/main.ts",
    "languageId": "typescript",
    "selection": { "start": { "line": 10, "character": 0 }, "end": { "line": 10, "character": 0 } }
  }
}
```

**Never include** file bodies by default.

---

## 5. Security & Threat Model

### 5.1 Assets

- User source code, environment variables in `.env` files, SSH keys on disk (out of scope for direct access).
- API keys in `SecretStorage`.
- Audio stream (sensitive content).

### 5.2 Threats

| Threat | Mitigation |
|--------|------------|
| Prompt injection via file content | OpenClaw + tools return metadata only by default; explicit user consent for file body |
| Malicious workspace runs `.vscode/tasks.json` | Executor does **not** run tasks based on model output unless separate allowlist for tasks (off by default); OpenClaw policy can disable task tools |
| Command injection via `executeCommand` args | Args validated per alias JSON Schema; reject extras |
| **Rogue extension impersonating OpenClaw** | Mutual auth (mTLS or signed JWT) between sidecar and OpenClaw/bridge |
| Sidecar spoofing | HMAC on localhost socket; unix domain socket on macOS/Linux |
| MITM on corporate network | Bridge service with pinned certs; SOCKS proxy support |

### 5.3 Secret Handling

- API keys **never** logged; redact in telemetry.
- Bridge service uses **short-lived session tokens** if keys are centralized.

---

## 6. Observability

### 6.1 Structured Logs (Extension)

Fields:

- `session_id`, `utterance_id`, `action_id`
- `result`: `ok` | `rejected_schema` | `command_error`
- `command_id` (canonical, post-alias resolution)
- `latency_ms` per phase

### 6.2 Telemetry Ethics

- Default **off**; opt-in for anonymous metrics.
- No repository names in payloads when opt-in.

---

## 7. Data Models (TypeScript Interfaces — Normative for Implementers)

```typescript
export type Risk = 'low' | 'medium' | 'high';

export interface WaveClickActionBase {
  id: string;
  type: string;
  risk: Risk;
}

export interface ExecuteCommandAction extends WaveClickActionBase {
  type: 'execute_command';
  alias: string;
  args?: unknown[];
}

export interface AssistantEnvelopeV1 {
  schema_version: '1.0';
  session_id: string;
  utterance_id: string;
  assistant_text: string;
  confidence: number;
  actions: WaveClickActionBase[];
}
```

---

## 8. Compatibility & Release Engineering

### 8.1 Supported VS Code Versions

Policy: support **current stable** and **previous stable** only.

### 8.2 Automated Compatibility Tests

- **Smoke:** activate extension in clean workspace.
- **Git:** create temp repo, stage file, verify executor can run safe commands in test harness (VS Code extension test runner `@vscode/test-electron`).

### 8.3 Packaging

- `vsce` publish pipeline with **prepublish** typecheck + lint + tests.
- Sidecar binaries built per target triple in CI matrix.

---

## 9. OpenClaw (Required Orchestration Layer)

### 9.1 Normative role

**OpenClaw is mandatory.** WaveClick is a **client + executor** for a fixed contract (`AssistantEnvelopeV1`); **all** of the following belong in OpenClaw:

- Session and turn management, including **which** model/realtime API to call.
- **ReAct** (or equivalent) loops, **skills**, and long-lived **MEMORY** / personality files per OpenClaw conventions.
- **Tool** implementations that are **not** VS Code–specific (web search, org KB, ticketing) when enterprise enables them.
- **Policy**: which aliases, vision modes, and auto-run levels are allowed per user/org.

### 9.2 Required OpenClaw artifacts (deliverables)

Ship as versioned package (e.g. npm tarball or Git submodule) consumed by OpenClaw operators:

| Artifact | Purpose |
|----------|---------|
| `workflows/waveclick_session.yaml` (or equivalent) | Defines trigger, steps, tool allowlist; wires **fastest** model/realtime path per env |
| `tools/vscode_probe_state.md` + handler | Returns Git/workspace snapshot JSON |
| `tools/waveclick_emit_envelope.md` + handler | Emits canonical JSON to transport |
| `SKILL.md` | User-facing capability description for the agent |
| Policy templates | Enterprise DLP + rate hints |

### 9.3 Transport binding (implementation-flexible)

The sidecar **must** implement **at least one** supported binding documented in release notes, for example:

1. **WebSocket** to OpenClaw gateway plugin (audio frames + control messages).
2. **HTTPS streaming** upload of audio chunks + SSE/NDJSON for envelopes downstream.

Direct Gemini/OpenAI keys **only** inside OpenClaw configuration—**not** in the VS Code extension.

### 9.4 Developer mock (non-production)

A **`WAVECLICK_MOCK_OPENCLAW=1`** flag may return canned envelopes **for automated tests only**. Release VSIX builds **must** ship with mock **compiled out** or **hard-disabled** unless `package.json` declares a pre-release channel.

### 9.5 Performance validation (required for release)

- CI or release checklist includes a **synthetic latency probe** (mock or staging OpenClaw) asserting envelope delivery under an agreed threshold.
- Major OpenClaw pack bumps that change model routing require **re-benchmarking** Gemini Live vs alternatives for that environment.

---

## 10. Related Documents

- `docsforother/01_GENERAL_PRD.md`  
- `docsforother/03_BACKEND_PRD.md`  
- `docsforother/06_BACKEND_IMPLEMENTATION_STEPS.md`  
- `docsforother/openapi.yaml`  

---

## 11. Sidecar ↔ Extension IPC (Normative Wire Protocol)

### 11.1 Transport

**Primary:** `stdin`/`stdout` **NDJSON** (one JSON object per line, UTF-8). Rationale: trivial to debug; works on all platforms; avoids binary fragility in Extension Host pipes.

**Optional upgrade:** length-prefixed frames (`uint32_be` length + UTF-8 JSON) when messages exceed ~64KB (screenshot metadata).

### 11.2 Envelope Wrapper

Every line:

```json
{
  "v": 1,
  "kind": "request" | "event" | "response" | "error",
  "id": "uuid",
  "method": "string?",
  "payload": {}
}
```

### 11.3 Methods (Extension → Sidecar)

| Method | Payload | Response |
|--------|---------|----------|
| `session.start` | `{ openclawBaseUrl, workflow, authRef, bridgeJwt? }` | `{ sessionHandle }` |
| `session.stop` | `{ sessionHandle }` | `{ ok: true }` |
| `audio.config` | `{ sampleRate, channels, encoding: "pcm_s16le" \| "opus" }` | `{ ok }` |

### 11.4 Events (Sidecar → Extension)

| Event | Payload |
|-------|---------|
| `provider.transcript_partial` | `{ text, utterance_id }` |
| `provider.transcript_final` | `{ text, utterance_id }` |
| `provider.envelope` | `AssistantEnvelopeV1` |
| `provider.audio_out` | `{ encoding, base64 }` (if TTS streamed) |
| `metrics.rtt` | `{ ms }` |

### 11.5 Error Codes

| Code | Meaning | Recoverable |
|------|---------|-------------|
| `E_AUTH` | API key rejected | User must fix key |
| `E_NET` | Transient network | Retry with backoff |
| `E_PROTOCOL` | Provider changed wire format | Update sidecar |
| `E_MIC` | Microphone unavailable | User action |
| `E_POLICY` | Bridge denied vision/session | Show policy UI |
| `E_OPENCLAW` | OpenClaw unreachable or returned error | Check URL, token, OpenClaw logs |

---

## 12. AssistantEnvelope Examples (Non-Normative but Tested Fixtures)

### 12.1 Open SCM Only

```json
{
  "schema_version": "1.0",
  "session_id": "11111111-1111-1111-1111-111111111111",
  "utterance_id": "22222222-2222-2222-2222-222222222222",
  "assistant_text": "Opening the Source Control view so you can stage and commit.",
  "confidence": 0.86,
  "actions": [
    {
      "id": "a1",
      "type": "execute_command",
      "risk": "low",
      "alias": "open_scm",
      "args": []
    }
  ]
}
```

### 12.2 Stage + Commit (High Risk — Confirm)

```json
{
  "schema_version": "1.0",
  "session_id": "11111111-1111-1111-1111-111111111111",
  "utterance_id": "33333333-3333-3333-3333-333333333333",
  "assistant_text": "I can stage all changes and open the commit flow. This will modify Git state.",
  "confidence": 0.71,
  "actions": [
    {
      "id": "a1",
      "type": "request_user_confirm",
      "risk": "high",
      "title": "Stage all changes?",
      "details": "This runs git.stageAll for all repositories in the workspace."
    },
    {
      "id": "a2",
      "type": "execute_command",
      "risk": "high",
      "alias": "git_stage_all",
      "args": []
    }
  ]
}
```

**Executor note:** `a2` must not run until confirmation acknowledges `a1` (or confirm bundles both—choose one pattern and enforce in schema).

---

## 13. VS Code Command Inventory (Starter Set — Verify Per Release)

> **Warning:** IDs drift. Treat this table as **documentation seed data**, not truth. CI must verify against `getCommands(true)`.

| User intent (alias key) | Typical command IDs (examples) | Risk |
|-------------------------|---------------------------------|------|
| `open_scm` | `workbench.view.scm` | low |
| `open_palette` | `workbench.action.showCommands` | low |
| `open_settings_json` | `workbench.action.openSettingsJson` | low |
| `focus_terminal` | `workbench.action.terminal.focus` | low |
| `git_stage_all` | `git.stageAll` | medium |
| `git_commit` | `git.commit` | high |
| `git_sync` | `git.sync` | high |

**Multi-repo:** some Git commands require the **repository handle** in internal APIs; `executeCommand('git.stageAll')` behavior depends on built-in Git extension version. If arguments are required, extend alias map with `arg_schema` keyed by VS Code version.

---

## 14. REST Fallback Path (Degraded Mode)

When **OpenClaw’s realtime model path** is unavailable **but OpenClaw is up**:

1. Sidecar sends **final** transcript or webview text to **OpenClaw** REST/chat endpoint configured in the workflow.
2. OpenClaw returns **single** `AssistantEnvelopeV1` JSON (or tool event equivalent).
3. Executor runs identically to live path.

**Normative:** Fallback is **OpenClaw-internal**; the extension still **never** calls the model vendor directly in production.

**Latency:** higher; **UX:** show “Degraded” pill per `docsforother/07_LOCAL_CURSOR_AND_COMPANION.md` §3.

---

## 15. Internationalization

- Realtime `locale` passed at session start.
- UI strings bundled with `vscode.l10n` where possible.
- Command **aliases** remain English keys internally; user-facing labels localized.

---

## 16. Performance Budgets (Extension Host)

| Operation | Max time (sync section) |
|-----------|-------------------------|
| JSON schema validate envelope | 5 ms |
| Alias resolve + executeCommand | 50 ms (excluding command itself) |
| Webview postMessage batching | coalesce to 60 Hz max |

Avoid `await` on large loops in `activate()`. Offload heavy work to `setImmediate` chunks.

---

## 17. Formal Semantics: Action Ordering & Dependencies

Define optional field on each action:

```json
"requires": ["a1"]
```

Executor builds DAG; rejects cycles. Topological order execution. If `requires` omitted, preserve array order in envelope.

This resolves ambiguities like confirm-before-commit patterns without overloading implicit ordering rules.
