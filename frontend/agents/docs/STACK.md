# Frontend stack — Next.js, PostgreSQL, Redis

This document is **normative** for agents implementing the web frontend. Deviations require an explicit product or security reason documented in PRDs or ADRs.

## Overview

```
Browser ──► Next.js (App Router)
              │
              ├── Server Components / Route Handlers / Server Actions
              │         │
              │         ├── PostgreSQL (durable state, migrations)
              │         └── Redis (ephemeral + fast: cache, sessions, rate limits)
              │
              └── Client Components (minimal; interactivity only)
```

## Next.js

| Topic | Guidance |
|-------|----------|
| **Router** | **App Router** (`app/`). Prefer **React Server Components** by default. |
| **Rendering** | Use static/ISR where possible; use dynamic rendering when auth or request-specific data requires it. |
| **Data mutations** | Prefer **Server Actions** with validation (e.g. Zod) for same-origin app flows; use **Route Handlers** (`app/api/.../route.ts`) for webhooks, third-party callbacks, or explicit REST. |
| **Env** | `NEXT_PUBLIC_*` only for values that are safe to expose to the browser. **Never** put database URLs, Redis passwords, or API secrets in `NEXT_PUBLIC_*`. |
| **Fetching** | Server Components: fetch directly or use the DB/Redis clients in server-only modules. Client Components: call Server Actions or typed API wrappers—**do not** instantiate DB/Redis clients in `"use client"` files. |

**Suggested baseline versions (pin in `package.json` to what the team standardizes):**

- `next`, `react`, `react-dom` — current stable major supported by Vercel/hosting.
- TypeScript `strict` mode enabled.

## PostgreSQL

| Topic | Guidance |
|-------|----------|
| **Role** | System of record: users (if not delegated to IdP-only), orgs, billing refs, audit logs, domain entities that must survive restarts. |
| **Access** | Only from **server** code: Server Components, Server Actions, Route Handlers, background workers. Use a **connection pool** (e.g. `pg` with pool, or ORM’s pooled mode). |
| **Migrations** | Checked into the repo; apply in CI and deploy pipelines. Do not hand-edit production without a migration file. |
| **ORM/query** | **Drizzle** or **Prisma**—pick one per repo and stay consistent. Agents should follow existing project choice if already present. |

**Do not store** large session blobs or hot cache keys in Postgres if Redis is available for that purpose—unless you need durable session audit.

## Redis

| Topic | Guidance |
|-------|----------|
| **Role** | Fast ephemeral data: session store (if using Redis-backed sessions), HTTP rate limiting, short-lived feature flags cache, idempotency keys, job queue metadata (if using Redis as a queue backend), request-scoped deduplication. |
| **Access** | Only from **server** code (same rule as Postgres). Prefer a single shared module that configures the client once. |
| **Client** | **ioredis** or **@upstash/redis** (serverless-friendly)—match hosting (long-lived Node vs serverless). |
| **TTL** | Every cache key should have a **TTL** unless there is a documented exception. |
| **Key namespacing** | Use a prefix: `app:{env}:{feature}:{id}` to avoid collisions across services. |

**Do not use Redis as** the only copy of business-critical data that must survive eviction—Postgres is the durable store.

## When to use which

| Need | Store |
|------|--------|
| User profile, org membership, entitlements | Postgres |
| “Is this JWT/session still valid?” (server-side session index) | Redis (often) + optional Postgres audit |
| Idempotent webhook processing marker (short TTL) | Redis |
| Report/dashboard query result cache | Redis |
| Financial or compliance-grade audit trail | Postgres (append-only tables) |

## Local development

Agents should assume **Docker Compose** or **devcontainers** may provide Postgres + Redis locally; document required env vars in the app’s `.env.example` when scaffolding (never commit secrets).

## Hosting notes (non-prescriptive)

- **Vercel** + managed Postgres (Neon, Supabase, RDS) + Upstash Redis is a common pattern; connection pooling and serverless timeouts still require **disciplined** DB/Redis usage (no long transactions in serverless handlers).
