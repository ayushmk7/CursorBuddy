# WaveClick Backend — Bridge + OpenClaw Pack + Shared Contracts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a running, tested WaveClick backend vertical slice: OpenClaw pack (workflow + tools), shared TypeScript/Zod contracts, and a Go bridge service implementing the full `docs/openapi.yaml` API surface.

**Architecture:** OpenClaw is the mandatory orchestrator. The Go bridge is optional enterprise tier between sidecar and OpenClaw — handling JWT/mTLS auth, org policy, rate limiting, audit, and transparent WSS proxy. The `packages/shared` TypeScript package is the single source of truth for `AssistantEnvelopeV1`. The `packages/openclaw-pack` contains YAML/markdown artifacts that operators deploy into their OpenClaw instance.

**Tech Stack:** Go 1.22+ with chi, golang-jwt/jwt v5, gorilla/websocket, go-redis v9, google/uuid, testify; TypeScript 5 + Zod 3 + Vitest; YAML + Markdown (openclaw-pack); Docker Compose (Redis + mock OpenClaw stub for CI).

**Canonical refs:** `docs/02_TECHNICAL_PRD.md §4+9`, `docs/03_BACKEND_PRD.md §3–7`, `docs/openapi.yaml`, `docs/06_BACKEND_IMPLEMENTATION_STEPS.md Phase 0/0.5/1/7`.

---

## File Map

```
# repo root
package.json                      workspace root (npm workspaces)
.env.example                       top-level bridge dev vars
docker-compose.yml                 Redis + mock OpenClaw for local dev/CI
ARCHITECTURE.md                    deployment mode decision + latency plan

packages/
  openclaw-pack/
    package.json                  version + validate script entry
    workflows/
      waveclick_session.yaml      OpenClaw workflow definition
    tools/
      vscode_probe_state.md       tool spec: workspace/Git snapshot
      waveclick_emit_envelope.md  tool spec: validates + emits AssistantEnvelopeV1
    SKILL.md                      user-facing capability description
    policy/
      default.yaml                default DLP rules, vision_allowed, alias overrides
    scripts/
      validate.js                 CI: asserts required files exist + YAML parses

  shared/
    package.json
    tsconfig.json
    vitest.config.ts
    src/
      envelope.ts                 Zod AssistantEnvelopeV1Schema (strict, discriminated)
      command-map.ts              versioned alias map loader
      index.ts                    re-exports
    maps/
      command-map.vscode-1.98.json
      command-map.vscode-1.99.json
    src/__tests__/
      envelope.test.ts            valid + invalid fixture tests
      command-map.test.ts         loader tests

  bridge/
    go.mod                        module github.com/cursorbuddy/bridge
    cmd/bridge/main.go            entrypoint: reads env, wires deps, starts server
    internal/
      config/
        config.go                 env var loading (no external deps)
      api/
        models.go                 request/response structs matching openapi.yaml
        handler.go                HTTP handlers: Health, Policy, CreateSession, Telemetry, AuthRefresh
        handler_test.go           httptest-based unit tests for all handlers
        router.go                 chi router: registers routes + middleware
      auth/
        jwt.go                    JWT HS256/RS256 validate + ephemeral mint
        jwt_test.go               validate valid/invalid/expired tokens
        middleware.go             BearerAuth middleware extracting Claims into context
        middleware_test.go
      proxy/
        websocket.go              transparent WSS proxy: dial upstream, bidirectional copy, idle timeout
        websocket_test.go         mock upstream WSS server test
      ratelimit/
        bucket.go                 Redis token bucket: Allow(key) bool
        bucket_test.go            mock Redis client test
      dlp/
        redact.go                 regex pipeline: email, AKIA, PEM, OpenAI, Google keys
        redact_test.go
```

---

## Task 0: Environment + Monorepo Scaffold

**Files:**
- Create: `package.json` (root)
- Create: `.gitignore` additions
- Create: `packages/` directory structure stubs

- [ ] **Step 0.1: Install Go via Homebrew**

```bash
brew install go
```
Expected: Go 1.22+ installed. Verify: `go version` → `go version go1.22.x darwin/arm64` (or amd64).

- [ ] **Step 0.2: Verify Go is on PATH**

```bash
export PATH="$(brew --prefix)/bin:$PATH"
go version
```
Expected output: `go version go1.2x.x darwin/...`

- [ ] **Step 0.3: Create root `package.json`**

Create `/Users/ayush/Downloads/My Projects/CursorBuddy/package.json`:

```json
{
  "name": "waveclick",
  "private": true,
  "workspaces": [
    "packages/openclaw-pack",
    "packages/shared"
  ],
  "scripts": {
    "test:shared": "npm test --workspace=packages/shared",
    "test:pack": "npm test --workspace=packages/openclaw-pack",
    "test": "npm run test:pack && npm run test:shared"
  }
}
```

- [ ] **Step 0.4: Update `.gitignore`**

Append to `/Users/ayush/Downloads/My Projects/CursorBuddy/.gitignore` (create if missing):

```gitignore
# Go
packages/bridge/bin/
packages/bridge/dist/
*.test.bin

# Node
node_modules/
packages/*/node_modules/
packages/*/dist/

# Env
.env
.env.local

# macOS
.DS_Store
```

- [ ] **Step 0.5: Create directory stubs**

```bash
mkdir -p packages/openclaw-pack/workflows
mkdir -p packages/openclaw-pack/tools
mkdir -p packages/openclaw-pack/policy
mkdir -p packages/openclaw-pack/scripts
mkdir -p packages/shared/src/__tests__
mkdir -p packages/shared/maps
mkdir -p packages/bridge/cmd/bridge
mkdir -p packages/bridge/internal/config
mkdir -p packages/bridge/internal/api
mkdir -p packages/bridge/internal/auth
mkdir -p packages/bridge/internal/proxy
mkdir -p packages/bridge/internal/ratelimit
mkdir -p packages/bridge/internal/dlp
```

- [ ] **Step 0.6: Commit scaffold**

```bash
git add package.json .gitignore packages/
git commit -m "chore: monorepo scaffold + directory structure"
```

---

## Task 1: packages/openclaw-pack

**Files:**
- Create: `packages/openclaw-pack/package.json`
- Create: `packages/openclaw-pack/workflows/waveclick_session.yaml`
- Create: `packages/openclaw-pack/tools/vscode_probe_state.md`
- Create: `packages/openclaw-pack/tools/waveclick_emit_envelope.md`
- Create: `packages/openclaw-pack/SKILL.md`
- Create: `packages/openclaw-pack/policy/default.yaml`
- Create: `packages/openclaw-pack/scripts/validate.js`

- [ ] **Step 1.1: Create `packages/openclaw-pack/package.json`**

```json
{
  "name": "@waveclick/openclaw-pack",
  "version": "0.4.0",
  "private": true,
  "scripts": {
    "test": "node scripts/validate.js",
    "validate": "node scripts/validate.js"
  }
}
```

- [ ] **Step 1.2: Create `packages/openclaw-pack/workflows/waveclick_session.yaml`**

```yaml
# WaveClick OpenClaw workflow definition
# Deploy this file into your OpenClaw instance's workflow registry.
# OpenClaw is the mandatory orchestrator — never bypass it for model calls.
name: waveclick_session
version: "0.4.0"
description: >
  Realtime voice/text session for WaveClick VS Code companion.
  Ingests audio or text from the sidecar, runs a ReAct agent loop using
  configured model path (fastest per env benchmark), and emits AssistantEnvelopeV1.

trigger:
  type: sidecar_connect
  # Also supports: webhook (for bridge-initiated sessions)

memory:
  soul: SOUL.md      # personality + safety constraints
  skill: SKILL.md    # capability description surfaced to the agent
  # MEMORY.md: per-user session memory (optional, operator-configured)

steps:
  - id: ingest
    type: audio_or_text
    description: Accept PCM/Opus frames or text turns from sidecar transport.
    config:
      vad_threshold: 0.5          # Voice Activity Detection threshold
      end_of_turn_silence_ms: 800 # ms of silence to finalize a turn

  - id: probe_state
    type: tool_call
    tool: vscode_probe_state
    description: >
      Gather VS Code workspace and Git snapshot. Called on first turn and
      whenever the agent decides it needs updated editor context.
    config:
      include_git: true
      include_active_editor: true
      include_file_body: false    # NEVER include file body by default

  - id: agent_loop
    type: react
    description: >
      ReAct-style reasoning loop. The model receives: transcript + workspace
      snapshot. It may call tools (vscode_probe_state, web search if org enables)
      and produces a final AssistantEnvelopeV1 via waveclick_emit_envelope.
    model_selection:
      strategy: fastest_benchmarked  # OpenClaw selects: Gemini Live, OpenAI Realtime, REST fallback
      tier_hint_from_client: true     # respect desired_model_tier_hint from session mint
      fallback: rest_small            # if realtime path down, use fastest small REST model
    max_iterations: 8
    tools:
      - vscode_probe_state
      - waveclick_emit_envelope
    guardrails:
      - no_file_body_without_consent
      - no_arbitrary_command_strings  # envelope alias must be in allowlist
      - confirm_high_risk_before_emit

  - id: emit
    type: tool_call
    tool: waveclick_emit_envelope
    description: Final step — validate and emit AssistantEnvelopeV1 to sidecar transport.

policy:
  vision_allowed: false           # operator can override per org
  max_session_minutes: 30
  fallback_mode: rest             # "none" to hard-fail on realtime unavailability
```

- [ ] **Step 1.3: Create `packages/openclaw-pack/tools/vscode_probe_state.md`**

```markdown
# Tool: vscode_probe_state

**Purpose:** Returns a structured JSON snapshot of the VS Code workspace and Git state.
Called by the WaveClick agent when it needs editor context. Never returns file bodies
by default — only metadata.

## Input schema

```json
{
  "include_git": true,
  "include_active_editor": true,
  "include_file_body": false
}
```

## Output schema

```json
{
  "vscode_version": "1.99.0",
  "workspace_folders": [
    { "name": "app", "uri": "file:///workspace/app" }
  ],
  "git": {
    "repositories": [
      {
        "root": "file:///workspace/app",
        "head": "refs/heads/feature/waveclick",
        "working_tree_changes": 3,
        "index_changes": 1,
        "remotes": ["origin"]
      }
    ]
  },
  "active_editor": {
    "uri": "file:///workspace/app/src/main.ts",
    "languageId": "typescript",
    "selection": {
      "start": { "line": 10, "character": 0 },
      "end": { "line": 10, "character": 0 }
    }
  }
}
```

## Security constraints

- `include_file_body: true` requires explicit user consent granted in the session.
- URIs returned are workspace-relative resolvable; absolute paths must not be logged.
- Git remote URLs must not be logged in telemetry (may contain credentials).

## Handler location

Implement the handler in the VS Code extension (`packages/extension/src/adapters/WorkspaceAdapter.ts`
+ `GitAdapter.ts`). The sidecar exposes it as an RPC method; OpenClaw calls via sidecar transport.
```

