# Superseded Backend Implementation Plan

This plan is archived and no longer represents the accepted architecture.

## Superseded assumptions

The original plan included now-outdated assumptions such as:

- direct sidecar -> OpenClaw as the preferred path
- bridge as merely optional enterprise infrastructure
- mock OpenClaw in the documented implementation story

## Current source of truth

Use these files instead:

- `ARCHITECTURE.md`
- `docs/01_GENERAL_PRD.md`
- `docs/02_TECHNICAL_PRD.md`
- `docs/03_BACKEND_PRD.md`
- `docs/06_BACKEND_IMPLEMENTATION_STEPS.md`

## Current accepted architecture

```text
VS Code extension -> sidecar -> Go bridge -> OpenClaw service -> OpenAI Realtime
```

Do not implement from this archived plan without first reconciling it against the current docs.
