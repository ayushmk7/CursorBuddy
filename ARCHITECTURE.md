# CursorBuddy — Architecture Decision Record

**Date:** 2026-04-10  
**Status:** Accepted  

## Accepted Topology

CursorBuddy now has one documented product architecture for Larry:

```text
Larry overlay in VS Code <-> extension <-> sidecar <-> Go bridge <-> OpenClaw service <-> OpenAI Realtime Mini
```

More explicitly:

```text
[Larry overlay + VS Code extension] <-stdio/NDJSON-> [Sidecar]
                                                   |
                                                   v
                                      [Bridge (Go, this repo)]
                                                   |
                                                   v
                                 [OpenClaw service (this repo)]
                                                   |
                                                   v
                                    [OpenAI Realtime Mini API]
```

Larry is the cursor-following guide inside CursorBuddy. Larry is not the product name and not a separate backend product.

## What OpenClaw Means Here

`OpenClaw` is the real orchestration backend we are building in this repository. It is responsible for:

- Larry session and turn management
- low-latency audio/text interaction with OpenAI Realtime
- TTS-ready response generation for Larry guidance
- tool calling such as `vscode_probe_state`
- validating and emitting `AssistantEnvelopeV1`

The Go bridge remains a separate tier in front of OpenClaw for auth, policy, and stable bridge-mode connectivity.

## Why This Decision Was Made

This removes ambiguity from older docs and locks a faster, lower-overhead path:

- no more mock-first product direction
- no more direct sidecar-to-provider production path
- no more vague external OpenClaw dependency
- no more sidebar-first product definition for v1

The intended real product path is:

- VS Code only for v1
- Larry as the primary surface
- Go bridge for low-overhead bridge mode
- real OpenClaw service in this repo
- OpenAI Realtime Mini as the default low-cost backend

## V1 Behavior Limits

Larry v1 is intentionally constrained:

- Larry uses `Control+Option+L` as the current documented default for wake/follow
- Larry uses `Control+Option+V` as the current documented default for voice requests
- Larry uses `Control+Option+C` as the current documented default for the mini chat
- Larry follows the user's cursor by default, then moves on its own only when guiding toward a safe destination
- Larry responds with a short transient comic-style bubble plus TTS
- Larry uses a blue cursor identity with green idle, yellow thinking, and red error dot semantics
- Larry may perform safe navigation only
- Larry may open Source Control, reveal safe panels/files, move focus, and explain
- Larry may expose a secondary mini chat for follow-up questions after arriving at a destination
- Larry is not generic OS automation and not a broad computer-use agent in v1

## Trust Boundaries

| Boundary | Authentication / contract |
|----------|----------------------------|
| Extension Host -> Sidecar | local stdio IPC |
| Sidecar -> Bridge | user-scoped bridge JWT |
| Bridge -> OpenClaw service | service token / internal trusted channel |
| OpenClaw service -> OpenAI Realtime | OpenAI API key kept on the backend |

## Security Rules

- The extension never stores raw OpenAI credentials.
- The sidecar never talks directly to OpenAI Realtime in production.
- The only network payload that may trigger editor actions is validated `AssistantEnvelopeV1`.
- `vscode_probe_state` returns metadata by default, not arbitrary file bodies.
- High-risk editor actions still require confirmation in the local runtime.
- Safe-navigation actions remain the default execution boundary for Larry v1.

## User-Provided Inputs Still Required

Before the real Larry path can run end to end, the user must still provide:

- an OpenAI API key with Realtime access
- a bridge JWT secret
- an OpenClaw service token
- local ports or deployment hostnames for bridge and OpenClaw

## Superseded Assumptions

Do not follow older docs that assume any of the following:

- direct sidecar -> OpenClaw is the preferred production topology
- mock-only runtime paths are not part of the supported product architecture
- OpenClaw is an already-existing third-party deployment you must discover elsewhere
- sidebar-first UI is the intended primary v1 product surface
- Ollama or local-model-first architecture is the intended default path

Those assumptions have been replaced by the architecture above.