- [ ] **Step 1.4: Create `packages/openclaw-pack/tools/waveclick_emit_envelope.md`**

```markdown
# Tool: waveclick_emit_envelope

**Purpose:** Validates an `AssistantEnvelopeV1` JSON object and emits it to the sidecar
transport for the extension's Action Executor. This is the *only* actuator contract.

## Input schema (AssistantEnvelopeV1)

```json
{
  "schema_version": "1.0",
  "session_id": "<uuid matching current session>",
  "utterance_id": "<uuid for this turn>",
  "assistant_text": "Plain language summary shown in UI and optionally spoken via TTS.",
  "confidence": 0.0,
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

## Validation rules (fail closed on any violation)

1. `schema_version` must equal `"1.0"`.
2. `session_id` must match the current OpenClaw session handle.
3. All `action.id` values must be unique within the envelope.
4. `action.type` must be one of: `execute_command`, `show_information_message`,
   `reveal_uri`, `set_editor_selection`, `request_user_confirm`, `noop`.
5. `action.risk` must be one of: `low`, `medium`, `high`.
6. For `execute_command`: `alias` must be a non-empty string. OpenClaw does NOT verify
   the alias is in the allowlist — that check happens in the extension. OpenClaw MUST NOT
   pass arbitrary command ID strings as the alias value.
7. No additional properties allowed (`additionalProperties: false`).
8. Envelopes with `risk: "high"` actions MUST include a preceding `request_user_confirm`
   action in the same envelope (or the agent must have received user confirmation via
   `confirm_high_risk_before_emit` guardrail).

## Emission

On validation success: serialize JSON to sidecar transport (WebSocket or HTTPS SSE).
On validation failure: return error to agent loop; do NOT emit partial envelopes.

## Related

- TypeScript Zod schema: `packages/shared/src/envelope.ts`
- Executor: `packages/extension/src/executor/ActionExecutor.ts` (local runtime)
```

- [ ] **Step 1.5: Create `packages/openclaw-pack/SKILL.md`**

```markdown
# WaveClick — VS Code Companion Skill

I help you navigate Visual Studio Code using voice or text commands. I know your current
editor state, open files, and Git repository status, so my guidance is grounded in what's
actually on your screen — not guesswork.

## What I can do

- **Navigate** to Source Control, Terminal, Settings, Extensions, and other views
- **Explain** Git workflows (staging, committing, branching, merging) in the context
  of your actual repository
- **Execute safe commands** (open views, reveal files) automatically
- **Guide mutating operations** (stage, commit, push) with confirmation before acting
- **Probe your workspace** to give accurate, repo-specific answers

## What I will not do without your confirmation

- Stage files or run `git commit` / `git push` without showing you what will change
- Open, read, or transmit file contents without your explicit request per session
- Take actions in repositories other than the one you are asking about

## Limitations

- I rely on the VS Code built-in Git extension; if it is disabled, Git operations
  will be limited.
- In Remote SSH / WSL / Dev Container workspaces, voice input may not be available
  (text input is always an option).
- I cannot control third-party webview panels or custom SCM providers.

## Safety

All editor actions come from me (OpenClaw) as a validated `AssistantEnvelopeV1`.
The extension verifies the envelope schema and checks commands against a security
allowlist before executing anything.
```

- [ ] **Step 1.6: Create `packages/openclaw-pack/policy/default.yaml`**

```yaml
# Default org policy for WaveClick sessions.
# OpenClaw operators: copy this file and override values per org.
version: "0.4.0"

vision:
  allowed: false          # Set true + add consent banner to enable screenshot-once mode
  max_pixels: 1048576     # 1 MP cap when enabled

session:
  max_minutes: 30
  idle_timeout_minutes: 5

rate_limits:
  sessions_per_minute_burst: 5
  sessions_per_hour_sustain: 30

fallback_mode: rest        # "none" = hard-fail on realtime unavailability

dlp:
  enabled: true
  rules:
    - pattern: "[a-zA-Z0-9._%+\\-]+@[a-zA-Z0-9.\\-]+\\.[a-zA-Z]{2,}"
      replacement: "[REDACTED_EMAIL]"
    - pattern: "AKIA[0-9A-Z]{16}"
      replacement: "[REDACTED_AKIA]"
    - pattern: "sk-[A-Za-z0-9]{20,}"
      replacement: "[REDACTED_OPENAI]"
    - pattern: "AIza[0-9A-Za-z_\\-]{20,}"
      replacement: "[REDACTED_GOOGLE]"

command_alias_overrides: {}  # org can restrict/override the default alias allowlist
```

- [ ] **Step 1.7: Create `packages/openclaw-pack/scripts/validate.js`**

```js
#!/usr/bin/env node
// CI validator: checks required files exist and YAML files parse without error.
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");

const REQUIRED = [
  "workflows/waveclick_session.yaml",
  "tools/vscode_probe_state.md",
  "tools/waveclick_emit_envelope.md",
  "SKILL.md",
  "policy/default.yaml",
];

let ok = true;

for (const rel of REQUIRED) {
  const full = path.join(root, rel);
  if (!fs.existsSync(full)) {
    console.error(`MISSING: ${rel}`);
    ok = false;
  } else {
    console.log(`OK: ${rel}`);
  }
}

// Basic YAML syntax check (no deps — just look for tab indentation which breaks YAML)
const yamls = REQUIRED.filter((f) => f.endsWith(".yaml"));
for (const rel of yamls) {
  const content = fs.readFileSync(path.join(root, rel), "utf8");
  const lines = content.split("\n");
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith("\t")) {
      console.error(`YAML TAB at ${rel}:${i + 1}`);
      ok = false;
    }
  }
}

if (!ok) {
  process.exit(1);
}
console.log("\nAll openclaw-pack checks passed.");
```

- [ ] **Step 1.8: Run the validator**

```bash
cd packages/openclaw-pack && node scripts/validate.js
```
Expected output:
```
OK: workflows/waveclick_session.yaml
OK: tools/vscode_probe_state.md
OK: tools/waveclick_emit_envelope.md
OK: SKILL.md
OK: policy/default.yaml

All openclaw-pack checks passed.
```

- [ ] **Step 1.9: Commit**

```bash
cd /path/to/repo/root
git add packages/openclaw-pack/
git commit -m "feat(openclaw-pack): workflow, tool specs, SKILL.md, default policy"
```

---

## Task 2: packages/shared — AssistantEnvelopeV1 Zod Contracts

**Files:**
- Create: `packages/shared/package.json`
- Create: `packages/shared/tsconfig.json`
- Create: `packages/shared/vitest.config.ts`
- Create: `packages/shared/src/__tests__/envelope.test.ts` (write first)
- Create: `packages/shared/src/envelope.ts`
- Create: `packages/shared/src/__tests__/command-map.test.ts` (write first)
- Create: `packages/shared/src/command-map.ts`
- Create: `packages/shared/maps/command-map.vscode-1.98.json`
- Create: `packages/shared/maps/command-map.vscode-1.99.json`
- Create: `packages/shared/src/index.ts`

- [ ] **Step 2.1: Create `packages/shared/package.json`**

```json
{
  "name": "@waveclick/shared",
  "version": "0.4.0",
  "private": true,
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "build": "tsc"
  },
  "dependencies": {
    "zod": "^3.23.0"
  },
  "devDependencies": {
    "typescript": "^5.4.0",
    "vitest": "^1.6.0",
    "@types/node": "^20.0.0"
  }
}
```

- [ ] **Step 2.2: Install dependencies**

```bash
cd packages/shared && npm install
```
Expected: node_modules created, no vulnerabilities.

- [ ] **Step 2.3: Create `packages/shared/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "CommonJS",
    "lib": ["ES2022"],
    "strict": true,
    "outDir": "dist",
    "rootDir": "src",
    "declaration": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 2.4: Create `packages/shared/vitest.config.ts`**

```typescript
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: false,
    include: ["src/__tests__/**/*.test.ts"],
  },
});
```

- [ ] **Step 2.5: Write FAILING envelope tests first (TDD)**

Create `packages/shared/src/__tests__/envelope.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import {
  AssistantEnvelopeV1Schema,
  type AssistantEnvelopeV1,
} from "../envelope";

const VALID_ENVELOPE: AssistantEnvelopeV1 = {
  schema_version: "1.0",
  session_id: "11111111-1111-1111-1111-111111111111",
  utterance_id: "22222222-2222-2222-2222-222222222222",
  assistant_text: "Opening the Source Control view.",
  confidence: 0.86,
  actions: [
    {
      id: "a1",
      type: "execute_command",
      risk: "low",
      alias: "open_scm",
      args: [],
    },
  ],
};

describe("AssistantEnvelopeV1Schema", () => {
  it("accepts a valid low-risk envelope", () => {
    const result = AssistantEnvelopeV1Schema.safeParse(VALID_ENVELOPE);
    expect(result.success).toBe(true);
  });

  it("accepts a high-risk envelope with confirm action", () => {
    const env: AssistantEnvelopeV1 = {
      ...VALID_ENVELOPE,
      utterance_id: "33333333-3333-3333-3333-333333333333",
      actions: [
        {
          id: "a1",
          type: "request_user_confirm",
          risk: "high",
          title: "Stage all changes?",
          details: "Runs git.stageAll.",
        },
        {
          id: "a2",
          type: "execute_command",
          risk: "high",
          alias: "git_stage_all",
          args: [],
        },
      ],
    };
    const result = AssistantEnvelopeV1Schema.safeParse(env);
    expect(result.success).toBe(true);
  });

  it("rejects schema_version !== '1.0'", () => {
    const bad = { ...VALID_ENVELOPE, schema_version: "2.0" };
    expect(AssistantEnvelopeV1Schema.safeParse(bad).success).toBe(false);
  });

  it("rejects extra top-level properties", () => {
    const bad = { ...VALID_ENVELOPE, foo: "bar" };
    expect(AssistantEnvelopeV1Schema.safeParse(bad).success).toBe(false);
  });

  it("rejects duplicate action ids", () => {
    const bad: AssistantEnvelopeV1 = {
      ...VALID_ENVELOPE,
      actions: [
        { id: "a1", type: "noop", risk: "low", reason: "test" },
        { id: "a1", type: "noop", risk: "low", reason: "dup" },
      ],
    };
    expect(AssistantEnvelopeV1Schema.safeParse(bad).success).toBe(false);
  });

  it("rejects unknown action type", () => {
    const bad = {
      ...VALID_ENVELOPE,
      actions: [{ id: "a1", type: "rm_rf", risk: "low" }],
    };
    expect(AssistantEnvelopeV1Schema.safeParse(bad).success).toBe(false);
  });

  it("rejects empty actions array", () => {
    // Actions must have at least 1 item
    const bad = { ...VALID_ENVELOPE, actions: [] };
    expect(AssistantEnvelopeV1Schema.safeParse(bad).success).toBe(false);
  });

  it("rejects missing required fields", () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { session_id, ...bad } = VALID_ENVELOPE;
    expect(AssistantEnvelopeV1Schema.safeParse(bad).success).toBe(false);
  });
});
```

