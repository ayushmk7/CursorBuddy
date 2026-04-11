# CursorBuddy — General Product Requirements Document

**Project:** CursorBuddy  
**Version:** 1.0  
**Date:** April 2026

---

## 1. Product Overview

CursorBuddy is a VS Code-only guidance product built around Larry, a cursor-following guide that helps the user get real work done inside the editor.

Larry is:

- the in-product guide inside CursorBuddy
- the primary user-facing surface in v1
- limited to VS Code for v1
- powered by OpenClaw through a Go bridge path

Larry is not:

- a separate product name
- a generic OS automation tool
- a local-model-first assistant

The product consists of:

- a VS Code extension
- a local sidecar process
- a Go bridge service
- a real OpenClaw backend service
- OpenAI Realtime Mini as the default recommended model transport behind OpenClaw

### 1.1 Normative runtime shape

For this repository, the canonical runtime is:

```text
Larry overlay in VS Code -> extension -> sidecar -> Go bridge -> OpenClaw service -> OpenAI Realtime Mini
```

This is the single documented product path for the real v1 experience.

### 1.2 What Larry does in v1

Larry v1 is deliberately narrow:

- uses `Control+Option+L` as the current documented default for wake/follow
- uses `Control+Option+V` as the current documented default for voice requests
- uses `Control+Option+C` as the current documented default for the mini chat
- follows the user's cursor by default and moves on its own only when guiding toward a safe destination
- responds with a short transient comic-style text bubble plus TTS
- uses VS Code state as the primary grounding source
- performs safe navigation only

Example:

- the user presses `Control+Option+V` and says, "Larry, how do I commit?"
- Larry opens Source Control in VS Code
- Larry moves there on its own, then points/explains where the commit flow lives
- Larry can speak the guidance out loud while also showing a short bubble near itself
- the mini chat can expand afterward if the user wants follow-up detail

### 1.3 What OpenClaw means in this repo

OpenClaw is the backend orchestration layer for CursorBuddy. It is the real service responsible for:

- handling Larry session lifecycle
- receiving streamed audio or text turns
- calling backend tools
- using OpenAI Realtime for inference
- returning guidance for text plus TTS
- emitting validated `AssistantEnvelopeV1` responses for the extension to execute

### 1.4 Hard rules

| Rule | Detail |
|------|--------|
| **R1** | Real sessions require the bridge and OpenClaw service to be running. |
| **R2** | Production flows must not bypass OpenClaw and call OpenAI directly from the extension or sidecar. |
| **R3** | The extension only executes validated `AssistantEnvelopeV1` payloads. |
| **R4** | Larry may perform safe navigation only in v1. |
| **R5** | Mock OpenClaw is not the product path and should not be described as such in current docs. |

---

## 2. User Value

The user interacts with Larry inside VS Code and gets:

- grounded guidance based on real editor state
- deterministic, allowlisted navigation actions in the editor
- cursor-adjacent help that feels attached to where they are working
- brief bubble text plus TTS explanation for what Larry is showing them
- a secondary mini chat for follow-up detail instead of a big persistent panel

The point is not generic chat. The point is to help the user get real work done in VS Code using real host APIs, a trustworthy backend contract, and a guide that stays visually present.

---

## 3. System Responsibilities

### 3.1 Larry overlay and extension

The extension layer owns:

- Larry as the primary guide surface
- safe action execution
- VS Code state access
- minimal support UI for auth, logs, settings, and failure states
- secure local secret storage

### 3.2 Sidecar

The sidecar owns:

- long-lived local transport
- audio capture and streaming
- TTS playback support where implemented
- IPC with the extension
- connection to the Go bridge

### 3.3 Go bridge

The bridge owns:

- bridge-mode HTTP and WebSocket entrypoints
- user auth and session minting
- upstream proxying to OpenClaw
- org policy and auditing hooks

### 3.4 OpenClaw service

The OpenClaw service owns:

- orchestration and reasoning
- OpenAI Realtime session management
- tool calling such as `vscode_probe_state`
- generation of `AssistantEnvelopeV1`
- response payloads needed for overlay text and speech output

### 3.5 OpenAI Realtime Mini

`OpenAI Realtime Mini` is the default recommended backend for Larry because it preserves the real-time architecture while keeping recurring inference costs lower than the larger Realtime tier.

---

## 4. First-Run Requirements

A real working setup requires:

- the Go bridge running
- the OpenClaw service running
- an OpenAI API key with Realtime access configured on the backend
- a user auth token stored in VS Code
- bridge mode enabled in extension settings

If any of those are missing, the real Larry path is not functional.

---

## 5. Non-Goals

CursorBuddy v1 is not:

- a direct-to-OpenAI VS Code extension
- a mock-backed demo product
- a generic OS automation tool
- a fully offline local-model product
- a replacement for the backend orchestration layer

---

## 6. Success Criteria

The product is considered functional when:

- a user can start a real Larry session from VS Code
- the documented default controls `Control+Option+L`, `Control+Option+V`, and `Control+Option+C` work through the local runtime
- audio or text turns reach OpenClaw through the bridge
- OpenClaw calls OpenAI Realtime and returns validated envelopes
- Larry can safely open Source Control and similar VS Code surfaces
- Larry follows by default, moves on its own during safe guidance, renders brief bubble guidance, and can provide TTS output
- anything above the safe-navigation boundary still requires explicit confirmation

---

## 7. Glossary

| Term | Meaning |
|------|---------|
| Larry | The cursor-following guide inside CursorBuddy |
| OpenClaw | The real CursorBuddy backend orchestration service in this repo |
| Bridge mode | Extension/sidecar path that goes through the Go bridge before OpenClaw |
| OpenAI Realtime Mini | The default recommended realtime model backend for Larry |
| AssistantEnvelopeV1 | The structured action contract executed by the extension |

---

## 8. Related Documents

- `docs/02_TECHNICAL_PRD.md`
- `docs/03_BACKEND_PRD.md`
- `docs/06_BACKEND_IMPLEMENTATION_STEPS.md`
- `ARCHITECTURE.md`
