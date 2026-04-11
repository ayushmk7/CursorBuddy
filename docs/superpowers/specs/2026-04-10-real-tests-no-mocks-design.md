# Real Test Infrastructure — No Mocks Design

**Date:** 2026-04-10  
**Status:** Approved  
**Scope:** `packages/sidecar` tests + `packages/extension` tests

---

## Problem

Two test packages have incomplete coverage because mock objects don't implement all methods:

1. `packages/sidecar/src/__tests__/ipc.test.ts` — session handler mocks only have `start`/`stop`; `audioStart`, `audioStop`, `toolResult` are never exercised.
2. `packages/sidecar/src/__tests__/session.test.ts` — mock client factory objects only have `connect`, `sendText`, `dispose`; `sendAudio`, `sendAudioEnd`, `sendToolResult` are never called.
3. `packages/extension/src/__tests__/executor.test.ts` — runs under vitest with `vscode` aliased to `vi.fn()` stubs; no real VS Code API is ever invoked.

---

## Solution

### Part 1 — Sidecar: Real WebSocket server in tests

**Files changed:**
- `packages/sidecar/src/__tests__/ipc.test.ts` — rewritten
- `packages/sidecar/src/__tests__/session.test.ts` — rewritten

**Approach:**

Each test file uses `beforeAll` / `afterAll` to spin up a real `ws.WebSocketServer` on port `0` (OS assigns a free port). Tests use `defaultClientFactory` from `openclaw-client.ts` and `createSessionHandler` from `session.ts` directly. No `vi.fn()`, no factory overrides.

**ipc.test.ts — new cases added:**
- `audio.start` with a valid session handle returns `{ ok: true }`
- `audio.start` with an unknown session handle returns `{ ok: false }`
- `audio.stop` calls through without crashing
- `tool_call.result` with a valid session handle sends the message over the wire and returns `{ ok: true }`
- The existing `session.start`, `session.stop`, malformed JSON, and `E_UNKNOWN_METHOD` tests are kept but rewritten to use the real handler

**session.test.ts — mock factory removed:**
- `makeMockClientFactory` deleted entirely
- Tests use `defaultClientFactory` and a live `WebSocketServer`
- Server records received messages in a `received[]` array
- Assertions check actual wire-level messages (e.g. `tool_result` JSON sent to server, `audio_end` sent after `audioStop`)
- The `WAVECLICK_MOCK_OPENCLAW=1` env-var test is kept: it verifies the client connects to `ws://localhost:9090` instead of the supplied URL (the test server listens on 9090 for that case)
- The `onEnvelope` and `onError` event tests remain; server sends real JSON frames, `emit` collector asserts

**Audio path:**
- `audioStart` calls `startRecording` from `audio.ts`, which spawns `sox` via `node-record-lpcm16`
- Tests cover this path and assert `{ ok: true }` is returned
- If `sox` is not installed on the test machine, the call throws and returns `E_INTERNAL` — this is real behavior, not masked

### Part 2 — Extension: `@vscode/test-electron` replaces vitest

**Files changed/added:**
- `packages/extension/package.json` — add `@vscode/test-electron` + `@vscode/test-cli` devDependencies; update `"test"` script
- `packages/extension/src/test/runTests.ts` — new entry point that launches VS Code headless and runs the suite
- `packages/extension/src/test/suite/index.ts` — Mocha suite loader
- `packages/extension/src/test/suite/executor.test.ts` — same test cases as today using Mocha `describe`/`it`, real `vscode` API
- `packages/extension/vitest.config.ts` — deleted
- `packages/extension/src/__mocks__/vscode.ts` — deleted

**How it works:**
- `@vscode/test-electron` downloads or reuses an installed VS Code binary, launches it with `--extensionDevelopmentPath` pointing at the package, runs the Mocha suite inside the extension host
- `vscode.commands.executeCommand` and `vscode.window.show*` are the real VS Code implementations — no stubs
- High-risk command tests that call `showWarningMessage` need a way to accept or dismiss the modal; `@vscode/test-electron` supports programmatic interaction via the `vscode.window` API directly from within the test (since tests run inside the host, they can call `vscode.commands.executeCommand` to trigger and observe effects without needing UI automation)

**Executor test strategy inside real VS Code:**
- `open_scm` alias → asserts the SCM view becomes visible (check `vscode.window.activeTextEditor` state or use `vscode.commands.executeCommand` return value)
- `show_information_message` → called directly; return value observed
- `noop` → log callback asserts string contains "noop"
- High-risk confirm/cancel → replaced with `requestConfirm` callback parameter (already on `executeEnvelope`) set to a function that returns `true` or `false`; no modal shown, real code path exercised
- Invalid envelope → Zod parse fails, log callback asserts error string

### Part 3 — What does not change

- All production source files: `ipc.ts`, `session.ts`, `openclaw-client.ts`, `audio.ts`, `executor.ts` — zero changes
- `packages/shared` tests — untouched
- `packages/mock-openclaw` — still exists for manual dev; tests never reference it

---

## Architecture Notes

### Dependency injection is already in place

`createSessionHandler` already accepts an optional `clientFactory` parameter. The tests will simply stop passing a fake factory and let it default to `defaultClientFactory`, which creates real `OpenClawWsClient` instances.

`executeEnvelope` already accepts `requestConfirm` as an optional callback. Extension tests use this instead of relying on the `showWarningMessage` stub.

### Port assignment

Sidecar tests use `{ port: 0 }` to get an OS-assigned free port. The actual port is read from `server.address().port` after the server is listening. The `WAVECLICK_MOCK_OPENCLAW=1` test is the one exception: it expects `ws://localhost:9090`, so its server listens on 9090.

### Test isolation

Each `describe` block that needs a WS server creates its own server and tears it down in `afterAll`. Sessions started during a test are stopped in `afterEach` to avoid socket leaks.

---

## Success Criteria

1. `pnpm test` (or `npm test`) in `packages/sidecar` runs all ipc and session tests including `audioStart`, `audioStop`, `toolResult` — all pass with zero `vi.fn()` / `vi.mock()` calls.
2. `pnpm test` in `packages/extension` launches VS Code, runs all executor test cases inside the real extension host — all pass.
3. No file in either test directory imports `vi` or uses `vi.fn()` / `vi.mock()` / `vi.mocked()`.
4. No `__mocks__` directory remains in `packages/extension`.