- [ ] **Step 2.6: Run tests — confirm they FAIL**

```bash
cd packages/shared && npm test
```
Expected: `Cannot find module '../envelope'` or similar import error.

- [ ] **Step 2.7: Implement `packages/shared/src/envelope.ts`**

```typescript
import { z } from "zod";

// ─── Risk ────────────────────────────────────────────────────────────────────
export const RiskSchema = z.enum(["low", "medium", "high"]);
export type Risk = z.infer<typeof RiskSchema>;

// ─── Action base ─────────────────────────────────────────────────────────────
const ActionBaseSchema = z.object({
  id: z.string().min(1),
  risk: RiskSchema,
});

// ─── Action variants ─────────────────────────────────────────────────────────
const ExecuteCommandActionSchema = ActionBaseSchema.extend({
  type: z.literal("execute_command"),
  alias: z.string().min(1),
  args: z.array(z.unknown()).optional(),
}).strict();

const ShowInformationMessageActionSchema = ActionBaseSchema.extend({
  type: z.literal("show_information_message"),
  message: z.string().min(1),
  modal: z.boolean().optional(),
}).strict();

const RevealUriActionSchema = ActionBaseSchema.extend({
  type: z.literal("reveal_uri"),
  uri: z.string().min(1),
}).strict();

const SetEditorSelectionActionSchema = ActionBaseSchema.extend({
  type: z.literal("set_editor_selection"),
  uri: z.string().min(1),
  start: z.object({ line: z.number().int().min(0), character: z.number().int().min(0) }),
  end: z.object({ line: z.number().int().min(0), character: z.number().int().min(0) }),
}).strict();

const RequestUserConfirmActionSchema = ActionBaseSchema.extend({
  type: z.literal("request_user_confirm"),
  title: z.string().min(1),
  details: z.string().optional(),
}).strict();

const NoopActionSchema = ActionBaseSchema.extend({
  type: z.literal("noop"),
  reason: z.string().optional(),
}).strict();

export const ActionSchema = z.discriminatedUnion("type", [
  ExecuteCommandActionSchema,
  ShowInformationMessageActionSchema,
  RevealUriActionSchema,
  SetEditorSelectionActionSchema,
  RequestUserConfirmActionSchema,
  NoopActionSchema,
]);

export type WaveClickAction = z.infer<typeof ActionSchema>;

// ─── Envelope ─────────────────────────────────────────────────────────────────
export const AssistantEnvelopeV1Schema = z
  .object({
    schema_version: z.literal("1.0"),
    session_id: z.string().uuid(),
    utterance_id: z.string().uuid(),
    assistant_text: z.string(),
    confidence: z.number().min(0).max(1),
    actions: z.array(ActionSchema).min(1),
    telemetry_note: z.string().optional(),
  })
  .strict()
  .superRefine((env, ctx) => {
    // Reject duplicate action IDs
    const ids = env.actions.map((a) => a.id);
    const seen = new Set<string>();
    for (const id of ids) {
      if (seen.has(id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Duplicate action id: ${id}`,
          path: ["actions"],
        });
        return;
      }
      seen.add(id);
    }
  });

export type AssistantEnvelopeV1 = z.infer<typeof AssistantEnvelopeV1Schema>;
```

- [ ] **Step 2.8: Run envelope tests — confirm PASS**

```bash
cd packages/shared && npm test -- --reporter=verbose
```
Expected: All 8 tests pass. `Test Files  1 passed`.

- [ ] **Step 2.9: Write FAILING command-map tests (TDD)**

Create `packages/shared/src/__tests__/command-map.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import * as path from "path";
import { loadCommandMap, resolveAlias, type CommandEntry } from "../command-map";

const MAPS_DIR = path.resolve(__dirname, "../../maps");

describe("loadCommandMap", () => {
  it("loads vscode-1.98 map without throwing", () => {
    const map = loadCommandMap("1.98.0", MAPS_DIR);
    expect(map).toBeDefined();
    expect(typeof map).toBe("object");
  });

  it("loads vscode-1.99 map without throwing", () => {
    const map = loadCommandMap("1.99.0", MAPS_DIR);
    expect(map).toBeDefined();
  });

  it("falls back to nearest lower version when exact version missing", () => {
    // 1.100.0 doesn't exist, should fall back to 1.99
    const map = loadCommandMap("1.100.0", MAPS_DIR);
    expect(map).toBeDefined();
  });

  it("throws when no maps available at all for very old version", () => {
    expect(() => loadCommandMap("0.1.0", MAPS_DIR)).toThrow();
  });
});

describe("resolveAlias", () => {
  it("resolves open_scm alias to a command entry", () => {
    const map = loadCommandMap("1.99.0", MAPS_DIR);
    const entry: CommandEntry = resolveAlias(map, "open_scm");
    expect(entry).toBeDefined();
    expect(entry.commands).toContain("workbench.view.scm");
    expect(entry.risk).toBe("low");
  });

  it("throws CommandNotAllowed for unknown alias", () => {
    const map = loadCommandMap("1.99.0", MAPS_DIR);
    expect(() => resolveAlias(map, "rm_rf")).toThrow("CommandNotAllowed");
  });
});
```

- [ ] **Step 2.10: Run — confirm FAIL**

```bash
cd packages/shared && npm test
```
Expected: `Cannot find module '../command-map'`.

- [ ] **Step 2.11: Create `packages/shared/maps/command-map.vscode-1.98.json`**

```json
{
  "version": "1.98",
  "aliases": {
    "open_scm": {
      "commands": ["workbench.view.scm"],
      "risk": "low",
      "description": "Open Source Control view"
    },
    "open_palette": {
      "commands": ["workbench.action.showCommands"],
      "risk": "low",
      "description": "Open Command Palette"
    },
    "open_settings_json": {
      "commands": ["workbench.action.openSettingsJson"],
      "risk": "low",
      "description": "Open settings.json"
    },
    "focus_terminal": {
      "commands": ["workbench.action.terminal.focus"],
      "risk": "low",
      "description": "Focus integrated terminal"
    },
    "git_stage_all": {
      "commands": ["git.stageAll"],
      "risk": "medium",
      "description": "Stage all changes in all repos"
    },
    "git_commit": {
      "commands": ["git.commit"],
      "risk": "high",
      "description": "Open commit input and commit"
    },
    "git_sync": {
      "commands": ["git.sync"],
      "risk": "high",
      "description": "Sync (pull + push) current branch"
    }
  }
}
```

- [ ] **Step 2.12: Create `packages/shared/maps/command-map.vscode-1.99.json`**

```json
{
  "version": "1.99",
  "aliases": {
    "open_scm": {
      "commands": ["workbench.view.scm"],
      "risk": "low",
      "description": "Open Source Control view"
    },
    "open_palette": {
      "commands": ["workbench.action.showCommands"],
      "risk": "low",
      "description": "Open Command Palette"
    },
    "open_settings_json": {
      "commands": ["workbench.action.openSettingsJson"],
      "risk": "low",
      "description": "Open settings.json"
    },
    "focus_terminal": {
      "commands": ["workbench.action.terminal.focus"],
      "risk": "low",
      "description": "Focus integrated terminal"
    },
    "git_stage_all": {
      "commands": ["git.stageAll"],
      "risk": "medium",
      "description": "Stage all changes in all repos"
    },
    "git_commit": {
      "commands": ["git.commit"],
      "risk": "high",
      "description": "Open commit input and commit"
    },
    "git_sync": {
      "commands": ["git.sync"],
      "risk": "high",
      "description": "Sync (pull + push) current branch"
    }
  }
}
```

- [ ] **Step 2.13: Implement `packages/shared/src/command-map.ts`**

```typescript
import * as fs from "fs";
import * as path from "path";

export interface CommandEntry {
  commands: string[];
  risk: "low" | "medium" | "high";
  description?: string;
}

export interface CommandMap {
  version: string;
  aliases: Record<string, CommandEntry>;
}

export class CommandNotAllowed extends Error {
  constructor(alias: string) {
    super(`CommandNotAllowed: alias "${alias}" is not in the command map`);
    this.name = "CommandNotAllowed";
  }
}

/**
 * Load the command map for the given VS Code version.
 * Selects the map file with the highest version <= vsCodeVersion.
 * Throws if no suitable map exists.
 */
