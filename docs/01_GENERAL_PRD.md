# WaveClick — General Product Requirements Document

**Project:** WaveClick — Realtime Voice + Visual Companion for Visual Studio Code  
**Codename:** WaveClick (internal)  
**Version:** 1.0  
**Date:** April 2026  

**Scope note:** This documentation set lives under `docsforother/` and describes a **standalone product** adjacent to the AutoApply repository. It is written to the same document taxonomy as `docs/` (General PRD, Technical PRD, Backend PRD, etc.) for consistency.

---

## 1. Product Overview

WaveClick is a **VS Code extension ecosystem** optimized for **minimum end-to-end latency** from speech (or text) to editor action. It pairs **realtime multimodal inference** (speech in, optional vision in, speech and/or text out) with **deterministic editor automation** via the **Visual Studio Code Extension API**. **OpenClaw is a hard dependency:** all reasoning, workflow orchestration, tool routing, and policy-aware planning run **inside an OpenClaw runtime** (local or org-hosted). The VS Code stack is the **actuator and sensor**; it does **not** replace OpenClaw with a “direct to LLM” shortcut in production.

**Inference speed is a first-class requirement:** deployment choices (**bridge vs direct sidecar→OpenClaw**, region placement, audio codec, batching) are selected to **minimize measured time-to-first-token and time-to-first-envelope**, subject only to security and compliance constraints—not dogma about topology.

The user speaks natural-language goals (“show me how to commit,” “open the Git graph,” “run this task”), and the system responds by:

1. **Streaming** audio (and optional metadata) from the **sidecar** to **OpenClaw**, which owns the **session**, **memory/skills** (`SOUL.md`, `SKILL.md`, `MEMORY.md` per OpenClaw conventions), and **ReAct-style** tool loops.
2. **Understanding** intent using whatever **lowest-latency** path OpenClaw configures for the session (**Gemini Live**, OpenAI Realtime, other vendor realtime, or fastest REST fallback when realtime is slower or unavailable). **Gemini Live is not mandatory:** it is the **default recommendation** only when profiling shows it wins for your region, network, and modality mix. **OpenClaw is always mandatory** as the orchestrator that owns that choice.
3. **Grounding** decisions via OpenClaw tools that call into **workspace truth** (Git state, open editors, tasks, settings) gathered locally—**not** inferred from pixels when avoidable. The canonical tool surface is **`vscode_probe_state`** (and related) returning **metadata only** unless the user explicitly opts into richer context.
4. **Emitting** a **validated `AssistantEnvelopeV1`** (see Technical PRD) from OpenClaw—**only** this envelope shape may drive the **Action Executor** in the extension.
5. **Acting** through an **allowlisted command surface** (`vscode.commands.executeCommand`, view reveals, editor operations) and **explaining** concurrently via **sidebar/webview UI**, **inline decorations**, and optional **text-to-speech**.
6. **Signaling attention** with a **cursor-adjacent or editor-local affordance** (e.g. waveform visualization while the user speaks, caption strip for model output).

The product deliberately **does not** attempt to be a general-purpose OS-level overlay for arbitrary applications in v1. **VS Code is the host and the source of truth** for editor actions; **OpenClaw is the host for agent orchestration.**

### 1.1 OpenClaw requirement (normative)

| Rule | Detail |
|------|--------|
| **R1** | A **reachable OpenClaw instance** must be configured before **WaveClick: Start Session** succeeds (URL, token, or local socket—see Backend PRD). |
| **R2** | Production builds **must not** bypass OpenClaw to call provider APIs directly. A **developer-only** mock flag may exist for UI tests; it is **disabled** in release artifacts. |
| **R3** | Envelopes executed in VS Code **must** originate from OpenClaw (or from OpenClaw-sanctioned bridge code that applies the **same** schema validation). |

### 1.2 Latency-first operations (normative)

| Rule | Detail |
|------|--------|
| **L1** | Ship a **latency budget** and measure **p50/p95** TTFT (time to first assistant token or envelope) per release; regressions are release-blocking when they exceed agreed SLOs. |
| **L2** | Prefer **fewer network hops** when security allows (e.g. **sidecar → OpenClaw** in the same region as the model edge often beats unnecessary double-proxy). |
| **L3** | Use **bridge** when required for auth/compliance, but deploy it **co-located** with OpenClaw or on a low-RTT path so it does not become an artificial bottleneck. |
| **L4** | Audio path: prefer **Opus** (or provider-native low-latency framing), small buffers, and **no** redundant serialization between sidecar and OpenClaw. |

### 1.3 Realtime provider (Gemini Live optional)

