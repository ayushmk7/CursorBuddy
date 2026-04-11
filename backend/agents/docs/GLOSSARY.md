# Glossary

Terms as used in this repository’s CursorBuddy documentation and agent guidance.

| Term | Meaning |
|------|---------|
| **CursorBuddy** | Product: realtime voice + visual companion for the editor; OpenClaw‑orchestrated. |
| **CursorBuddy** | Repository / branding context; implementation still follows CursorBuddy PRDs unless explicitly forked. |
| **OpenClaw** | **Required** runtime for workflows, ReAct‑style tool loops, memory/skills, and emission of structured results to the client. All production orchestration goes through it. |
| **Sidecar** | Separate process (Node or native) for **audio I/O**, stable transport to OpenClaw, and optionally owning or coordinating **overlay** UI. Keeps the extension host responsive. |
| **Bridge** | **Optional** Go server between sidecar and OpenClaw (or upstream): mTLS/JWT, org policy, audit, rate limits. Not required for latency alone. See [`docs/03_BACKEND_PRD.md`](../../docs/03_BACKEND_PRD.md). |
| **`AssistantEnvelopeV1`** | JSON contract **from OpenClaw** (via tool/event transport) that the extension validates and executes. Only envelope shape drives the **Action Executor**. See [`docs/02_TECHNICAL_PRD.md`](../../docs/02_TECHNICAL_PRD.md) §4. |
| **Action Executor** | Extension code path that maps validated envelope actions to **allowlisted** VS Code APIs (commands, reveal, decorations, confirms). |
| **OpenClaw pack** | Packaged workflows + tool specs + `SKILL.md` (etc.) deployed **into** OpenClaw; not the VSIX. |
| **Overlay** | Optional **transparent OS‑level** (or host‑level) surface for the **cursor‑adjacent capsule** (caption, waveform). Degrades to sidebar + editor decorations when unavailable. |
| **Local cursor (companion)** | UX concept: UI **feels tied** to where the user works—pointer‑adjacent pill and/or editor highlights. See [`COMPANION_OVERLAY_UX_SPEC.md`](COMPANION_OVERLAY_UX_SPEC.md). |
| **Host** | **VS Code** or **Cursor** running the extension; both target the same extension API family with minor deltas. See [`HOST_COMPAT_VS_CURSOR.md`](HOST_COMPAT_VS_CURSOR.md). |
| **TTFT / time‑to‑first‑envelope** | Latency metrics; regressions can be release‑blocking per [`docs/01_GENERAL_PRD.md`](../../docs/01_GENERAL_PRD.md). |