export function loadCommandMap(vsCodeVersion: string, mapsDir: string): CommandMap {
  const files = fs.readdirSync(mapsDir).filter((f) => f.startsWith("command-map.vscode-") && f.endsWith(".json"));

  // Parse versions from filenames
  const entries = files.map((f) => {
    const match = f.match(/command-map\.vscode-(\d+\.\d+)\.json/);
    return match ? { file: f, ver: match[1] } : null;
  }).filter(Boolean) as { file: string; ver: string }[];

  if (entries.length === 0) throw new Error("No command maps found in " + mapsDir);

  // Pick highest version <= vsCodeVersion
  const [reqMaj, reqMin] = vsCodeVersion.split(".").map(Number);

  const candidates = entries
    .filter(({ ver }) => {
      const [maj, min] = ver.split(".").map(Number);
      return maj < reqMaj || (maj === reqMaj && min <= reqMin);
    })
    .sort((a, b) => {
      const [am, an] = a.ver.split(".").map(Number);
      const [bm, bn] = b.ver.split(".").map(Number);
      return bm - am || bn - an; // descending
    });

  if (candidates.length === 0) {
    throw new Error(`No command map available for VS Code ${vsCodeVersion}`);
  }

  const chosen = path.join(mapsDir, candidates[0].file);
  return JSON.parse(fs.readFileSync(chosen, "utf8")) as CommandMap;
}

/**
 * Resolve an alias from a loaded CommandMap.
 * Throws CommandNotAllowed if alias is not in the map.
 */
export function resolveAlias(map: CommandMap, alias: string): CommandEntry {
  const entry = map.aliases[alias];
  if (!entry) throw new CommandNotAllowed(alias);
  return entry;
}
```

- [ ] **Step 2.14: Create `packages/shared/src/index.ts`**

```typescript
export * from "./envelope";
export * from "./command-map";
```

- [ ] **Step 2.15: Run ALL tests — confirm PASS**

```bash
cd packages/shared && npm test -- --reporter=verbose
```
Expected:
```
✓ src/__tests__/envelope.test.ts (8)
✓ src/__tests__/command-map.test.ts (6)
Test Files  2 passed (2)
Tests  14 passed (14)
```

- [ ] **Step 2.16: Commit**

```bash
cd /path/to/repo/root
git add packages/shared/
git commit -m "feat(shared): AssistantEnvelopeV1 Zod schema + versioned command maps"
```

---

## Task 3: packages/bridge — Go module + config + DLP

**Files:**
- Create: `packages/bridge/go.mod`
- Create: `packages/bridge/internal/config/config.go`
- Create: `packages/bridge/internal/dlp/redact.go`
- Create: `packages/bridge/internal/dlp/redact_test.go`

- [ ] **Step 3.1: Initialize Go module**

```bash
cd packages/bridge
go mod init github.com/cursorbuddy/bridge
```
Expected: `go.mod` created with `module github.com/cursorbuddy/bridge` and `go 1.22`.

- [ ] **Step 3.2: Write FAILING DLP tests (TDD)**

Create `packages/bridge/internal/dlp/redact_test.go`:

```go
package dlp_test

import (
	"testing"

	"github.com/cursorbuddy/bridge/internal/dlp"
)

func TestRedact(t *testing.T) {
	tests := []struct {
		name  string
		input string
		want  string
	}{
		{
			name:  "redacts email",
			input: "Contact user@example.com for help",
			want:  "Contact [REDACTED_EMAIL] for help",
		},
		{
			name:  "redacts AWS key",
			input: "Key: AKIAIOSFODNN7EXAMPLE",
			want:  "Key: [REDACTED_AKIA]",
		},
		{
			name:  "redacts OpenAI key",
			input: "token=sk-abcdefghijklmnopqrstu",
			want:  "token=[REDACTED_OPENAI]",
		},
		{
			name:  "redacts Google API key",
			input: "key=AIzaSyD-abcdefghijklmnopqrst",
			want:  "key=[REDACTED_GOOGLE]",
		},
		{
			name:  "passes clean text",
			input: "Open the source control view",
			want:  "Open the source control view",
		},
		{
			name:  "handles empty string",
			input: "",
			want:  "",
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			got := dlp.Redact(tc.input)
			if got != tc.want {
				t.Errorf("Redact(%q) = %q; want %q", tc.input, got, tc.want)
			}
		})
	}
}
```

- [ ] **Step 3.3: Run DLP tests — confirm FAIL**

```bash
cd packages/bridge && go test ./internal/dlp/...
```
Expected: `cannot find package "github.com/cursorbuddy/bridge/internal/dlp"`.

- [ ] **Step 3.4: Implement `packages/bridge/internal/dlp/redact.go`**

```go
package dlp

import "regexp"

type rule struct {
	re          *regexp.Regexp
	replacement string
}

// rules is the ordered DLP pipeline. Applied sequentially.
var rules = []rule{
	{
		re:          regexp.MustCompile(`AKIA[0-9A-Z]{16}`),
		replacement: "[REDACTED_AKIA]",
	},
	{
		re:          regexp.MustCompile(`sk-[A-Za-z0-9]{20,}`),
		replacement: "[REDACTED_OPENAI]",
	},
	{
		re:          regexp.MustCompile(`AIza[0-9A-Za-z_\-]{20,}`),
		replacement: "[REDACTED_GOOGLE]",
	},
	{
		// PEM blocks (multi-line handled via (?s) flag)
		re:          regexp.MustCompile(`(?s)-----BEGIN [A-Z ]+-----.*?-----END [A-Z ]+-----`),
		replacement: "[REDACTED_PEM]",
	},
	{
		re:          regexp.MustCompile(`[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}`),
		replacement: "[REDACTED_EMAIL]",
	},
}

// Redact applies all DLP patterns to text and returns sanitized output.
// Order matters: specific patterns (AKIA, sk-) before generic ones (email).
func Redact(text string) string {
	for _, r := range rules {
		text = r.re.ReplaceAllString(text, r.replacement)
	}
	return text
}
```

- [ ] **Step 3.5: Run DLP tests — confirm PASS**

```bash
cd packages/bridge && go test ./internal/dlp/... -v
```
Expected:
```
--- PASS: TestRedact/redacts_email
--- PASS: TestRedact/redacts_AWS_key
--- PASS: TestRedact/redacts_OpenAI_key
--- PASS: TestRedact/redacts_Google_API_key
--- PASS: TestRedact/passes_clean_text
--- PASS: TestRedact/handles_empty_string
PASS
```

- [ ] **Step 3.6: Create `packages/bridge/internal/config/config.go`**

```go
package config

import (
	"fmt"
	"os"
	"strconv"
)

// Config holds all bridge runtime configuration loaded from environment variables.
type Config struct {
	Listen             string // BRIDGE_LISTEN, default 127.0.0.1:8787
	OpenClawUpstreamURL string // OPENCLAW_UPSTREAM_URL, required
	OpenClawServiceToken string // OPENCLAW_SERVICE_TOKEN, required
	RedisURL           string // REDIS_URL, default redis://localhost:6379
	JWTIssuer          string // JWT_ISSUER, required
	JWTSecret          string // JWT_SECRET, required for HS256 dev mode
	LogLevel           string // LOG_LEVEL, default info
	Version            string // injected at build time via -ldflags
	MaxSessionMinutes  int    // MAX_SESSION_MINUTES, default 30
}

// Load reads configuration from environment variables.
// Returns an error listing all missing required variables.
func Load() (*Config, error) {
	c := &Config{
		Listen:            getEnvOrDefault("BRIDGE_LISTEN", "127.0.0.1:8787"),
		RedisURL:          getEnvOrDefault("REDIS_URL", "redis://localhost:6379"),
		LogLevel:          getEnvOrDefault("LOG_LEVEL", "info"),
		MaxSessionMinutes: getEnvIntOrDefault("MAX_SESSION_MINUTES", 30),
		Version:           getEnvOrDefault("BRIDGE_VERSION", "dev"),
	}

	var missing []string
	c.OpenClawUpstreamURL = os.Getenv("OPENCLAW_UPSTREAM_URL")
	if c.OpenClawUpstreamURL == "" {
		missing = append(missing, "OPENCLAW_UPSTREAM_URL")
	}
	c.OpenClawServiceToken = os.Getenv("OPENCLAW_SERVICE_TOKEN")
	if c.OpenClawServiceToken == "" {
		missing = append(missing, "OPENCLAW_SERVICE_TOKEN")
	}
	c.JWTIssuer = os.Getenv("JWT_ISSUER")
	if c.JWTIssuer == "" {
		missing = append(missing, "JWT_ISSUER")
	}
	c.JWTSecret = os.Getenv("JWT_SECRET")
	if c.JWTSecret == "" {
		missing = append(missing, "JWT_SECRET")
	}

	if len(missing) > 0 {
		return nil, fmt.Errorf("missing required env vars: %v", missing)
	}
	return c, nil
}

func getEnvOrDefault(key, def string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return def
}

func getEnvIntOrDefault(key string, def int) int {
	if v := os.Getenv(key); v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			return n
		}
	}
	return def
}
```

- [ ] **Step 3.7: Commit DLP + config**

```bash
cd /path/to/repo/root
git add packages/bridge/go.mod packages/bridge/internal/
git commit -m "feat(bridge): Go module, DLP redaction, config loader"
```

---

## Task 4: packages/bridge — JWT Auth

**Files:**
- Create: `packages/bridge/internal/auth/jwt.go`
- Create: `packages/bridge/internal/auth/jwt_test.go`
- Create: `packages/bridge/internal/auth/middleware.go`
- Create: `packages/bridge/internal/auth/middleware_test.go`

- [ ] **Step 4.1: Add JWT dependency**

```bash
cd packages/bridge && go get github.com/golang-jwt/jwt/v5
```

- [ ] **Step 4.2: Write FAILING JWT tests (TDD)**

Create `packages/bridge/internal/auth/jwt_test.go`:

```go
package auth_test

import (
	"testing"
	"time"

	"github.com/cursorbuddy/bridge/internal/auth"
)

const testSecret = "test-secret-at-least-32-bytes-long!!"