- **Required:** OpenClaw.  
- **Not required:** any specific vendor API. **Gemini Live** should be used when—and only when—it is the **fastest correct** option for voice (and optional vision) after measurement; otherwise OpenClaw must switch to a faster configured path (e.g. another realtime API, regional endpoint, or smallest REST model for micro-turns).

---

## 2. Problem Statement

Expert users already know keyboard shortcuts and command IDs; **intermediate and returning users** forget the exact path through VS Code’s surface area (SCM, multi-root workspaces, remote SSH/WSL containers, GitLens coexistence, conflicting keybindings). Traditional help is static (docs) or generic (search). **Speech-first, in-editor guidance** reduces context switching and matches how humans ask for help.

Competing approaches:

| Approach | Failure mode |
|---------|----------------|
| Static docs | Not synchronized with user’s exact UI state, extension set, or workspace |
| Screen-recording tutorials | No interactivity; stale after updates |
| Generic LLM chat | May hallucinate command IDs; cannot safely act without tool grounding |
| OS-level “move my mouse” automation | Fragile across themes, scaling, DPI, multi-monitor; high privacy risk |

WaveClick’s wedge: **OpenClaw-orchestrated agents** + **tight integration with VS Code APIs** + **realtime conversational layer** + **explicit safety gates** for mutating operations.

---

## 3. Target Users

### 3.1 Primary

- Developers who use VS Code daily but **forget SCM affordances** (staging, partial staging, commit vs sync, branch operations).
- Developers new to a **team Git workflow** (fork/PR flow vs direct commit, signed commits, hooks).
- Users working in **Remote Development** contexts where paths and Git behavior differ from local assumptions.

### 3.2 Secondary

- Educators demonstrating workflows (**step-by-step mode** with confirmations).
- Users with **temporary accessibility preferences** (voice input for hands-busy scenarios); WaveClick is **not** a certified assistive technology substitute but may align with user workflows.

### 3.3 Non-target (v1)

- Users seeking **unattended autonomous coding** without review (out of scope; safety posture is assistive).
- **JetBrains / Zed / Neovim** users (future ports require separate PRDs).

---

## 4. Core Value Proposition

**Speak in the editor. The editor shows you the way—using real APIs, not guesses.**

Secondary value:

- **Lower cognitive load** for Git and workbench navigation.
- **Faster time-to-correct-action** than reading generic documentation.
- **Auditable behavior**: every executed command can be logged with rationale (user-toggleable).

---

## 5. User Flows

### 5.1 First Install & Trust Onboarding

1. User installs the extension from the Marketplace (or VSIX sideload for enterprise).
2. Extension displays **Trust & Safety** explainer:
   - Which **scopes** are requested (`workspace`, possibly `extensionHost` details).
   - That **mutating Git actions** require explicit confirmation unless user opts into **“guided auto-run”** for a subset of safe commands.
   - That **audio and session metadata** flow through **OpenClaw** (and from there to configured models/providers per org policy).
3. User configures **OpenClaw endpoint** (base URL or IPC descriptor) and **authentication** (PAT, OAuth device flow, or mTLS client cert—see Backend PRD). Provider keys for LLMs live **in OpenClaw** (or its bridge), not as a shortcut around OpenClaw.
4. User stores **WaveClick ↔ OpenClaw** credentials in VS Code **SecretStorage** (e.g. session token issued by org bridge).
5. User runs **WaveClick: Start Session** from the Command Palette; extension **health-checks OpenClaw** before enabling the mic.
6. Extension performs **capability probe**: VS Code version, built-in Git extension presence, optional GitLens detection (soft dependency), remote kind (local, SSH, WSL, Codespaces).

### 5.2 Voice Session (Happy Path)

1. User invokes **push-to-talk** or **hands-free** (Voice Activity Detection) based on setting.
2. Sidecar streams PCM/opus frames and session context to **OpenClaw** (via its gateway protocol—HTTP, WebSocket, or OpenClaw’s native connector as implemented).
3. **OpenClaw** runs the agent loop: may call **`vscode_probe_state`**, other allowlisted tools, and configured **realtime** or **REST** model endpoints.
4. **Partial transcripts** appear in sidebar webview (optional privacy mode: show dots only); text may be mirrored from OpenClaw events.
5. OpenClaw emits a **`AssistantEnvelopeV1`** (JSON schema; see Technical PRD) to the sidecar/extension—consumed by the **Action Executor** after **schema validation**.
6. For **read-only / navigation** intents:
   - Executor runs `executeCommand` to reveal SCM, open settings JSON, focus terminal, etc.
   - UI shows **numbered steps** matching what happened.
