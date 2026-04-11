# Agent system instructions

Use this document at the **start of every implementation session** for building CursorBuddy. It orients coding assistants toward the current PRDs and away from common mistakes.

## Canonical sources

Read in this order when scaffolding or changing behavior:

1. [`docs/01_GENERAL_PRD.md`](../../docs/01_GENERAL_PRD.md) — scope and the accepted real backend path.
2. [`docs/02_TECHNICAL_PRD.md`](../../docs/02_TECHNICAL_PRD.md) — VS Code integration, `AssistantEnvelopeV1`, sidecar rationale, session state machine.
3. [`docs/03_BACKEND_PRD.md`](../../docs/03_BACKEND_PRD.md) — bridge, OpenClaw service, auth, and OpenAI Realtime backend direction.
4. [`docs/07_LOCAL_CURSOR_AND_COMPANION.md`](../../docs/07_LOCAL_CURSOR_AND_COMPANION.md) — Larry overlay, support UI, accessibility.

**Path rule:** Always reference **`docs/…`** in new text. Older copies may say `docsforother/`; that is **not** the folder name in this repository.

## Non‑negotiables

| Rule | Detail |
|------|--------|
| **OpenClaw required** | Production reasoning, tools, and envelope emission run in the real **OpenClaw service**. The extension is sensor + actuator, not a second brain. |
| **No direct provider bypass** | Do not add release paths that call model vendor APIs from the extension or sidecar for orchestration. |
| **Executor input** | The only actuator contract is **`AssistantEnvelopeV1`** (validated, versioned). See [`docs/02_TECHNICAL_PRD.md`](../../docs/02_TECHNICAL_PRD.md) §4. |
| **COMMAND SAFETY** | Never pass unconstrained strings to `vscode.commands.executeCommand`. Use allowlists, alias maps, and schema validation. |
| **Current topology** | The accepted real path is Larry in VS Code -> extension -> sidecar -> Go bridge -> OpenClaw service -> OpenAI Realtime Mini. Do not reintroduce old direct/mock-first architecture text. |
| **Backend language** | When implementing bridge or other server-side backend code in this repo, use **Go** unless a doc explicitly says otherwise. |
| **V1 scope** | Larry is VS Code-only, uses `Control+Option+L` / `Control+Option+V` / `Control+Option+C` as the current documented defaults, follows by default, responds with a short bubble plus TTS, exposes mini chat as a secondary surface, and performs safe navigation only. |

## Backend vs local

- **Backend (PRD sense):** Go bridge + OpenClaw service + OpenAI Realtime integration.
- **Local runtime:** VS Code **extension host**, Larry overlay, minimal support UI, and sidecar (audio, transport, TTS).

Do **not** implement Larry UI, mic capture, or TTS playback inside the bridge. Those belong to local processes; the bridge handles policy, auth, and upstream connectivity, while OpenClaw handles orchestration and provider communication.

## Larry UX (summary)

Normative UX for Larry (default controls, follow-vs-guide motion, transient bubble guidance, TTS, secondary mini chat, safe navigation) lives in [`COMPANION_OVERLAY_UX_SPEC.md`](COMPANION_OVERLAY_UX_SPEC.md). It extends [`docs/07_LOCAL_CURSOR_AND_COMPANION.md`](../../docs/07_LOCAL_CURSOR_AND_COMPANION.md); it does not replace OpenClaw or envelope semantics.

## Host targets

Implement against **VS Code extension APIs** only for v1. [`HOST_COMPAT_VS_CURSOR.md`](HOST_COMPAT_VS_CURSOR.md) is historical context, not active product direction.

## When uncertain

- Re‑read [`docs/02_TECHNICAL_PRD.md`](../../docs/02_TECHNICAL_PRD.md) §4 (envelope) and §5 (threat model pointers).
- Prefer **documented** Git and workspace probing over shelling out to `git` unless the PRD allows fallback.
