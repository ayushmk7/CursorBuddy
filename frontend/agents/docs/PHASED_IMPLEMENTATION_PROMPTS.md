# Phased implementation prompts — Web frontend

Copy-paste blocks for **Claude Code / Cursor**. Each block assumes the repo root is open and [`AGENT_SYSTEM_INSTRUCTIONS.md`](AGENT_SYSTEM_INSTRUCTIONS.md) applies. Stack details: [`STACK.md`](STACK.md). Phases align with [`IMPLEMENTATION_STEPS.md`](IMPLEMENTATION_STEPS.md).

**Path reminder:** Canonical PRDs live under **`docs/`** (ignore `docsforother/` if it appears in older sentences).

---

## Phase 0 — Decisions and gates

```
Read frontend/agents/docs/STACK.md, frontend/agents/docs/IMPLEMENTATION_STEPS.md Phase 0, and docs/01_GENERAL_PRD.md § scope.
Record: (1) package manager and where the Next.js app folder lives, (2) Drizzle vs Prisma for Postgres,
(3) ioredis vs @upstash/redis based on hosting model. Produce .env.example (no secrets) listing DATABASE_URL,
REDIS_URL (or Upstash split vars), and any bridge URLs. Output FRONTEND_ARCHITECTURE.md under frontend/
with a diagram: Browser → Next.js → Postgres vs Redis vs optional Bridge HTTP.
```

---

## Phase 1 — Next.js scaffold

```
Read frontend/agents/docs/AGENT_SYSTEM_INSTRUCTIONS.md and docs/05_FRONTEND_PROMPT.md only if the app includes marketing UI.
Scaffold Next.js (App Router, TypeScript strict) in the agreed directory. Add layout.tsx, page.tsx, ESLint, and build scripts.
If marketing landing is in-repo, map CSS variables to the liquid-glass tokens in docs/05_FRONTEND_PROMPT.md without importing DB clients in client components.
```

---

## Phase 2 — PostgreSQL

```
Read frontend/agents/docs/IMPLEMENTATION_STEPS.md Phase 2 and docs/03_BACKEND_PRD.md for entities/auth implications.
Add Postgres with the chosen ORM; create initial migrations for the minimal schema implied by PRDs (no speculative tables).
Provide a server-only db module with pooling. Never import db from "use client" files.
```

---

## Phase 3 — Redis

```
Read frontend/agents/docs/STACK.md § Redis and IMPLEMENTATION_STEPS Phase 3.
Add a server-only Redis module with key prefix app:{env}: and TTL on cache-style keys.
Implement one concrete PRD-backed use (session index, rate limit stub, or short-lived cache)—smallest scope first.
```

---

## Phase 4 — Auth and sessions (if PRD requires)

```
Read docs/03_BACKEND_PRD.md § auth/session and docs/openapi.yaml if bridge tokens matter.
Implement auth consistent with PRD: protected routes, server-side session validation, Redis or cookie storage per STACK.md.
Ensure NEXT_PUBLIC_* has no secrets. Add middleware or layout guards for private sections.
```

---

## Phase 5 — Server Actions and Route Handlers

```
Read docs/02_TECHNICAL_PRD.md §4 only for shared envelope/API shapes if the web app proxies or displays bridge data.
Implement Server Actions with Zod validation for forms; Route Handlers for webhooks or external callbacks.
Return typed errors; fail closed on invalid input.
```

---

## Phase 6 — Bridge / OpenAPI client (if in scope)

```
Read docs/openapi.yaml and docs/03_BACKEND_PRD.md. Generate or maintain a typed bridge client (single module for base URL and auth headers).
Do not scatter raw fetch URLs. Add contract tests or mocks proving paths and methods match OpenAPI.
```

---

## Phase 7 — Observability and health

```
Add structured server logging (redact tokens). Add /api/health that checks Postgres and Redis connectivity when those are configured.
Document required env vars in README under frontend/ or app folder.
```

---

## Verification prompt (before claiming “done”)

```
Read frontend/agents/docs/AGENT_SYSTEM_INSTRUCTIONS.md and frontend/agents/docs/IMPLEMENTATION_STEPS.md “How to verify done”.
List completed phases, run lint/build/test commands that exist, and state any skipped phases with reasons.
Confirm no database or Redis imports under client components and no secrets in NEXT_PUBLIC_*.
```
