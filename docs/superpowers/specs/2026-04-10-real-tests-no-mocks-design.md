# Superseded Test Design Note

This file is historical design context only.

## Status

Superseded by the current repo documentation that removes mock-backed architecture from the documented product story.

## Important note

Tests may still use controlled doubles where appropriate, but this file should not be read as defining the real product topology.

The current product architecture is:

```text
VS Code extension -> sidecar -> Go bridge -> OpenClaw service -> OpenAI Realtime
```

Use the current top-level docs for architecture decisions, not this archived design note.
