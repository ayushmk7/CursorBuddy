# CursorBuddy — Making Larry Fully Functional

**Date:** 2026-04-10  
**Audience:** Implementation work for the real product path

## Goal

Take CursorBuddy from its current partial state to a working real system centered on Larry:

```text
Larry overlay in VS Code -> extension -> sidecar -> Go bridge -> OpenClaw service -> OpenAI Realtime Mini
```

Larry is the cursor-following guide inside CursorBuddy. For v1, Larry is VS Code only, uses `Control+Option+L` for wake/follow, `Control+Option+V` for voice, `Control+Option+C` for the secondary mini chat, answers with a short bubble plus TTS, and may perform safe navigation only.

This document does not treat `mock-openclaw` as the product path.

Plain-English version: the thing we are trying to build is not "yet another chat panel." It should feel like a little guide that is actually with you while you work in VS Code. Larry follows your cursor while idle, then if you ask something simple like "how do I commit?", Larry moves on its own to the right place, explains the next move with a short bubble plus TTS, and only opens the secondary mini chat when you want a little more detail.

---

## What is already partially in place

- extension activation and basic session management
- sidecar IPC and streaming/client plumbing
- bridge code and routing skeleton
- shared envelope schemas
- `packages/openclaw-pack` contract artifacts

---

## What still needs to be implemented in code

### 1. Real Larry session flow in the extension

The extension still needs the real behavior for Larry sessions:

- respect bridge-mode selection
- use a bridge base URL
- pass bridge auth/session details correctly
- expose a minimal support surface for auth, logs, settings, and failure states

### 2. Real bridge/OpenClaw transport in the sidecar

The sidecar still needs to:

- stop assuming a mock-only or direct-only flow
- use the bridge session flow
- forward tool calls and tool results
- stream user audio to the real backend path
- receive text plus TTS guidance from the backend path

### 3. Real OpenClaw backend service

The repo direction assumes a real OpenClaw service that:

- speaks to `OpenAI Realtime Mini` by default
- manages Larry session and turn lifecycle
- grounds on VS Code state
- emits validated `AssistantEnvelopeV1`
- returns guidance suitable for overlay text and speech output

### 4. Larry overlay and local execution flow

Still needed:

- the primary Larry overlay surface inside VS Code
- default controls for wake/follow, voice, and mini chat
- follow mode versus self-move guidance mode
- blue Larry cursor rendering with green idle / yellow thinking / red error dot semantics
- transcript and guidance rendering for support/fallback UI
- transient bubble guidance rendering
- TTS playback path
- safe-navigation action handling such as opening Source Control and moving focus
- confirmation handling for anything above the safe-navigation boundary
- a simple local web preview that shows what Larry should feel like before the full extension path is done

That web preview does not replace the real product path. It is just a fast way to vibe-check the UI, states, and tone at a local URL before the full product is wired into VS Code and OpenClaw.

---

## What I need from the user before the real path can run

See `todo.md` for the authoritative list.

In short, the user still has to provide:

- OpenAI Realtime credentials
- runtime secrets
- local runtime choices
- actual service startup and token entry

---

## What is no longer the source of truth

The following should not define the project direction anymore:

- `mock-openclaw` as the end-to-end product story
- docs that describe OpenClaw as an unspecified external dependency
- docs that imply direct provider access from the extension or sidecar in production
- docs that treat the sidebar as the primary v1 product surface
- docs that focus on Ollama or local-model-first architecture

Older historical notes can remain only if clearly marked as superseded.
