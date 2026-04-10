# Glossary — web frontend agents

Terms used in [`README.md`](README.md), [`STACK.md`](STACK.md), and [`IMPLEMENTATION_STEPS.md`](IMPLEMENTATION_STEPS.md).

| Term | Meaning |
|------|---------|
| **App Router** | Next.js routing under `app/` using `layout.tsx`, `page.tsx`, nested routes, and Server Components by default. |
| **Route Handler** | `route.ts` under `app/api/...` exposing HTTP methods (`GET`, `POST`, …)—use for webhooks, callbacks, or explicit REST. |
| **Server Action** | Async function marked with Next.js directives, invoked from forms or client code, **runs on the server**—validate all inputs. |
| **Server Component** | React component that runs on the server only; may read env and use DB/Redis modules directly. Default in App Router. |
| **Client Component** | File with `"use client"`—runs in the browser; **must not** import Postgres/Redis drivers or secrets. |
| **Connection pool** | Reused DB connections (e.g. `pg.Pool`) to avoid exhausting Postgres connections under load. |
| **Migration** | Versioned SQL or ORM migration file that evolves the Postgres schema in a repeatable way. |
| **TTL** | Time-to-live on a Redis key—required for most cache and ephemeral markers. |
| **Key prefix** | Namespace for Redis keys (`app:{env}:...`) to avoid collisions between features or environments. |
| **Bridge** | Optional HTTP service per [`docs/03_BACKEND_PRD.md`](../../../docs/03_BACKEND_PRD.md)—the Next.js app may call it per [`docs/openapi.yaml`](../../../docs/openapi.yaml). |
| **OpenClaw** | Orchestrator for production reasoning/tools—**not** reimplemented in Next.js; see PRDs. |