func TestValidator(t *testing.T) {
	v := auth.NewValidator(testSecret)

	t.Run("validates a freshly minted token", func(t *testing.T) {
		token, err := auth.MintToken(testSecret, "user-1", "acme", 10*time.Minute)
		if err != nil {
			t.Fatalf("MintToken error: %v", err)
		}
		claims, err := v.Validate(token)
		if err != nil {
			t.Fatalf("Validate error: %v", err)
		}
		if claims.Sub != "user-1" {
			t.Errorf("got Sub=%q want user-1", claims.Sub)
		}
		if claims.Org != "acme" {
			t.Errorf("got Org=%q want acme", claims.Org)
		}
	})

	t.Run("rejects expired token", func(t *testing.T) {
		token, err := auth.MintToken(testSecret, "user-2", "acme", -1*time.Minute)
		if err != nil {
			t.Fatalf("MintToken error: %v", err)
		}
		_, err = v.Validate(token)
		if err == nil {
			t.Fatal("expected error for expired token")
		}
	})

	t.Run("rejects token signed with wrong secret", func(t *testing.T) {
		token, err := auth.MintToken("wrong-secret-padded-to-32-bytes!!", "user-3", "acme", 10*time.Minute)
		if err != nil {
			t.Fatalf("MintToken error: %v", err)
		}
		_, err = v.Validate(token)
		if err == nil {
			t.Fatal("expected error for wrong secret")
		}
	})

	t.Run("rejects malformed token", func(t *testing.T) {
		_, err := v.Validate("not.a.token")
		if err == nil {
			t.Fatal("expected error for malformed token")
		}
	})
}
```

- [ ] **Step 4.3: Run — confirm FAIL**

```bash
cd packages/bridge && go test ./internal/auth/...
```
Expected: build error — package doesn't exist yet.

- [ ] **Step 4.4: Implement `packages/bridge/internal/auth/jwt.go`**

```go
package auth

import (
	"errors"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

// Claims is the JWT payload for WaveClick bridge sessions.
type Claims struct {
	Sub    string         `json:"sub"`
	Org    string         `json:"org"`
	Scopes []string       `json:"scopes,omitempty"`
	RL     map[string]int `json:"rl,omitempty"`
	jwt.RegisteredClaims
}

// Validator validates HS256 JWTs using a shared secret.
type Validator struct {
	secret []byte
}

// NewValidator creates a Validator for the given HMAC secret.
func NewValidator(secret string) *Validator {
	return &Validator{secret: []byte(secret)}
}

// Validate parses and validates a Bearer token string.
// Returns parsed Claims on success, or an error.
func (v *Validator) Validate(tokenStr string) (*Claims, error) {
	claims := &Claims{}
	_, err := jwt.ParseWithClaims(tokenStr, claims, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.New("unexpected signing method")
		}
		return v.secret, nil
	}, jwt.WithExpirationRequired())
	if err != nil {
		return nil, err
	}
	return claims, nil
}

// MintToken creates a signed HS256 JWT for the given subject and org.
// ttl controls token lifetime. Used for ephemeral session tokens and tests.
func MintToken(secret, sub, org string, ttl time.Duration) (string, error) {
	now := time.Now()
	claims := &Claims{
		Sub: sub,
		Org: org,
		RegisteredClaims: jwt.RegisteredClaims{
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(ttl)),
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(secret))
}
```

- [ ] **Step 4.5: Create `packages/bridge/internal/auth/middleware.go`**

```go
package auth

import (
	"context"
	"net/http"
	"strings"
)

type contextKey string

const claimsKey contextKey = "claims"

// BearerMiddleware extracts and validates the Authorization: Bearer <token> header.
// Responds 401 on missing or invalid token. Stores Claims in request context.
func BearerMiddleware(v *Validator) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			header := r.Header.Get("Authorization")
			if !strings.HasPrefix(header, "Bearer ") {
				writeUnauthorized(w, "missing bearer token")
				return
			}
			tokenStr := strings.TrimPrefix(header, "Bearer ")
			claims, err := v.Validate(tokenStr)
			if err != nil {
				writeUnauthorized(w, "invalid token: "+err.Error())
				return
			}
			ctx := context.WithValue(r.Context(), claimsKey, claims)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// ClaimsFromContext retrieves Claims stored by BearerMiddleware.
// Returns nil if not present.
func ClaimsFromContext(ctx context.Context) *Claims {
	c, _ := ctx.Value(claimsKey).(*Claims)
	return c
}

func writeUnauthorized(w http.ResponseWriter, msg string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusUnauthorized)
	_, _ = w.Write([]byte(`{"error":"` + msg + `","code":"E_AUTH"}`))
}
```

- [ ] **Step 4.6: Create `packages/bridge/internal/auth/middleware_test.go`**

```go
package auth_test

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/cursorbuddy/bridge/internal/auth"
)

func TestBearerMiddleware(t *testing.T) {
	v := auth.NewValidator(testSecret)

	handler := auth.BearerMiddleware(v)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		claims := auth.ClaimsFromContext(r.Context())
		if claims == nil {
			http.Error(w, "no claims", http.StatusInternalServerError)
			return
		}
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(claims.Sub))
	}))

	t.Run("passes valid bearer token", func(t *testing.T) {
		token, _ := auth.MintToken(testSecret, "user-99", "acme", 5*time.Minute)
		req := httptest.NewRequest(http.MethodGet, "/", nil)
		req.Header.Set("Authorization", "Bearer "+token)
		w := httptest.NewRecorder()
		handler.ServeHTTP(w, req)
		if w.Code != http.StatusOK {
			t.Errorf("got %d want 200", w.Code)
		}
		if w.Body.String() != "user-99" {
			t.Errorf("body = %q want user-99", w.Body.String())
		}
	})

	t.Run("rejects missing header", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/", nil)
		w := httptest.NewRecorder()
		handler.ServeHTTP(w, req)
		if w.Code != http.StatusUnauthorized {
			t.Errorf("got %d want 401", w.Code)
		}
	})

	t.Run("rejects expired token", func(t *testing.T) {
		token, _ := auth.MintToken(testSecret, "user-100", "acme", -1*time.Minute)
		req := httptest.NewRequest(http.MethodGet, "/", nil)
		req.Header.Set("Authorization", "Bearer "+token)
		w := httptest.NewRecorder()
		handler.ServeHTTP(w, req)
		if w.Code != http.StatusUnauthorized {
			t.Errorf("got %d want 401", w.Code)
		}
	})
}
```

- [ ] **Step 4.7: Run auth tests — confirm PASS**

```bash
cd packages/bridge && go test ./internal/auth/... -v
```
Expected: All 6 tests pass.

- [ ] **Step 4.8: Commit auth**

```bash
cd /path/to/repo/root
git add packages/bridge/
git commit -m "feat(bridge): JWT validator, MintToken, BearerMiddleware"
```

---

## Task 5: packages/bridge — API models + HTTP handlers (health + policy)

**Files:**
- Create: `packages/bridge/internal/api/models.go`
- Create: `packages/bridge/internal/api/handler.go`
- Create: `packages/bridge/internal/api/handler_test.go`
- Create: `packages/bridge/internal/api/router.go`

- [ ] **Step 5.1: Add dependencies**

```bash
cd packages/bridge
go get github.com/go-chi/chi/v5
go get github.com/google/uuid
```

- [ ] **Step 5.2: Create `packages/bridge/internal/api/models.go`**

```go
package api

import "time"

// ─── Request models ──────────────────────────────────────────────────────────

// ClientInfo identifies the calling sidecar + extension versions.
type ClientInfo struct {
	VSCodeVersion    string `json:"vscode_version"`
	ExtensionVersion string `json:"extension_version"`
	OS               string `json:"os"`
	SidecarVersion   string `json:"sidecar_version"`
}

// SessionMintRequest is the body for POST /v1/sessions.
type SessionMintRequest struct {
	Client              ClientInfo `json:"client"`
	OpenClawWorkflow    string     `json:"openclaw_workflow"`
	DesiredModelTierHint string   `json:"desired_model_tier_hint,omitempty"`
	Locale              string     `json:"locale"`
}

// TelemetryEvent is a single metric event.
type TelemetryEvent struct {
	TS          time.Time              `json:"ts"`
	Name        string                 `json:"name"`
	UtteranceID string                 `json:"utterance_id,omitempty"`
	ActionID    string                 `json:"action_id,omitempty"`
	LatencyMS   int                    `json:"latency_ms,omitempty"`
	Attrs       map[string]interface{} `json:"attrs,omitempty"`
}

// TelemetryBatch is the body for POST /v1/sessions/{id}/telemetry.
type TelemetryBatch struct {
	SessionID string           `json:"session_id"`
	Events    []TelemetryEvent `json:"events"`
}

// ─── Response models ─────────────────────────────────────────────────────────

// UpstreamWebsocket describes the WSS connection sidecar should dial.
type UpstreamWebsocket struct {
	Type    string            `json:"type"`
	URL     string            `json:"url"`
	Headers map[string]string `json:"headers,omitempty"`
}

// SessionPolicy conveys org-level constraints back to the sidecar.
type SessionPolicy struct {
	VisionAllowed     bool   `json:"vision_allowed"`
	MaxSessionMinutes int    `json:"max_session_minutes"`
	FallbackMode      string `json:"fallback_mode,omitempty"`
}

// SessionMintResponse is returned by POST /v1/sessions.
type SessionMintResponse struct {
	SessionID string            `json:"session_id"`
	Upstream  UpstreamWebsocket `json:"upstream"`
	ExpiresAt time.Time         `json:"expires_at"`
	Policy    SessionPolicy     `json:"policy"`
}

// AuthRefreshResponse is returned by POST /v1/auth/refresh.
type AuthRefreshResponse struct {
	AccessToken string `json:"access_token"`
	ExpiresIn   int    `json:"expires_in"`
}

// ─── Error model ─────────────────────────────────────────────────────────────

// ErrorResponse is the standard error body: {"error":"...","code":"...","details":...}
type ErrorResponse struct {
	Error   string      `json:"error"`
	Code    string      `json:"code,omitempty"`
	Details interface{} `json:"details,omitempty"`
}
```

- [ ] **Step 5.3: Write FAILING handler tests (TDD)**

Create `packages/bridge/internal/api/handler_test.go`:

```go
package api_test

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/cursorbuddy/bridge/internal/api"
	"github.com/cursorbuddy/bridge/internal/auth"
	"github.com/cursorbuddy/bridge/internal/config"
)

const testSecret = "test-secret-at-least-32-bytes-long!!"

func newTestHandler() *api.Handler {
	return api.NewHandler(&config.Config{
		Version:           "test",
		JWTSecret:         testSecret,
		OpenClawUpstreamURL: "wss://openclaw.test",
		MaxSessionMinutes: 30,
	})
}

func validBearerHeader(t *testing.T) string {
	t.Helper()
	token, err := auth.MintToken(testSecret, "user-1", "acme", 5*time.Minute)
	if err != nil {
		t.Fatalf("MintToken: %v", err)
	}
	return "Bearer " + token
}

