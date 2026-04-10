# Glossary — local frontend agents

Terms used across the local frontend docs in `frontend/`.

| Term | Meaning |
|------|---------|
| **Local frontend** | The UI that runs on-device in or alongside the host app: sidebar webview, overlay, transcript, status, confirmations. |
| **Sidebar webview** | The primary in-host UI surface for transcript, steps, status, and high-risk confirmations. |
| **Overlay** | Optional cursor-adjacent capsule that shows short assistant text and waveform near the pointer. |
| **Host** | VS Code or Cursor running the local product UI. |
| **Theme bridge** | Mapping local UI tokens to host variables like `--vscode-*`. |
| **OpenClaw** | Required orchestrator for production sessions; the frontend displays its state but does not replace it. |
| **Sidecar** | Local process that owns audio transport and may coordinate overlay behavior. |
| **AssistantEnvelopeV1** | Structured action payload from OpenClaw that informs steps, confirmations, and executor behavior. |
| **Blocked** | OpenClaw unavailable or unauthorized; the frontend should show remediation instead of pretending the session is live. |
| **Degraded** | OpenClaw is reachable but the session is in a fallback mode; UI remains functional with lower-confidence or slower behavior. |
| **Safety footer** | The area that summarizes high-risk actions and offers Cancel/Confirm controls. |
| **Pointer follow** | Overlay position updates that stay near the pointer with throttling and edge-aware flipping. |
