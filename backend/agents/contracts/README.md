# Contracts — read, do not fork here

Authoritative API and schema definitions live under **`docs/`**. This folder intentionally contains **no duplicate OpenAPI or JSON Schema files**.

## Where to look

| Contract | Location |
|----------|----------|
| Bridge REST overview (illustrative) | [`docs/openapi.yaml`](../../../docs/openapi.yaml) |
| `AssistantEnvelopeV1` shape, action types, validation rules | [`docs/02_TECHNICAL_PRD.md`](../../../docs/02_TECHNICAL_PRD.md) §4 |
| Session minting and auth flows | [`docs/03_BACKEND_PRD.md`](../../../docs/03_BACKEND_PRD.md) §4–6 |

When implementing, generate **one shared Zod/JSON Schema** in code (e.g. `packages/shared`) from the Technical PRD and reuse in OpenClaw pack + extension as described in [`docs/06_BACKEND_IMPLEMENTATION_STEPS.md`](../../../docs/06_BACKEND_IMPLEMENTATION_STEPS.md). If you add bridge code in this repo, implement that backend in **Go**.