func TestHealth(t *testing.T) {
	h := newTestHandler()
	req := httptest.NewRequest(http.MethodGet, "/v1/healthz", nil)
	w := httptest.NewRecorder()
	h.Health(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("got %d want 200", w.Code)
	}
	var body map[string]interface{}
	json.NewDecoder(w.Body).Decode(&body)
	if body["ok"] != true {
		t.Errorf("ok field = %v want true", body["ok"])
	}
}

func TestPolicy(t *testing.T) {
	h := newTestHandler()
	req := httptest.NewRequest(http.MethodGet, "/v1/policy", nil)
	req.Header.Set("Authorization", validBearerHeader(t))
	w := httptest.NewRecorder()
	h.Policy(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("got %d want 200", w.Code)
	}
	var body map[string]interface{}
	json.NewDecoder(w.Body).Decode(&body)
	if body["vision_allowed"] != false {
		t.Errorf("vision_allowed = %v want false", body["vision_allowed"])
	}
}

func TestCreateSession(t *testing.T) {
	h := newTestHandler()
	body := `{
		"client": {"vscode_version":"1.99.0","extension_version":"0.4.2","os":"darwin","sidecar_version":"0.4.2"},
		"openclaw_workflow": "waveclick_session",
		"locale": "en-US"
	}`
	req := httptest.NewRequest(http.MethodPost, "/v1/sessions", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", validBearerHeader(t))
	w := httptest.NewRecorder()
	h.CreateSession(w, req)

	if w.Code != http.StatusCreated {
		t.Errorf("got %d want 201; body: %s", w.Code, w.Body.String())
	}
	var resp api.SessionMintResponse
	json.NewDecoder(w.Body).Decode(&resp)
	if resp.SessionID == "" {
		t.Error("session_id is empty")
	}
	if resp.Upstream.Type != "websocket" {
		t.Errorf("upstream.type = %q want websocket", resp.Upstream.Type)
	}
	if resp.Policy.MaxSessionMinutes != 30 {
		t.Errorf("max_session_minutes = %d want 30", resp.Policy.MaxSessionMinutes)
	}
}

func TestCreateSession_InvalidBody(t *testing.T) {
	h := newTestHandler()
	req := httptest.NewRequest(http.MethodPost, "/v1/sessions", strings.NewReader("not-json"))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", validBearerHeader(t))
	w := httptest.NewRecorder()
	h.CreateSession(w, req)
	if w.Code != http.StatusBadRequest {
		t.Errorf("got %d want 400", w.Code)
	}
}

func TestTelemetry(t *testing.T) {
	h := newTestHandler()
	body := `{"session_id":"11111111-1111-1111-1111-111111111111","events":[{"ts":"2026-04-09T00:00:00Z","name":"executor.command_ok"}]}`
	req := httptest.NewRequest(http.MethodPost, "/v1/sessions/11111111-1111-1111-1111-111111111111/telemetry", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", validBearerHeader(t))
	w := httptest.NewRecorder()
	h.Telemetry(w, req)
	if w.Code != http.StatusNoContent {
		t.Errorf("got %d want 204", w.Code)
	}
}

func TestAuthRefresh(t *testing.T) {
	h := newTestHandler()
	req := httptest.NewRequest(http.MethodPost, "/v1/auth/refresh", nil)
	req.Header.Set("Authorization", validBearerHeader(t))
	w := httptest.NewRecorder()
	h.AuthRefresh(w, req)
	if w.Code != http.StatusOK {
		t.Errorf("got %d want 200", w.Code)
	}
	var resp api.AuthRefreshResponse
	json.NewDecoder(w.Body).Decode(&resp)
	if resp.AccessToken == "" {
		t.Error("access_token is empty")
	}
	if resp.ExpiresIn <= 0 {
		t.Errorf("expires_in = %d want > 0", resp.ExpiresIn)
	}
}
```

- [ ] **Step 5.4: Run — confirm FAIL**

```bash
cd packages/bridge && go test ./internal/api/...
```
Expected: build error — handler not defined.

- [ ] **Step 5.5: Implement `packages/bridge/internal/api/handler.go`**

```go
package api

import (
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"time"

	"github.com/cursorbuddy/bridge/internal/auth"
	"github.com/cursorbuddy/bridge/internal/config"
	"github.com/google/uuid"
)

// Handler holds all HTTP handler methods for the bridge.
type Handler struct {
	cfg       *config.Config
	validator *auth.Validator
}

// NewHandler constructs a Handler from config.
func NewHandler(cfg *config.Config) *Handler {
	return &Handler{
		cfg:       cfg,
		validator: auth.NewValidator(cfg.JWTSecret),
	}
}

// Validator returns the JWT validator (used by middleware wiring in router).
func (h *Handler) Validator() *auth.Validator {
	return h.validator
}

// Health handles GET /v1/healthz — no auth required.
func (h *Handler) Health(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]interface{}{
		"ok":      true,
		"version": h.cfg.Version,
	})
}

// Policy handles GET /v1/policy — returns org-level policy to the sidecar.
func (h *Handler) Policy(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]interface{}{
		"vision_allowed":          false,
		"command_alias_overrides": map[string]interface{}{},
		"dlp_rules_version":       "0.4.0",
	})
}

// CreateSession handles POST /v1/sessions — mints a proxied upstream connection.
func (h *Handler) CreateSession(w http.ResponseWriter, r *http.Request) {
	var req SessionMintRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_json", err.Error())
		return
	}

	if req.Client.VSCodeVersion == "" || req.Locale == "" || req.OpenClawWorkflow == "" {
		writeError(w, http.StatusBadRequest, "missing_fields", "client, openclaw_workflow, and locale are required")
		return
	}

	sessionID := uuid.NewString()
	expiresAt := time.Now().UTC().Add(time.Duration(h.cfg.MaxSessionMinutes) * time.Minute)

	ephemeralToken, err := auth.MintToken(h.cfg.JWTSecret, sessionID, "bridge", 35*time.Minute)
	if err != nil {
		slog.Error("failed to mint ephemeral token", "err", err)
		writeError(w, http.StatusInternalServerError, "token_error", "could not mint session token")
		return
	}

	resp := SessionMintResponse{
		SessionID: sessionID,
		Upstream: UpstreamWebsocket{
			Type: "websocket",
			URL:  fmt.Sprintf("wss://%s/v1/stream/%s", r.Host, sessionID),
			Headers: map[string]string{
				"Authorization": "Bearer " + ephemeralToken,
			},
		},
		ExpiresAt: expiresAt,
		Policy: SessionPolicy{
			VisionAllowed:     false,
			MaxSessionMinutes: h.cfg.MaxSessionMinutes,
			FallbackMode:      "rest",
		},
	}

	slog.Info("session created", "session_id", sessionID, "workflow", req.OpenClawWorkflow)
	writeJSON(w, http.StatusCreated, resp)
}

// Telemetry handles POST /v1/sessions/{sessionId}/telemetry.
func (h *Handler) Telemetry(w http.ResponseWriter, r *http.Request) {
	var batch TelemetryBatch
	if err := json.NewDecoder(r.Body).Decode(&batch); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_json", err.Error())
		return
	}
	if len(batch.Events) > 500 {
		writeError(w, http.StatusBadRequest, "too_many_events", "max 500 events per batch")
		return
	}
	slog.Info("telemetry received", "session_id", batch.SessionID, "events", len(batch.Events))
	w.WriteHeader(http.StatusNoContent)
}

// AuthRefresh handles POST /v1/auth/refresh — issues a new short-lived token.
func (h *Handler) AuthRefresh(w http.ResponseWriter, r *http.Request) {
	claims := auth.ClaimsFromContext(r.Context())
	if claims == nil {
		writeError(w, http.StatusUnauthorized, "E_AUTH", "no claims in context")
		return
	}
	const ttl = 60 * time.Minute
	newToken, err := auth.MintToken(h.cfg.JWTSecret, claims.Sub, claims.Org, ttl)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "token_error", err.Error())
		return
	}
	writeJSON(w, http.StatusOK, AuthRefreshResponse{
		AccessToken: newToken,
		ExpiresIn:   int(ttl.Seconds()),
	})
}

// ─── helpers ─────────────────────────────────────────────────────────────────

func writeJSON(w http.ResponseWriter, code int, v interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	if err := json.NewEncoder(w).Encode(v); err != nil {
		slog.Error("writeJSON encode", "err", err)
	}
}

func writeError(w http.ResponseWriter, code int, errCode, msg string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	json.NewEncoder(w).Encode(ErrorResponse{Error: msg, Code: errCode})
}
```

- [ ] **Step 5.6: Create `packages/bridge/internal/api/router.go`**

```go
package api

import (
	"net/http"

	"github.com/cursorbuddy/bridge/internal/auth"
	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
)

// NewRouter wires all routes and middleware for the bridge.
func NewRouter(h *Handler) http.Handler {
	r := chi.NewRouter()
	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	r.Use(middleware.Recoverer)

	bearer := auth.BearerMiddleware(h.Validator())

	// Public
	r.Get("/v1/healthz", h.Health)

	// Protected
	r.Group(func(r chi.Router) {
		r.Use(bearer)
		r.Get("/v1/policy", h.Policy)
		r.Post("/v1/sessions", h.CreateSession)
		r.Post("/v1/sessions/{sessionId}/telemetry", h.Telemetry)
		r.Post("/v1/auth/refresh", h.AuthRefresh)
	})

	return r
}
```

- [ ] **Step 5.7: Run handler tests — confirm PASS**

```bash
cd packages/bridge && go test ./internal/api/... -v
```
Expected: All 6 tests pass (`TestHealth`, `TestPolicy`, `TestCreateSession`, `TestCreateSession_InvalidBody`, `TestTelemetry`, `TestAuthRefresh`).

- [ ] **Step 5.8: Commit**

```bash
cd /path/to/repo/root
git add packages/bridge/
git commit -m "feat(bridge): API models, HTTP handlers, chi router"
```

---

## Task 6: packages/bridge — Rate Limiting (Redis token bucket)

**Files:**
- Create: `packages/bridge/internal/ratelimit/bucket.go`
- Create: `packages/bridge/internal/ratelimit/bucket_test.go`

- [ ] **Step 6.1: Add Redis dependency**

```bash
cd packages/bridge && go get github.com/redis/go-redis/v9
```

- [ ] **Step 6.2: Write FAILING rate limit tests (TDD)**

Create `packages/bridge/internal/ratelimit/bucket_test.go`:

```go
package ratelimit_test