7. For **mutating** intents (commit, push, stage all):
   - Executor opens **confirmation modal** with diff summary where feasible.
   - User confirms; then commands run.

### 5.3 Guided “How Do I Commit?” (Reference Flow)

1. User: “Where do I commit a file in VS Code?”
2. **OpenClaw** drives **`vscode_probe_state`** (or equivalent) so the agent knows workspace layout: single folder vs multi-root; Git repository detected or not.
3. If no repo: explain **Initialize Repository** path and offer to run **safe** init command (still confirm if creating files).
4. If repo exists:
   - Reveal **Source Control** view.
   - If file is open and unstaged: offer **stage file** (confirm).
   - Point user to **message box** with **decoration** or **selection** in SCM input (API limitations may require explanation rather than literal cursor injection into SCM input—see Technical PRD **honesty constraints**).
5. Spoken or textual summary: “You commit in the Source Control view, not the Explorer. Type your message here, then click Commit—or I can run the palette command.”

### 5.4 “Show Me” vs “Do It For Me”

User-configurable **mode**:

| Mode | Behavior |
|------|----------|
| Show | Only reveals panels, highlights files, reads state aloud |
| Assist | Executes **safe** commands (open views) automatically; mutating actions confirm |
| Power | User-defined allowlist can auto-run mutating commands (enterprise may disable) |

### 5.5 Failure & Degradation

1. **OpenClaw unreachable** (HTTP 5xx, TLS failure, auth): session **cannot start**; show remediation (check URL, token, VPN). **No** silent fallback to direct provider.
2. **OpenClaw alive but model/realtime offline**: OpenClaw may fall back per **its** config (e.g. REST completion); WaveClick still only accepts **envelopes** from OpenClaw.
3. **No microphone permission**: text input only in webview; typed text is sent to **OpenClaw** as a user message on the same session.
4. **Command ID mismatch** across VS Code versions: executor logs failure; error returned to **OpenClaw** as tool result so the agent can replan; user sees **retry with palette search** suggestion.
5. **Conflicting extension** (e.g. custom SCM UI): system explains limitation and falls back to **command palette** navigation.

### 5.6 Privacy Modes

1. **Local metadata only** to cloud: workspace-relative paths hashed; file contents never sent unless user triggers **“explain this file”** with explicit consent per session.
2. **Redaction pipeline** for error logs attached to telemetry (tokens, emails stripped).

---

## 6. Functional Requirements (High Level)

### 6.1 Must-have (v1)

- **OpenClaw** runtime deployed and reachable; **WaveClick OpenClaw skill/workflow** package installed on that instance (defines tools, guardrails, and envelope emission).
- **Latency profiling** artifact: documented baseline TTFT / time-to-envelope for the chosen OpenClaw + model path (include at least one **Gemini Live** vs alternative comparison where applicable).
- VS Code extension package, activation events scoped to avoid slowing editor.
- Sidecar (or equivalent) with **OpenClaw session client**: reconnect/backoff, auth rotation, health probes; transport chosen for **minimum RTT** to OpenClaw.
- **Structured action schema** (`AssistantEnvelopeV1`) validated with JSON Schema / Zod before execution; **reject** envelopes not traceable to OpenClaw session (correlation IDs).
- Allowlisted `executeCommand` registry with **semantic aliases** (“open scm” → `workbench.view.scm` class commands; exact IDs version-gated).
- Sidebar webview UI: transcript, steps, **OpenClaw + model connection** status, mic meter.
- Confirmation UX for mutating Git operations.
- Settings: **OpenClaw base URL**, auth secret reference, voice mode, privacy tier, allowlist editor, optional org bridge URL.

### 6.2 Should-have (v1.1)

- Optional **single-frame screenshot** capture for rare ambiguous UI states (user-triggered only), sent **through OpenClaw** policy/DLP pipeline.
- **TTS** output using OS or cloud voice (may be triggered by OpenClaw events).
- **Step replay** (“do that again”) via OpenClaw idempotent workflow hooks.

### 6.3 Could-have (v2+)

- Additional OpenClaw workflows that coordinate **non–VS Code** tools (email, calendar) **only** where enterprise policy explicitly enables them; still **no** bypass of OpenClaw for VS Code actions.

---

## 7. Non-Goals

- Replacing Copilot/Cursor AI coding agents.
- General OS mouse control.
- Guaranteed correctness on **third-party webviews** inside VS Code (e.g. embedded browser pages) without explicit integration.
- Bypassing enterprise policy (extension must respect disabled marketplace, proxy, and certificate pinning environments—document limitations).

---

## 8. Success Metrics (Product)

