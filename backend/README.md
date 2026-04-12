# Backend

This folder is for backend implementation work for CursorBuddy.

**Backend language choice:** use **Go** for server-side backend code in this repository, including the bridge and the real OpenClaw service layer described by the current docs.

The canonical local backend shape is:
`sidecar -> Go bridge -> Go OpenClaw service -> OpenAI Realtime`

OpenClaw is not an external runtime to discover elsewhere. It is the real orchestration backend implemented in this repository, and OpenAI credentials belong only in the OpenClaw service configuration.

Environment-dependent items are tracked in `toddocauseofenv.md`, and the local startup flow is documented in `backend/LOCAL_BACKEND_RUNBOOK.md`.

Local runtime pieces such as Larry in VS Code, the extension, the sidecar, and other client-side tooling may still use their own languages as documented elsewhere.