import (
	"context"
	"testing"

	"github.com/cursorbuddy/bridge/internal/ratelimit"
)

// memStore is an in-memory store for testing without Redis.
type memStore struct {
	counts map[string]int64
}

func newMemStore() *memStore { return &memStore{counts: make(map[string]int64)} }

func (m *memStore) Increment(ctx context.Context, key string) (int64, error) {
	m.counts[key]++
	return m.counts[key], nil
}

func (m *memStore) TTL(ctx context.Context, key string, windowSecs int) error {
	return nil // no-op for tests
}

func TestBucket_Allow(t *testing.T) {
	store := newMemStore()
	b := ratelimit.NewBucket(store, ratelimit.Config{
		BurstPerMinute:  3,
		SustainPerHour:  10,
	})

	ctx := context.Background()

	// First 3 requests within burst should be allowed
	for i := 0; i < 3; i++ {
		ok, err := b.Allow(ctx, "user:alice", ratelimit.WindowMinute)
		if err != nil {
			t.Fatalf("Allow error: %v", err)
		}
		if !ok {
			t.Errorf("request %d: expected allowed", i+1)
		}
	}

	// 4th request exceeds burst
	ok, err := b.Allow(ctx, "user:alice", ratelimit.WindowMinute)
	if err != nil {
		t.Fatalf("Allow error: %v", err)
	}
	if ok {
		t.Error("4th request should be denied (exceeds burst)")
	}
}

func TestBucket_DifferentKeys_Independent(t *testing.T) {
	store := newMemStore()
	b := ratelimit.NewBucket(store, ratelimit.Config{BurstPerMinute: 2, SustainPerHour: 10})
	ctx := context.Background()

	// alice uses 2
	b.Allow(ctx, "user:alice", ratelimit.WindowMinute)
	b.Allow(ctx, "user:alice", ratelimit.WindowMinute)

	// bob should still have full allowance
	ok, _ := b.Allow(ctx, "user:bob", ratelimit.WindowMinute)
	if !ok {
		t.Error("bob should be allowed (different key)")
	}
}
```

- [ ] **Step 6.3: Run — confirm FAIL**

```bash
cd packages/bridge && go test ./internal/ratelimit/...
```
Expected: build error.

- [ ] **Step 6.4: Implement `packages/bridge/internal/ratelimit/bucket.go`**

```go
package ratelimit

import (
	"context"
	"fmt"
)

// Window identifies which time window to check.
type Window string

const (
	WindowMinute Window = "min"
	WindowHour   Window = "hr"
)

// Config defines rate limit thresholds.
type Config struct {
	BurstPerMinute int // Max requests per minute per key
	SustainPerHour int // Max requests per hour per key
}

// Store is a minimal interface for atomic counters (Redis INCR / in-memory for tests).
type Store interface {
	Increment(ctx context.Context, key string) (int64, error)
	TTL(ctx context.Context, key string, windowSecs int) error
}

// Bucket implements a simple counter-based rate limiter.
type Bucket struct {
	store Store
	cfg   Config
}

// NewBucket creates a rate limiter backed by the given Store.
func NewBucket(store Store, cfg Config) *Bucket {
	return &Bucket{store: store, cfg: cfg}
}

// Allow returns true if the key has not exceeded the limit for the given window.
// key should be e.g. "user:alice:min:2026040912" (caller constructs time suffix).
// For test simplicity, this implementation just uses the key as-is and checks count.
func (b *Bucket) Allow(ctx context.Context, key string, w Window) (bool, error) {
	windowSecs := 60
	limit := b.cfg.BurstPerMinute
	if w == WindowHour {
		windowSecs = 3600
		limit = b.cfg.SustainPerHour
	}

	storageKey := fmt.Sprintf("wg:rl:%s:%s", key, w)
	count, err := b.store.Increment(ctx, storageKey)
	if err != nil {
		// Fail closed: deny on store error
		return false, err
	}
	if err := b.store.TTL(ctx, storageKey, windowSecs); err != nil {
		return false, err
	}
	return count <= int64(limit), nil
}
```

- [ ] **Step 6.5: Run rate limit tests — confirm PASS**

```bash
cd packages/bridge && go test ./internal/ratelimit/... -v
```
Expected: `PASS` for both `TestBucket_Allow` and `TestBucket_DifferentKeys_Independent`.

- [ ] **Step 6.6: Commit**

```bash
cd /path/to/repo/root
git add packages/bridge/internal/ratelimit/
git commit -m "feat(bridge): Redis-backed rate limiter with in-memory test store"
```

---

## Task 7: packages/bridge — WebSocket Proxy

**Files:**
- Create: `packages/bridge/internal/proxy/websocket.go`
- Create: `packages/bridge/internal/proxy/websocket_test.go`

- [ ] **Step 7.1: Add WebSocket dependency**

```bash
cd packages/bridge && go get github.com/gorilla/websocket
```

- [ ] **Step 7.2: Write FAILING WSS proxy tests (TDD)**

Create `packages/bridge/internal/proxy/websocket_test.go`:

```go
package proxy_test

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/gorilla/websocket"
	"github.com/cursorbuddy/bridge/internal/proxy"
)

var upgrader = websocket.Upgrader{CheckOrigin: func(r *http.Request) bool { return true }}

// startUpstream starts a test WebSocket server that echoes messages.
func startUpstream(t *testing.T) *httptest.Server {
	t.Helper()
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		conn, err := upgrader.Upgrade(w, r, nil)
		if err != nil {
			return
		}
		defer conn.Close()
		for {
			mt, msg, err := conn.ReadMessage()
			if err != nil {
				return
			}
			conn.WriteMessage(mt, msg) // echo
		}
	}))
	return srv
}

func TestProxy_EchosMessage(t *testing.T) {
	upstream := startUpstream(t)
	defer upstream.Close()

	// Convert http:// to ws://
	upstreamWS := "ws" + strings.TrimPrefix(upstream.URL, "http")

	// Start proxy server
	p := proxy.New(proxy.Config{IdleTimeout: 5 * time.Second})
	proxySrv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		p.ServeWS(w, r, upstreamWS, nil)
	}))
	defer proxySrv.Close()

	// Connect client to proxy
	proxyWS := "ws" + strings.TrimPrefix(proxySrv.URL, "http")
	conn, _, err := websocket.DefaultDialer.Dial(proxyWS, nil)
	if err != nil {
		t.Fatalf("dial proxy: %v", err)
	}
	defer conn.Close()

	// Send message through proxy → upstream → back
	conn.WriteMessage(websocket.TextMessage, []byte("hello"))
	conn.SetReadDeadline(time.Now().Add(3 * time.Second))
	_, msg, err := conn.ReadMessage()
	if err != nil {
		t.Fatalf("read: %v", err)
	}
	if string(msg) != "hello" {
		t.Errorf("got %q want hello", msg)
	}
}
```

- [ ] **Step 7.3: Run — confirm FAIL**

```bash
cd packages/bridge && go test ./internal/proxy/...
```
Expected: build error.

- [ ] **Step 7.4: Implement `packages/bridge/internal/proxy/websocket.go`**

```go
package proxy

import (
	"log/slog"
	"net/http"
	"time"

	"github.com/gorilla/websocket"
)

// Config holds proxy settings.
type Config struct {
	IdleTimeout time.Duration // close connection after this long with no messages
}

// Proxy performs transparent bidirectional WebSocket proxying.
type Proxy struct {
	cfg      Config
	upgrader websocket.Upgrader
}

// New creates a Proxy with the given config.
func New(cfg Config) *Proxy {
	return &Proxy{
		cfg: cfg,
		upgrader: websocket.Upgrader{
			CheckOrigin: func(r *http.Request) bool { return true }, // trust sidecar origin
		},
	}
}

// ServeWS upgrades the incoming request to WebSocket, dials upstreamURL,
// and bidirectionally copies frames until either side closes or idle timeout fires.
// extraHeaders are added to the upstream dial (e.g. Authorization).
func (p *Proxy) ServeWS(w http.ResponseWriter, r *http.Request, upstreamURL string, extraHeaders http.Header) {
	client, err := p.upgrader.Upgrade(w, r, nil)
	if err != nil {
		slog.Error("proxy: upgrade client", "err", err)
		return
	}
	defer client.Close()

	upstream, _, err := websocket.DefaultDialer.Dial(upstreamURL, extraHeaders)
	if err != nil {
		slog.Error("proxy: dial upstream", "url", upstreamURL, "err", err)
		client.WriteMessage(websocket.CloseMessage,
			websocket.FormatCloseMessage(websocket.CloseInternalServerErr, "upstream unavailable"))
		return
	}
	defer upstream.Close()

	errc := make(chan error, 2)

	copyFrames := func(dst, src *websocket.Conn, label string) {
		for {
			if p.cfg.IdleTimeout > 0 {
				src.SetReadDeadline(time.Now().Add(p.cfg.IdleTimeout))
			}
			mt, msg, err := src.ReadMessage()
			if err != nil {
				errc <- err
				return
			}
			if err := dst.WriteMessage(mt, msg); err != nil {
				errc <- err
				return
			}
		}
	}

	go copyFrames(upstream, client, "client→upstream")
	go copyFrames(client, upstream, "upstream→client")

	err = <-errc
	if err != nil && !websocket.IsCloseError(err, websocket.CloseNormalClosure, websocket.CloseGoingAway) {
		slog.Debug("proxy: connection closed", "err", err)
	}
}
```

- [ ] **Step 7.5: Run proxy tests — confirm PASS**

```bash
cd packages/bridge && go test ./internal/proxy/... -v
```
Expected: `--- PASS: TestProxy_EchosMessage`.

- [ ] **Step 7.6: Commit**

```bash
cd /path/to/repo/root
git add packages/bridge/internal/proxy/
git commit -m "feat(bridge): transparent WebSocket proxy with idle timeout"
```

---

## Task 8: packages/bridge — Main entrypoint + stream route + wiring

**Files:**
- Create: `packages/bridge/cmd/bridge/main.go`
- Modify: `packages/bridge/internal/api/router.go` (add /v1/stream/{id} route)

- [ ] **Step 8.1: Create `packages/bridge/cmd/bridge/main.go`**

```go
package main

import (
	"context"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/cursorbuddy/bridge/internal/api"
	"github.com/cursorbuddy/bridge/internal/config"
)

