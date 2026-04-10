# Agent system instructions — Web frontend (Next.js + Postgres + Redis)

Use this document at the **start of every implementation session** that changes the **web application** (Next.js) or its **Postgres/Redis** integration. It orients **Claude Code, Cursor agents, or other coding assistants** toward canonical PRDs and away from common mistakes.

## Canonical sources

Read in this order when scaffolding or changing behavior:

1. [`docs/01_GENERAL_PRD.md`](../../../docs/01_GENERAL_PRD.md) — product scope and orchestration context.
2. [`docs/02_TECHNICAL_PRD.md`](../../../docs/02_TECHNICAL_PRD.md) — `AssistantEnvelopeV1`, extension/sidecar boundaries (web must not reimplement local-only surfaces).
3. [`docs/03_BACKEND_PRD.md`](../../../docs/03_BACKEND_PRD.md) — bridge, auth, optional HTTP API—align cookies, CORS, and session strategy if the web app talks to the bridge.
4. [`STACK.md`](STACK.md) — Next.js, Postgres, Redis roles and constraints.
5. [`IMPLEMENTATION_STEPS.md`](IMPLEMENTATION_STEPS.md) — phased order and gates.

For **marketing landing** visuals (if in scope for the same Next.js app), also read [`docs/05_FRONTEND_PROMPT.md`](../../../docs/05_FRONTEND_PROMPT.md).

**Path rule:** Reference **`docs/…`** in new text. Ignore `docsforother/` if it appears in older prose.

## Non-negotiables

| Rule | Detail |
|------|--------|
| **Server-only data layers** | **PostgreSQL and Redis clients must only run in server contexts** (Server Components, Server Actions, Route Handlers, server utilities). Never import them from Client Components or code that ships to the browser bundle. |
| **Secrets** | Database URLs, Redis passwords, bridge API keys, and provider keys belong in **server env** only—not `NEXT_PUBLIC_*`. Validate env at startup with a schema (e.g. Zod). |
| **Contract alignment** | HTTP calls to the bridge or backend must match [`docs/openapi.yaml`](../../../docs/openapi.yaml) and PRD auth sections. Generate or hand-maintain **typed** clients; avoid untyped `fetch` strings scattered across the app. |
| **No duplicate orchestration** | The **editor extension and OpenClaw** own on-device orchestration per PRD. The **web app** does not replace the extension host or sidecar; it may offer account, policy, waitlist, org, or bridge-adjacent flows as defined in PRDs. |
| **Migrations** | Schema changes go through **versioned migrations**. No “just run ALTER TABLE” without a migration file in repo. |
| **Redis discipline** | Use **TTLs** and **key prefixes** per [`STACK.md`](STACK.md). Do not store sole copies of critical business facts only in Redis. |
| **Command / action safety** | Any Server Action or API route that triggers side effects must **validate input** (Zod or equivalent), enforce **authz** (user can only act on their tenant’s rows), and be **idempotent** where retries are possible (especially with Stripe/webhooks). |

## Frontend vs local runtime (clarity)

- **Next.js web app:** HTTP/HTML/SSR/RSC; Postgres/Redis; optional calls to **bridge** APIs per OpenAPI/PRD.
- **Local product:** VS Code/Cursor extension, webview, sidecar, optional overlay—specified in [`docs/07_LOCAL_CURSOR_AND_COMPANION.md`](../../../docs/07_LOCAL_CURSOR_AND_COMPANION.md). **Do not** move mic capture, pointer-locked overlay, or extension host logic into Next.js.

## Testing expectations

- **Unit/integration:** Vitest (or Jest) for pure logic and server utilities.
- **E2E:** Playwright for critical flows (auth, paywall, settings)—keep tests deterministic; use test DB/Redis where applicable.

## When uncertain

- Re-read [`docs/03_BACKEND_PRD.md`](../../../docs/03_BACKEND_PRD.md) for auth and trust boundaries.
- Re-read [`STACK.md`](STACK.md) for whether data belongs in Postgres or Redis.
- Prefer **typed** contracts from [`../contracts/README.md`](../contracts/README.md) over inventing new response shapes.