| Metric | Definition |
|--------|------------|
| Time-to-first-correct-view | Stopwatch from end of utterance to correct workbench view focused |
| Mutation error rate | Commits pushed without user intent / wrong scope (target: ~0 with confirmations on) |
| Latency p50/p95 | End-to-end for “navigation-only” intents |
| Session completion rate | User reaches stated goal without abandoning |

---

## 9. Compliance & Ethics

- **Transparency**: clear indication when **OpenClaw** and downstream model providers are active.
- **User control**: hard stop hotkey; delete session transcripts locally.
- **Safety**: no credential exfiltration via prompt injection—executor must not read SecretStorage for model context.
- **License**: third-party SDKs compatible with Marketplace rules.

---

## 10. Glossary

| Term | Meaning |
|------|---------|
| OpenClaw | **Required** agent orchestration runtime (workflows, tools, memory, model routing) |
| Extension Host | VS Code process isolating extension code |
| Sidecar | Separate OS process for audio I/O, OpenClaw session transport, and long-lived sockets (strongly recommended) |
| Realtime session | Often terminates **inside OpenClaw**; may use provider WebSocket for streaming audio and tokens |
| Action Executor | Local module mapping **OpenClaw-emitted** structured intents to VS Code API calls |
| Allowlist | Approved commands and argument shapes |

---

## 11. Related Documents

- `docsforother/02_TECHNICAL_PRD.md` — architecture, schemas, threat model
- `docsforother/03_BACKEND_PRD.md` — bridge service, secrets, deployment
- `docsforother/05_FRONTEND_PROMPT.md` — public landing + waitlist (liquid glass, AutoApply-aligned)
- `docsforother/07_LOCAL_CURSOR_AND_COMPANION.md` — on-device companion, VS Code webview, optional cursor overlay
- `docsforother/06_BACKEND_IMPLEMENTATION_STEPS.md` — phased build plan

---

## 12. Competitive Landscape (Contextual)

| Category | Examples | WaveClick differentiation |
|----------|----------|---------------------------|
| In-editor AI chat | Copilot Chat, Cursor | WaveClick is **OpenClaw-orchestrated**, **goal-directed workbench navigation** with **executable allowlist**, not free-form codegen-first |
| Screen recording tutors | Loom, docs sites | **Live**, **state-aware**, **interactive** |
| OS automation | AutoHotkey, macOS Shortcuts | **VS Code-native**, fewer fragile pixel assumptions |
| Voice assistants | Siri, Alexa | **Deep editor API integration** via OpenClaw tools |

---

## 13. Roadmap (Indicative)

| Horizon | Deliverable |
|---------|-------------|
| v0.1 | **OpenClaw** skill pack + minimal workflow; extension skeleton; mock envelope pipe; SCM open |
| v0.2 | Sidecar ↔ **OpenClaw** transport; transcript UI; real OpenClaw session |
| v0.3 | `vscode_probe_state` tool + Git snapshot; confirm gating |
| v0.4 | Sidecar production binaries + crash recovery; OpenClaw health UX |
| v1.0 | Marketplace, security review, enterprise bridge beta (**OpenClaw** + bridge) |
| v1.1 | Optional screenshot-on-demand **via OpenClaw** policy |
| v2.0 | Pluggable task runner (off by default), team policy packs on OpenClaw |

---

## 14. Assumptions & Dependencies

- **OpenClaw** is installed, configured, and reachable from the developer machine (or org network).
- User has permission to install VS Code extensions (some managed devices block Marketplace).
- Built-in **Git** extension enabled (common; not universal).
- Network egress allowed to **OpenClaw** and, as configured inside OpenClaw, to model providers.

---

## 15. Risks & Mitigations (Product-Level)

| Risk | Impact | Mitigation |
|------|--------|------------|
| OpenClaw outage / misconfig | No sessions | Health checks, clear errors, runbooks; multi-instance OpenClaw for enterprise |
| Command ID drift | Broken automation | Versioned alias maps + CI verification |
| Provider price spikes | Cost surprise | Session timers + org budgets on bridge **and** OpenClaw quotas |
| Privacy backlash | Adoption blocker | Redaction, clear disclosures, org DLP on OpenClaw |
| Over-trust in model | Wrong git ops | Confirm gates, immutable audit log option |

---

## 16. Acceptance Criteria (UAT Scenarios)

1. **Cold user:** Install → set key → “open source control” → SCM visible ≤ 3s after provider response (network dependent).
2. **Multi-root:** Two folders; user asks “commit in repo B only” → plan references correct repo root or asks clarifying question without executing.
3. **Denied mic:** UI degrades to text; no crash loops.
4. **Insider build:** Feature flags hide experimental providers.
