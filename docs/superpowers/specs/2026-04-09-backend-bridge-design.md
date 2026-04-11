# Superseded Backend Bridge Design

This design document is retained only as historical context.

## Status

Superseded by the current documented architecture in:

- `ARCHITECTURE.md`
- `docs/01_GENERAL_PRD.md`
- `docs/02_TECHNICAL_PRD.md`
- `docs/03_BACKEND_PRD.md`

## Why it is superseded

This older design assumed an architecture where:

- direct sidecar -> OpenClaw was the default preferred path
- the bridge was framed as optional enterprise infrastructure
- mock OpenClaw appeared in the development story

The current accepted architecture is now:

```text
VS Code extension -> sidecar -> Go bridge -> OpenClaw service -> OpenAI Realtime
```

with OpenClaw documented as the real backend service being built around a concrete provider choice.

Do not use this file as the source of truth for current implementation or documentation updates.
