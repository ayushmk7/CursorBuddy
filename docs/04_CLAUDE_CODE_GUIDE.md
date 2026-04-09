# How to Use Claude Code to Build WaveClick

This document is a **practical guide** for using Claude Code (terminal-based agentic coding) to implement the WaveClick system described in `docsforother/*.md`. It mirrors the structure of `docs/04_CLAUDE_CODE_GUIDE.md` but targets **OpenClaw (required) + VS Code extension + sidecar + optional bridge**, with **latency-first** choices (direct to OpenClaw when fastest; **Gemini Live** only when OpenClaw benchmarks it as fastest—not hardcoded in the extension).

---

## 1. Setup

### 1.1 Install Claude Code

```bash
npm install -g @anthropic-ai/claude-code
```

Requires Node.js 18+. Run `claude` in your terminal.

### 1.2 Authenticate

```bash
claude auth
```

### 1.3 Repository Layout (Recommended)

Create a dedicated repository (or monorepo packages):

```
waveclick/
  packages/
    extension/          # VS Code extension (TypeScript)
    sidecar/              # Node or Rust audio + OpenClaw transport client
    bridge/               # optional HTTP/WSS proxy to OpenClaw
    openclaw-pack/        # REQUIRED: workflows, tools, SKILL.md for OpenClaw operators
  docsforother/           # PRDs (or symlink from another repo)
```

Open the repo root in your terminal and run `claude`.

### 1.4 First Orientation Prompt

```
> Read docsforother/01_GENERAL_PRD.md and docsforother/02_TECHNICAL_PRD.md.
  Summarize the architecture: OpenClaw (required), extension host, sidecar, optional bridge.
  Explain why direct model API calls from the extension are forbidden in production.
  List the top 10 VS Code APIs we must use and why.
```

---

## 2. Effective Workflows

### 2.0 Ship the OpenClaw pack first (blocking)

```
> Create packages/openclaw-pack with:
  - workflow definition for waveclick_session
  - tool specs: vscode_probe_state, waveclick_emit_envelope
  - SKILL.md describing safe Git guidance
  Align with docsforother/02_TECHNICAL_PRD.md §9.
  OpenClaw must be the only orchestrator; extension only executes AssistantEnvelopeV1.
```

### 2.1 Scaffold the Extension with `@vscode/vscode-dev`

```
> Initialize packages/extension as a VS Code extension using the official generator
  pattern: esbuild bundling, strict TypeScript, eslint, @vscode/test-electron.
  Add a sidebar view "waveclick.sidebar" with a React or vanilla webview—pick one
  and justify. Include activationEvents limited to onCommand for start/stop.
  Cite docsforother/02_TECHNICAL_PRD.md §2 for manifest contributions.
```

### 2.2 Implement the Action Executor with Hardening

```
> Implement packages/extension/src/executor/ActionExecutor.ts that:
  - Parses AssistantEnvelopeV1 JSON
  - Validates with Zod schemas matching docsforother/02_TECHNICAL_PRD.md §4
  - Maps aliases via versioned JSON command-map files
  - Blocks unknown commands and logs structured errors
  - Requires modal confirmation for risk=high actions
  Add unit tests with fixtures for invalid envelopes.
```

### 2.3 Git Adapter Abstraction

```
> Create GitAdapter that wraps vscode.git extension API with version fallbacks.
  Expose getSnapshot(): GitSnapshot for the model tool vscode_probe_state.
  Do not shell out to git unless API missing; if shelling out, use spawn with argv arrays.
```

### 2.4 Sidecar Process

```
> Implement packages/sidecar as a small Node app that:
  - Speaks JSON-RPC over stdio to the extension
  - Captures microphone via a cross-platform library (choose one; document limitations)
  - Maintains WebSocket (or HTTPS streaming) to **OpenClaw** using backoff+jitter
  - Forwards binary audio frames and receives OpenClaw events + AssistantEnvelopeV1 payloads
  - Never persists OpenClaw tokens to disk; accept token via env or one-shot IPC message
  - Never opens direct connections to Gemini/OpenAI in production builds
  Reference docsforother/03_BACKEND_PRD.md §4.1 for personal mode threats.
```

### 2.5 Optional Bridge Service

```
> Implement packages/bridge with Fastify:
  - POST /v1/sessions mints proxied upstream URL **to OpenClaw** (not raw provider)
  - WSS proxy with timeouts and idle disconnect
  - JWT auth middleware
  - OpenAPI sync from docsforother/openapi.yaml
  Include docker-compose with Redis for rate limits.
```

### 2.6 Compatibility Tests

```
> Add @vscode/test-electron integration test that launches VS Code, activates the
  extension in a temp workspace with a git repo, and verifies executor can run
  a safe command (open SCM). Gate command IDs using the version matrix approach
  from docsforother/02_TECHNICAL_PRD.md §8.
```

---

## 3. Debugging Playbook

### 3.1 Extension Does Not Activate

```
> The extension never activates. Inspect package.json activationEvents,
  command registrations, and extension.ts activation function. Add structured
  logging to a VS Code output channel "WaveClick".
```

### 3.2 Webview Blank / CSP Errors

```
> The webview is blank. Review Content Security Policy in WebviewViewProvider:
  allow only necessary script hashes or nonces; enable webview developer tools
  and capture console errors; fix resource roots.
```

### 3.3 Sidecar IPC Hangs

```
> Sidecar stops responding. Add heartbeat messages, length-prefixed framing for
  stdio JSON-RPC, and crash restart with exponential backoff in the extension.
```

---

## 4. Prompt Templates for Security Review

```
> Threat model the ActionExecutor against prompt injection and malicious workspace
  files. Propose concrete code-level defenses aligned with docsforother/02_TECHNICAL_PRD.md §5.
```

```
> Review SecretStorage usage: ensure keys never logged; add redaction to logger.
```

---

## 5. Release Checklist (Ask Claude Code to Verify)

```
> Compare shipped command alias map against VS Code 1.98 and 1.99 command lists.
  Generate a markdown table of differences and update command-map JSON files.
```

```
> Run vsce package; verify LICENSE, icons, README screenshots, and pre-release flag.
```

---

## 6. What Not to Automate Blindly

- **Do not** let Claude Code add arbitrary `executeCommand` calls without alias mapping.
- **Do not** upload workspace source to cloud without explicit user toggles.
- **Do not** bypass confirmation for `git.push` / `git.commit` in default configuration.

---

## 7. Related Documents

- `docsforother/06_BACKEND_IMPLEMENTATION_STEPS.md` — phased execution order  
- `docsforother/05_FRONTEND_PROMPT.md` — **marketing** landing + waitlist (liquid glass)
- `docsforother/07_LOCAL_CURSOR_AND_COMPANION.md` — VS Code webview, overlay, local cursor UX  
- `docsforother/openapi.yaml` — bridge contract  
