# Backend Alignment Notes

Canonical backend path:
`extension -> sidecar -> Go bridge -> Go OpenClaw service -> OpenAI Realtime`

Backend rules:
- OpenClaw is implemented in this repo.
- OpenClaw is written in Go.
- OpenAI Realtime is the default backend path.
- Missing OpenAI env should fail the realtime path, not silently switch architecture.
- `docs/openapi.yaml` is control-plane only.
- `packages/openclaw-pack/workflows/cursorbuddy_session.yaml` may describe workflow behavior, but not a conflicting provider strategy.

Local runtime rules:
- Bridge defaults to `127.0.0.1:8787`.
- OpenClaw defaults to `127.0.0.1:9090`.
- All env-dependent values stay as placeholders until the user supplies them.
- No provider keys live in the extension or sidecar.
