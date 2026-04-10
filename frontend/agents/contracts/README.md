# Contracts — read, do not fork here

Authoritative HTTP and domain contracts live under **`docs/`** and shared packages (if the monorepo adds them). This folder contains **pointers only**—do not duplicate OpenAPI or envelope definitions.

## Where to look

| Contract | Location |
|----------|----------|
| Bridge REST (illustrative / evolving) | [`docs/openapi.yaml`](../../../docs/openapi.yaml) |
| `AssistantEnvelopeV1` shape, action types, validation rules | [`docs/02_TECHNICAL_PRD.md`](../../../docs/02_TECHNICAL_PRD.md) §4 |
| Auth, session minting, trust boundaries | [`docs/03_BACKEND_PRD.md`](../../../docs/03_BACKEND_PRD.md) §4–6 |

## Implementation rule

When the Next.js app calls the bridge or shared APIs:

1. **Generate or sync types** from OpenAPI / shared Zod schemas—one source of truth in code (e.g. `packages/shared` if the repo adds it).
2. **Centralize** the HTTP client (base URL, auth headers, timeouts) in a single module; no ad-hoc `fetch` to bridge URLs across dozens of files.
3. **Validate** responses at the boundary if runtime variance is possible (Zod `.parse` on JSON).

## Postgres and Redis

- **No** OpenAPI file is required for Postgres/Redis; schemas live in ORM migrations and server-only modules.
- If multiple services share the same DB (discouraged without strong boundaries), document ownership in PRDs—do not invent cross-service coupling without an explicit spec.
