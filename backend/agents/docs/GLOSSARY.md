# Glossary

Terms as used in this repository’s CursorBuddy documentation and agent guidance.

| Term | Meaning |
|------|---------|
| **CursorBuddy** | Product name for the repo and shipped experience. |
| **Larry** | The cursor-following guide inside CursorBuddy. Larry is the primary user-facing surface in v1. |
| **OpenClaw** | **Required** runtime for workflows, tool loops, and emission of structured results to the client. All production orchestration goes through it. |
| **Sidecar** | Separate process for audio I/O, TTS playback, and stable transport to OpenClaw. Keeps the extension host responsive. |
| **Bridge** | Go server between sidecar and OpenClaw: JWT/auth, policy, audit, rate limits, and upstream session handling. |
| **`AssistantEnvelopeV1`** | JSON contract **from OpenClaw** that the extension validates and executes. Only envelope shape drives the **Action Executor**. |
| **Action Executor** | Extension code path that maps validated envelope actions to **allowlisted** VS Code APIs. |
| **OpenClaw pack** | Packaged workflows + tool specs + `SKILL.md` deployed **into** OpenClaw; not the VSIX. |
| **Larry overlay** | The primary cursor-adjacent/local guide surface used by the product inside VS Code. |
| **Support UI** | Minimal secondary surface for auth, settings, logs, blocked states, and fallback transcript/history. |
| **Host** | **VS Code** only for the active v1 product direction. |
| **TTFT / time-to-first-envelope** | Latency metrics; regressions can be release-blocking. |
