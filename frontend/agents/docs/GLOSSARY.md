# Glossary — local frontend agents

Terms used across the local frontend docs in `frontend/`.

| Term | Meaning |
|------|---------|
| **Local frontend** | The UI that runs on-device in or alongside VS Code: Larry, support UI, status, confirmations. |
| **Larry** | The primary in-product guide surface in CursorBuddy. |
| **Support UI** | Secondary UI for auth, settings, logs, blocked state, and fallback transcript/history. |
| **Host** | VS Code for the active v1 product direction. |
| **Theme bridge** | Mapping local UI tokens to host variables like `--vscode-*`. |
| **OpenClaw** | Required orchestrator for production sessions; the frontend displays its state but does not replace it. |
| **Sidecar** | Local process that owns audio transport and may coordinate TTS/local behavior. |
| **AssistantEnvelopeV1** | Structured action payload from OpenClaw that informs steps, confirmations, and executor behavior. |
| **Blocked** | OpenClaw unavailable or unauthorized; the frontend should show remediation instead of pretending the session is live. |
| **Degraded** | OpenClaw is reachable but the session is in a fallback mode; UI remains functional with lower-confidence or slower behavior. |
| **Safety UI** | The area that summarizes high-risk actions and offers Cancel/Confirm controls. |
