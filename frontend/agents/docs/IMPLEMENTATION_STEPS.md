# Frontend implementation steps

Phased build order for the **Next.js** application using **PostgreSQL** and **Redis**. Agents should implement **in order** unless a task explicitly says otherwise; later phases assume earlier foundations exist.

## How to use this file

- Each phase has **outputs** and **verification** an agent must satisfy before claiming completion.
- Copy detailed prompts from [`PHASED_IMPLEMENTATION_PROMPTS.md`](PHASED_IMPLEMENTATION_PROMPTS.md).
- If a phase is not applicable (e.g. no bridge integration yet), document **SKIPPED: reason** in the PR or session notes.

---

## Phase 0 — Decisions and repo wiring

**Goal:** Fix stack choices and folder layout so later phases do not fork patterns.

**Decide / record:**

- Package manager (npm/pnpm/yarn) and monorepo boundary (app lives in `frontend/` vs `apps/web`).
- Postgres provider and Redis provider for **dev** and **prod** (placeholders OK until infra exists).
- ORM: Drizzle vs Prisma (one per repo).

**Outputs:**

- `package.json` scripts: `dev`, `build`, `lint`, `test`, `db:migrate` (names may vary but must exist).
- `.env.example` listing **all** required vars with dummy values—**no real secrets**.

**Verification:**

- `lint` and `build` succeed on a clean checkout (with documented env).
- `.env.example` matches Zod (or similar) env validation.

---

## Phase 1 — Next.js scaffold (App Router)

**Goal:** A minimal production-grade Next.js app with strict TypeScript.

**Outputs:**

- `app/` App Router structure, `layout.tsx`, `page.tsx`.
- ESLint + Prettier (or Biome) aligned with repo standards.
- Global styles and a minimal design baseline (if marketing UI is in scope, align tokens with [`docs/05_FRONTEND_PROMPT.md`](../../../docs/05_FRONTEND_PROMPT.md)).

**Verification:**

- `pnpm build` / `npm run build` passes.
- No accidental `"use client"` on files that only need server rendering.

---

## Phase 2 — PostgreSQL schema and migrations

**Goal:** Durable data model and migration path.

**Outputs:**

- Schema for entities required by PRDs (users/tenants/orgs as needed—**do not invent** entities not implied by PRDs without marking them provisional).
- Migrations folder checked in.
- Server-only DB module with **pooled** connections.

**Verification:**

- Migrations apply cleanly on empty DB.
- No raw queries in Client Components.

---

## Phase 3 — Redis integration

**Goal:** Redis client module with namespacing and TTL discipline per [`STACK.md`](STACK.md).

**Outputs:**

- Single server-side Redis factory (singleton pattern for long-lived Node; documented pattern for serverless).
- Example use: session index, cache, or rate-limit stub—pick the **smallest** PRD-backed need first.

**Verification:**

- Keys use `app:{env}:...` prefix.
- Example key has a TTL where applicable.

---

## Phase 4 — Auth and session (if required by PRD)

**Goal:** Users can sign in/out; sessions are server-validated; secrets stay server-only.

**Outputs:**

- Auth library choice aligned with [`docs/03_BACKEND_PRD.md`](../../../docs/03_BACKEND_PRD.md) (may be OAuth, magic link, or bridge-issued tokens—**follow PRD**, do not invent a parallel auth universe).
- Session storage: Redis and/or encrypted cookies per chosen pattern.
- Middleware or equivalent route protection for private sections.

**Verification:**

- Protected routes return 401/redirect when unauthenticated.
- No session secrets in client bundle.

---

## Phase 5 — API surface: Server Actions and/or Route Handlers

**Goal:** Typed, validated mutations and JSON APIs.

**Outputs:**

- Zod (or equivalent) schemas shared between actions and types.
- Route Handlers for webhooks/third parties; Server Actions for same-site forms where appropriate.

**Verification:**

- Invalid payloads fail closed with 4xx and no stack traces leaked to clients in production.

---

## Phase 6 — Bridge / OpenAPI integration (if in scope)

**Goal:** Typed integration with [`docs/openapi.yaml`](../../../docs/openapi.yaml).

**Outputs:**

- Single client module for bridge base URL and auth headers.
- Error mapping and retries policy documented (no unbounded retries).

**Verification:**

- Mock server or contract tests prove request/response shapes match OpenAPI.

---

## Phase 7 — Observability and hardening

**Goal:** Production readiness.

**Outputs:**

- Structured logging on server (no PII in logs; redact tokens).
- Health route if required by deployment (`/api/health` checks DB + Redis connectivity **without** exposing secrets).

**Verification:**

- Health check fails if DB or Redis is unreachable (when those deps are enabled).

---

## How to verify “done” (session prompt)

Use the verification block in [`PHASED_IMPLEMENTATION_PROMPTS.md`](PHASED_IMPLEMENTATION_PROMPTS.md).
