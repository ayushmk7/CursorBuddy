# Agent system instructions (WaveClick / CursorBuddy)

Use this document at the **start of every implementation session** for building WaveClick (this repo’s product codename). It orients **Claude Code, Cursor agents, or other coding assistants** toward the existing PRDs and away from common mistakes.

## Canonical sources

Read in this order when scaffolding or changing behavior:

1. [`docs/01_GENERAL_PRD.md`](../../docs/01_GENERAL_PRD.md) — scope, OpenClaw as orchestrator, latency mindset.
2. [`docs/02_TECHNICAL_PRD.md`](../../docs/02_TECHNICAL_PRD.md) — VS Code integration, `AssistantEnvelopeV1`, sidecar rationale, session state machine.
3. [`docs/03_BACKEND_PRD.md`](../../docs/03_BACKEND_PRD.md) — bridge vs direct sidecar→OpenClaw; auth; optional API surface.
4. [`docs/07_LOCAL_CURSOR_AND_COMPANION.md`](../../docs/07_LOCAL_CURSOR_AND_COMPANION.md) — webview, optional overlay, accessibility.

**Path rule:** Always reference **`docs/…`** in new text. Older copies may say `docsforother/`; that is **not** the folder name in this repository.

## Non‑negotiables

| Rule | Detail |
|------|--------|
| **OpenClaw required** | Production reasoning, tools, and envelope emission run in **OpenClaw**. The extension is sensor + actuator, not a second brain. |
| **No direct provider bypass** | Do not add release paths that call model vendor APIs from the extension for orchestration. A **dev-only mock** may exist for UI tests only—disabled in shipping artifacts. |
| **Executor input** | The only actuator contract is **`AssistantEnvelopeV1`** (validated, versioned). See [`docs/02_TECHNICAL_PRD.md`](../../docs/02_TECHNICAL_PRD.md) §4. |
| **COMMAND SAFETY** | Never pass unconstrained strings to `vscode.commands.executeCommand`. Use allowlists, alias maps, and schema validation. |
| **Latency** | Prefer **fewer hops** when policy allows (sidecar → OpenClaw). Use bridge only when enterprise/policy requires it; co‑locate if you do. See [`docs/03_BACKEND_PRD.md`](../../docs/03_BACKEND_PRD.md) §2. |

## Backend vs local

- **Backend (PRD sense):** OpenClaw + **optional** bridge service (session minting, org policy, proxy).
- **Local runtime:** VS Code (or Cursor) **extension host**, **webview**, **sidecar** (audio, transport), **optional overlay** process.

Do **not** implement **pointer‑following UI**, **mic capture**, or **streaming caption layout** inside the bridge. Those belong to local processes; the bridge may only handle policy, auth, and upstream connectivity per [`docs/03_BACKEND_PRD.md`](../../docs/03_BACKEND_PRD.md).

## Companion UX (summary)

Normative UX for the cursor‑adjacent companion (chord, voice, streaming bubble) lives in [`COMPANION_OVERLAY_UX_SPEC.md`](COMPANION_OVERLAY_UX_SPEC.md). It **extends** [`docs/07_LOCAL_CURSOR_AND_COMPANION.md`](../../docs/07_LOCAL_CURSOR_AND_COMPANION.md) §4; it does not replace OpenClaw or envelope semantics.

## Host targets

Implement against **VS Code extension APIs** first; validate on **Cursor** where product requirements need it. See [`HOST_COMPAT_VS_CURSOR.md`](HOST_COMPAT_VS_CURSOR.md).

## When uncertain

- Re‑read [`docs/02_TECHNICAL_PRD.md`](../../docs/02_TECHNICAL_PRD.md) §4 (envelope) and §5 (threat model pointers).
- Prefer **documented** Git and workspace probing over shelling out to `git` unless the PRD allows fallback.
