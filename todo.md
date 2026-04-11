# CursorBuddy — Remaining User Inputs For Larry

This file is the authoritative list of inputs the user still needs to provide before the real Larry path can run end to end.

Larry is the cursor-following guide inside CursorBuddy. Larry runs in VS Code only for v1, uses `Control+Option+L` for wake/follow, `Control+Option+V` for voice, `Control+Option+C` for the secondary mini chat, responds with a short comic-style bubble plus TTS, and may perform safe navigation only.

Canonical runtime:

```text
Larry overlay in VS Code -> extension -> sidecar -> Go bridge -> OpenClaw service -> OpenAI Realtime Mini
```

---

## 1. Provide an OpenAI API key with Realtime access

OpenClaw in this repo is the real orchestration backend. It needs an OpenAI API key that can use the Realtime API.

Required from you:

- An OpenAI API key with Realtime access
- Approval to use `OpenAI Realtime Mini` as the default backend for lowest recurring cost

Without this, Larry cannot listen, reason, speak, or guide through the real backend path.

---

## 2. Confirm the runtime shape

For now the intended operating mode is local development on your machine, not hosted infrastructure.

Default local shape:

- Larry and the extension running inside VS Code
- Go bridge on `http://127.0.0.1:8787`
- OpenClaw service on localhost

If you later want a deployed setup, the docs can be extended for:

- a public or private hostname for the Go bridge
- a hostname for the OpenClaw service
- HTTPS/WSS termination

---

## 3. Provide or approve the runtime secrets

The real Larry path needs backend secrets that should come from you.

Required from you:

- A bridge JWT signing secret
- An OpenClaw service token used by the bridge
- Any Redis credentials if rate limiting or shared session state are kept outside local defaults

I can wire code and docs to read these values, but I should not invent your production secrets.

---

## 4. Confirm auth identity defaults

The bridge and auth flow still need identity values.

Examples:

- JWT issuer such as `cursorbuddy-bridge`
- default org slug
- the local user identity to mint dev or long-lived tokens for

If you do not care yet, local-dev placeholders are acceptable, but final values still need to come from you later.

---

## 5. Be ready to run the real services

Once the real path is implemented, you will still need to run the system yourself.

Expected steps:

- Start Redis if the bridge/runtime still requires it
- Run the Go bridge with the configured env vars
- Run the OpenClaw service with the OpenAI key
- Store the user auth token in VS Code
- Start Larry from VS Code, use the documented default shortcuts, and verify Larry follows by default before guiding

If we need to move faster before the full extension path is wired up, a simple local web preview is also fair game. That preview is just for showing the vibe, the states, the control defaults, and the guidance flow at a local URL. It should stay disposable and git-ignored.

---

## 6. What you do not need to provide

You do **not** need:

- a separate third-party OpenClaw product
- Ollama or a local model runtime as the main architecture
- hosted infrastructure just to develop the real v1 flow locally

The remaining blockers are credentials, secrets, and runtime startup choices, not an unknown external dependency.
