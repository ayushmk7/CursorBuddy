# Frontend agents — guidance for Claude / Cursor

This folder holds **documentation and copy-paste prompts** for building the **Next.js** web application and its **PostgreSQL** and **Redis** layers. It contains **no runnable application code** by default—use these files as the **entry point**, then read the canonical PRDs under [`docs/`](../../../docs/).

## Stack (normative)

| Layer | Choice | Role |
|--------|--------|------|
| Framework | **Next.js** (App Router, TypeScript) | UI, SSR/RSC, Route Handlers, Server Actions |
| Primary datastore | **PostgreSQL** | Durable entities, migrations |
| Fast datastore | **Redis** | Sessions, cache, rate limits, ephemeral coordination |

Details: [`STACK.md`](STACK.md).

## Read first

1. [`AGENT_SYSTEM_INSTRUCTIONS.md`](AGENT_SYSTEM_INSTRUCTIONS.md) — non-negotiables (server/client boundaries, secrets, Redis vs Postgres).
2. [`STACK.md`](STACK.md) — versions, libraries, when to use Redis vs Postgres.
3. [`GLOSSARY.md`](GLOSSARY.md) — Next.js and data-layer terms used in these docs.
4. [`IMPLEMENTATION_STEPS.md`](IMPLEMENTATION_STEPS.md) — phased build order and verification gates.
5. [`PHASED_IMPLEMENTATION_PROMPTS.md`](PHASED_IMPLEMENTATION_PROMPTS.md) — copy-paste prompts aligned with those steps.

## Product and design sources

| Document | Use |
|----------|-----|
| [`docs/01_GENERAL_PRD.md`](../../../docs/01_GENERAL_PRD.md) | Product scope and orchestration context |
| [`docs/02_TECHNICAL_PRD.md`](../../../docs/02_TECHNICAL_PRD.md) | Contracts (e.g. `AssistantEnvelopeV1`), integration boundaries |
| [`docs/03_BACKEND_PRD.md`](../../../docs/03_BACKEND_PRD.md) | Bridge, auth—align web app auth with this |
| [`docs/05_FRONTEND_PROMPT.md`](../../../docs/05_FRONTEND_PROMPT.md) | **Marketing / landing** visual language (if that surface lives in the Next.js app) |
| [`docs/openapi.yaml`](../../../docs/openapi.yaml) | REST shape for bridge or HTTP APIs the frontend may call |

**Path rule:** Canonical paths are **`docs/…`**. Ignore historical references to `docsforother/` in older prose.

## Contracts (do not duplicate)

- [`../contracts/README.md`](../contracts/README.md) — where OpenAPI and shared schemas live; generate client types from a single source of truth.

## How to run a session with an agent

From the repository root:

> Read `frontend/agents/docs/AGENT_SYSTEM_INSTRUCTIONS.md`, `frontend/agents/docs/STACK.md`, and `docs/01_GENERAL_PRD.md`. Summarize the frontend architecture boundaries (Next.js vs bridge vs local extension). List the next implementation phase from `frontend/agents/docs/IMPLEMENTATION_STEPS.md` that applies to my task.

Always use paths relative to the repo root.