func main() {
	// Structured JSON logging
	logLevel := slog.LevelInfo
	if os.Getenv("LOG_LEVEL") == "debug" {
		logLevel = slog.LevelDebug
	}
	slog.SetDefault(slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: logLevel})))

	cfg, err := config.Load()
	if err != nil {
		slog.Error("config error", "err", err)
		os.Exit(1)
	}

	h := api.NewHandler(cfg)
	router := api.NewRouter(h)

	srv := &http.Server{
		Addr:         cfg.Listen,
		Handler:      router,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 60 * time.Second, // longer for WSS upgrade
		IdleTimeout:  120 * time.Second,
	}

	// Graceful shutdown
	done := make(chan os.Signal, 1)
	signal.Notify(done, os.Interrupt, syscall.SIGTERM)

	go func() {
		slog.Info("bridge starting", "addr", cfg.Listen, "version", cfg.Version)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			slog.Error("server error", "err", err)
			os.Exit(1)
		}
	}()

	<-done
	slog.Info("shutting down...")
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	srv.Shutdown(ctx)
	slog.Info("stopped")
}
```

- [ ] **Step 8.2: Add stream route to `packages/bridge/internal/api/router.go`**

Replace the existing `router.go` content with:

```go
package api

import (
	"net/http"
	"time"

	"github.com/cursorbuddy/bridge/internal/auth"
	"github.com/cursorbuddy/bridge/internal/proxy"
	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
)

// NewRouter wires all routes and middleware for the bridge.
func NewRouter(h *Handler) http.Handler {
	r := chi.NewRouter()
	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	r.Use(middleware.Recoverer)

	bearer := auth.BearerMiddleware(h.Validator())
	p := proxy.New(proxy.Config{IdleTimeout: 120 * time.Second})

	// Public
	r.Get("/v1/healthz", h.Health)

	// Protected REST
	r.Group(func(r chi.Router) {
		r.Use(bearer)
		r.Get("/v1/policy", h.Policy)
		r.Post("/v1/sessions", h.CreateSession)
		r.Post("/v1/sessions/{sessionId}/telemetry", h.Telemetry)
		r.Post("/v1/auth/refresh", h.AuthRefresh)
	})

	// WebSocket stream proxy (authenticated via query param or header)
	r.Group(func(r chi.Router) {
		r.Use(bearer)
		r.Get("/v1/stream/{sessionId}", func(w http.ResponseWriter, r *http.Request) {
			sessionID := chi.URLParam(r, "sessionId")
			upstreamURL := h.cfg.OpenClawUpstreamURL + "/sessions/" + sessionID
			p.ServeWS(w, r, upstreamURL, http.Header{
				"Authorization": []string{"Bearer " + h.cfg.OpenClawServiceToken},
			})
		})
	})

	return r
}
```

- [ ] **Step 8.3: Build the bridge binary**

```bash
cd packages/bridge && go build ./cmd/bridge
```
Expected: binary `bridge` created in `packages/bridge/` with no errors.

- [ ] **Step 8.4: Run ALL bridge tests**

```bash
cd packages/bridge && go test ./... -v
```
Expected: all packages pass (`dlp`, `auth`, `api`, `ratelimit`, `proxy`).

- [ ] **Step 8.5: Commit**

```bash
cd /path/to/repo/root
git add packages/bridge/
git commit -m "feat(bridge): main entrypoint, /v1/stream WSS proxy route, full build"
```

---

## Task 9: Local Dev — .env.example + docker-compose + ARCHITECTURE.md

**Files:**
- Create: `.env.example`
- Create: `docker-compose.yml`
- Create: `ARCHITECTURE.md`

- [ ] **Step 9.1: Create `.env.example`**

```bash
# WaveClick Bridge — copy to .env and fill in values for local dev
# NEVER commit .env to git

# Bridge server bind address
BRIDGE_LISTEN=127.0.0.1:8787

# OpenClaw instance (required)
OPENCLAW_UPSTREAM_URL=https://openclaw.dev.internal
OPENCLAW_SERVICE_TOKEN=change-me-openclaw-service-token

# JWT auth (HS256 for dev; use RS256 + JWKS in production)
JWT_ISSUER=https://idp.example.com
JWT_SECRET=change-me-at-least-32-chars-here!!

# Redis for rate limiting
REDIS_URL=redis://localhost:6379

# Logging
LOG_LEVEL=debug

# Max session duration in minutes
MAX_SESSION_MINUTES=30

# Build version (injected via ldflags in CI)
BRIDGE_VERSION=dev
```

- [ ] **Step 9.2: Create `docker-compose.yml`**

```yaml
version: "3.9"

services:
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    command: redis-server --save "" --appendonly no
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 5

  # Mock OpenClaw stub for CI: echoes back a canned AssistantEnvelopeV1
  # via WebSocket. NOT for production use.
  mock-openclaw:
    image: node:20-alpine
    working_dir: /app
    volumes:
      - ./scripts/mock-openclaw.js:/app/mock-openclaw.js:ro
    command: node mock-openclaw.js
    ports:
      - "9090:9090"
    environment:
      PORT: "9090"
    profiles:
      - ci  # only start in CI: docker compose --profile ci up
```

- [ ] **Step 9.3: Create `scripts/mock-openclaw.js`** (CI stub)

```bash
mkdir -p scripts
```

```js
#!/usr/bin/env node
// Mock OpenClaw WebSocket server for CI testing.
// Returns a canned AssistantEnvelopeV1 in response to any text message.
// NEVER used in production.

const { WebSocketServer } = require("ws");
const PORT = parseInt(process.env.PORT || "9090", 10);

const CANNED_ENVELOPE = JSON.stringify({
  schema_version: "1.0",
  session_id: "00000000-0000-0000-0000-000000000001",
  utterance_id: "00000000-0000-0000-0000-000000000002",
  assistant_text: "Opening the Source Control view.",
  confidence: 0.95,
  actions: [
    { id: "a1", type: "execute_command", risk: "low", alias: "open_scm", args: [] },
  ],
});

const wss = new WebSocketServer({ port: PORT });
wss.on("connection", (ws) => {
  console.log("mock-openclaw: client connected");
  ws.on("message", () => {
    ws.send(CANNED_ENVELOPE);
  });
  ws.on("close", () => console.log("mock-openclaw: client disconnected"));
});
console.log(`mock-openclaw listening on ws://0.0.0.0:${PORT}`);
```

- [ ] **Step 9.4: Create `ARCHITECTURE.md`**

```markdown
# WaveClick — Architecture Decision Record

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
```

- [ ] **Step 9.5: Commit**

```bash
cd /path/to/repo/root
git add .env.example docker-compose.yml scripts/ ARCHITECTURE.md
git commit -m "docs: ARCHITECTURE.md, .env.example, docker-compose, mock-openclaw CI stub"
```

---

## Task 10: Verification Pass

- [ ] **Step 10.1: Run openclaw-pack validator**

```bash
cd packages/openclaw-pack && node scripts/validate.js
```
Expected: `All openclaw-pack checks passed.`

- [ ] **Step 10.2: Run shared TypeScript tests**

```bash
cd packages/shared && npm test
```
Expected: `Tests 14 passed (14)`.

- [ ] **Step 10.3: Run all Go bridge tests**

```bash
cd packages/bridge && go test ./... -v -count=1
```
Expected: all packages green. Final line: `ok github.com/cursorbuddy/bridge/...` for each.

- [ ] **Step 10.4: Build bridge binary**

```bash
cd packages/bridge && go build -ldflags="-X main.version=0.4.0" ./cmd/bridge && echo "BUILD OK"
```
Expected: `BUILD OK`, binary present.

- [ ] **Step 10.5: Smoke test health endpoint**

```bash
# In one terminal:
cd packages/bridge
OPENCLAW_UPSTREAM_URL=wss://openclaw.local \
  OPENCLAW_SERVICE_TOKEN=test \
  JWT_ISSUER=https://idp.test \
  JWT_SECRET=test-secret-at-least-32-bytes-long!! \
  go run ./cmd/bridge &

sleep 1
curl -s http://127.0.0.1:8787/v1/healthz | python3 -m json.tool
kill %1
```
Expected JSON response:
```json
{
  "ok": true,
  "version": "dev"
}
```

- [ ] **Step 10.6: Final commit**

```bash
cd /path/to/repo/root
git add -A
git status  # verify no secrets, no binaries
git commit -m "chore: verification pass — all tests green, bridge binary builds"
```

---

## Self-Review Checklist

### Spec coverage

| Spec requirement | Task covering it |
|-----------------|-----------------|
| OpenClaw pack: workflow + tools + SKILL.md + policy | Task 1 |
| `AssistantEnvelopeV1` Zod schema strict | Task 2.7 |
| Command alias versioned maps | Task 2.11–2.13 |
| Duplicate action id rejection | Task 2.7 (superRefine) |
| Bridge: Go, chi, JWT, mTLS option | Task 4–5 |
| `GET /v1/healthz` | Task 5.5 |
| `GET /v1/policy` | Task 5.5 |
| `POST /v1/sessions` mint | Task 5.5 |
| `POST /v1/sessions/{id}/telemetry` | Task 5.5 |
| `POST /v1/auth/refresh` | Task 5.5 |
| WSS proxy `/v1/stream/{id}` | Task 7 + 8 |
| Rate limiting token bucket | Task 6 |
| DLP redaction pipeline | Task 3 |
| .env.example | Task 9.1 |
| docker-compose Redis | Task 9.2 |
| ARCHITECTURE.md + STRIDE | Task 9.4 |
| All tests TDD (test first, then implement) | Tasks 2, 3, 4, 5, 6, 7 |

### Type consistency check

- `AssistantEnvelopeV1` exported from `packages/shared/src/envelope.ts` — used in `command-map.test.ts` indirectly via type imports ✓
- `CommandEntry` interface used in both test and implementation ✓
- Go `api.SessionMintResponse` struct field `Upstream UpstreamWebsocket` matches OpenAPI ✓
- Go `auth.Claims` Sub/Org fields used in `MintToken` and `ClaimsFromContext` ✓
- `proxy.Config.IdleTimeout` used in both test and router wiring ✓

### No placeholders

Scanned: no TBD, no TODO, no "fill in details", no "add appropriate error handling", no "similar to Task N" without full code. ✓
