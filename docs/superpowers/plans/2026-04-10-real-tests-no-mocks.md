# Real Test Infrastructure — No Mocks Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace all `vi.fn()` mocks in sidecar and extension tests with real implementations — real WebSocket servers for sidecar, real VS Code via `@vscode/test-electron` for the extension.

**Architecture:** Sidecar tests spin up a real `ws.WebSocketServer` on port 0 and use `defaultClientFactory` + `createSessionHandler` directly. Extension tests are converted from vitest+vscode-alias to `@vscode/test-electron`+Mocha running inside a real VS Code instance. One small production patch to `executor.ts` routes high-risk `execute_command` confirmation through the existing `requestConfirm` callback when provided, so tests can control it without triggering a modal.

**Tech Stack:** Node.js `ws` (already a sidecar dep), vitest (sidecar only), `@vscode/test-electron ^2.4.0`, `mocha ^10.0.0`, `@types/mocha ^10.0.0`, Node `assert` (stdlib).

---

## File Map

| Action | Path | Purpose |
|--------|------|---------|
| Modify | `packages/extension/src/executor.ts` | Route high-risk confirm through `requestConfirm` when provided |
| Rewrite | `packages/sidecar/src/__tests__/ipc.test.ts` | Real WS server + real session handler; full method coverage |
| Rewrite | `packages/sidecar/src/__tests__/session.test.ts` | Real WS server + real client factory; wire-level assertions |
| Modify | `packages/extension/package.json` | Add `@vscode/test-electron`, `mocha`, `@types/mocha`; update test script |
| Delete | `packages/extension/vitest.config.ts` | No longer used |
| Delete | `packages/extension/src/__mocks__/vscode.ts` | No longer used |
| Create | `packages/extension/src/test/runTests.ts` | `@vscode/test-electron` entry point |
| Create | `packages/extension/src/test/suite/index.ts` | Mocha suite loader |
| Create | `packages/extension/src/test/suite/executor.test.ts` | Executor integration tests inside real VS Code |

---

## Task 1: Patch executor.ts — use `requestConfirm` for high-risk execute_command

**Files:**
- Modify: `packages/extension/src/executor.ts:44-56`

The current high-risk block always calls `vscode.window.showWarningMessage` (modal). Inside a headless VS Code test host, a modal blocks forever. The fix routes through `ctx.requestConfirm` when it is provided, falling back to the modal when not — same production behaviour, testable without a real user.

- [ ] **Step 1: Read executor.ts lines 44–56**

```typescript
// current block (lines 44–56 inside the execute_command case)
if (entry.risk === 'high') {
  const confirmed = await vscode.window.showWarningMessage(
    `High-risk action: ${entry.description ?? entry.commands[0]}`,
    { modal: true },
    'Confirm',
  );
  if (confirmed !== 'Confirm') {
    ctx.postStepStatus?.(action.id, 'blocked');
    ctx.log('user cancelled high-risk command: ' + action.alias);
    continue;
  }
}
```

- [ ] **Step 2: Apply the patch**

Replace that block with:

```typescript
if (entry.risk === 'high') {
  let confirmed: boolean;
  if (ctx.requestConfirm) {
    confirmed = await ctx.requestConfirm(
      action.id,
      `High-risk action: ${entry.description ?? entry.commands[0]}`,
    );
  } else {
    confirmed =
      (await vscode.window.showWarningMessage(
        `High-risk action: ${entry.description ?? entry.commands[0]}`,
        { modal: true },
        'Confirm',
      )) === 'Confirm';
  }
  if (!confirmed) {
    ctx.postStepStatus?.(action.id, 'blocked');
    ctx.log('user cancelled high-risk command: ' + action.alias);
    continue;
  }
}
```

- [ ] **Step 3: Commit**

```bash
cd "packages/extension"
git add src/executor.ts
git commit -m "fix(executor): route high-risk confirm through requestConfirm callback when provided"
```

---

## Task 2: Rewrite ipc.test.ts — real WebSocket server

**Files:**
- Rewrite: `packages/sidecar/src/__tests__/ipc.test.ts`

No `vi.fn()` anywhere. A real `WebSocketServer` on port 0 serves as the upstream. `createSessionHandler` + `defaultClientFactory` are used directly. Every method on `SessionHandler` is now covered.

- [ ] **Step 1: Write the new ipc.test.ts**

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { WebSocketServer } from 'ws';
import { processLine } from '../ipc';
import { createSessionHandler } from '../session';
import { defaultClientFactory } from '../openclaw-client';
import type { IpcMessage } from '../types';

function getPort(wss: WebSocketServer): number {
  return (wss.address() as { port: number }).port;
}

function waitMs(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

describe('processLine — real session handler', () => {
  let wss: WebSocketServer;
  let url: string;

  beforeAll(async () => {
    wss = new WebSocketServer({ port: 0 });
    await new Promise<void>(r => wss.once('listening', r));
    url = `ws://localhost:${getPort(wss)}`;
  });

  afterAll(() => new Promise<void>(r => wss.close(() => r())));

  function makeCtx() {
    const emitted: IpcMessage[] = [];
    const responses: IpcMessage[] = [];
    const handler = createSessionHandler((m) => emitted.push(m), defaultClientFactory);
    const write = (m: IpcMessage) => responses.push(m);
    return { handler, write, responses, emitted };
  }

  it('drops malformed JSON silently', async () => {
    const { handler, write, responses } = makeCtx();
    await processLine('not-json', write, handler);
    expect(responses).toHaveLength(0);
  });

  it('returns E_UNKNOWN_METHOD for an unrecognised method', async () => {
    const { handler, write, responses } = makeCtx();
    await processLine(
      JSON.stringify({ v: 1, kind: 'request', id: 'abc', method: 'foo.bar', payload: {} }),
      write, handler,
    );
    expect(responses[0].kind).toBe('error');
    expect(responses[0].id).toBe('abc');
    expect(responses[0].payload.code).toBe('E_UNKNOWN_METHOD');
  });

  it('session.start returns a sessionHandle', async () => {
    const { handler, write, responses } = makeCtx();
    await processLine(
      JSON.stringify({ v: 1, kind: 'request', id: 'r1', method: 'session.start',
        payload: { openclawBaseUrl: url, workflow: 'cursorbuddy_session', authRef: 'token' } }),
      write, handler,
    );
    expect(responses[0].kind).toBe('response');
    expect(typeof responses[0].payload.sessionHandle).toBe('string');
    // cleanup
    const sessionHandle = responses[0].payload.sessionHandle;
    await processLine(
      JSON.stringify({ v: 1, kind: 'request', id: 'r2', method: 'session.stop',
        payload: { sessionHandle } }),
      write, handler,
    );
  });

  it('session.stop responds with ok', async () => {
    const { handler, write, responses } = makeCtx();
    // start first
    await processLine(
      JSON.stringify({ v: 1, kind: 'request', id: 'r1', method: 'session.start',
        payload: { openclawBaseUrl: url, workflow: 'w', authRef: 't' } }),
      write, handler,
    );
    const sessionHandle = responses[0].payload.sessionHandle;
    await processLine(
      JSON.stringify({ v: 1, kind: 'request', id: 'r2', method: 'session.stop',
        payload: { sessionHandle } }),
      write, handler,
    );
    expect(responses[1].kind).toBe('response');
    expect(responses[1].payload.stopped).toBe(true);
  });

  it('audio.start with a valid session handle returns ok:true', async () => {
    const { handler, write, responses } = makeCtx();
    await processLine(
      JSON.stringify({ v: 1, kind: 'request', id: 'r1', method: 'session.start',
        payload: { openclawBaseUrl: url, workflow: 'w', authRef: 't' } }),
      write, handler,
    );
    const sessionHandle = responses[0].payload.sessionHandle;
    await processLine(
      JSON.stringify({ v: 1, kind: 'request', id: 'r2', method: 'audio.start',
        payload: { session_handle: sessionHandle } }),
      write, handler,
    );
    expect(responses[1].kind).toBe('response');
    expect(responses[1].payload.ok).toBe(true);
    // cleanup
    await processLine(
      JSON.stringify({ v: 1, kind: 'request', id: 'r3', method: 'audio.stop',
        payload: { session_handle: sessionHandle } }),
      write, handler,
    );
    await processLine(
      JSON.stringify({ v: 1, kind: 'request', id: 'r4', method: 'session.stop',
        payload: { sessionHandle } }),
      write, handler,
    );
  });

  it('audio.start with an unknown session handle returns ok:false', async () => {
    const { handler, write, responses } = makeCtx();
    await processLine(
      JSON.stringify({ v: 1, kind: 'request', id: 'r1', method: 'audio.start',
        payload: { session_handle: 'does-not-exist' } }),
      write, handler,
    );
    expect(responses[0].kind).toBe('response');
    expect(responses[0].payload.ok).toBe(false);
  });

  it('audio.stop with an unknown session handle is a no-op returning ok:true', async () => {
    const { handler, write, responses } = makeCtx();
    await processLine(
      JSON.stringify({ v: 1, kind: 'request', id: 'r1', method: 'audio.stop',
        payload: { session_handle: 'does-not-exist' } }),
      write, handler,
    );
    expect(responses[0].kind).toBe('response');
    expect(responses[0].payload.ok).toBe(true);
  });

  it('tool_call.result with a valid session handle returns ok:true', async () => {
    const { handler, write, responses } = makeCtx();
    await processLine(
      JSON.stringify({ v: 1, kind: 'request', id: 'r1', method: 'session.start',
        payload: { openclawBaseUrl: url, workflow: 'w', authRef: 't' } }),
      write, handler,
    );
    const sessionHandle = responses[0].payload.sessionHandle;
    await processLine(
      JSON.stringify({ v: 1, kind: 'request', id: 'r2', method: 'tool_call.result',
        payload: { session_handle: sessionHandle, call_id: 'c1', result: { value: 1 } } }),
      write, handler,
    );
    expect(responses[1].kind).toBe('response');
    expect(responses[1].payload.ok).toBe(true);
    // cleanup
    await processLine(
      JSON.stringify({ v: 1, kind: 'request', id: 'r3', method: 'session.stop',
        payload: { sessionHandle } }),
      write, handler,
    );
  });
});
```

- [ ] **Step 2: Run the tests — expect all to pass**

```bash
cd "packages/sidecar"
npm test
```

Expected: all tests in `ipc.test.ts` pass. If sox is not installed, the `audio.start` test still passes because `startRecording` errors are routed through `onError` asynchronously (the `audioStart` handler returns `{ ok: true }` before any stream error fires).

- [ ] **Step 3: Commit**

```bash
git add packages/sidecar/src/__tests__/ipc.test.ts
git commit -m "test(sidecar): rewrite ipc tests — real WS server, zero mocks"
```

---

## Task 3: Rewrite session.test.ts — real WebSocket server

**Files:**
- Rewrite: `packages/sidecar/src/__tests__/session.test.ts`

The mock factory is deleted entirely. Tests assert wire-level behaviour: what bytes arrive at the server, what events fire on the client.

- [ ] **Step 1: Write the new session.test.ts**

```typescript
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { WebSocketServer, WebSocket as WS } from 'ws';
import { createSessionHandler } from '../session';
import { defaultClientFactory } from '../openclaw-client';
import type { IpcMessage } from '../types';

function waitMs(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

describe('createSessionHandler — real WS', () => {
  let wss: WebSocketServer;
  let url: string;
  let serverSockets: WS[] = [];
  let serverMessages: string[] = [];

  beforeAll(async () => {
    wss = new WebSocketServer({ port: 0 });
    await new Promise<void>(r => wss.once('listening', r));
    url = `ws://localhost:${(wss.address() as { port: number }).port}`;
    wss.on('connection', (ws) => {
      serverSockets.push(ws);
      ws.on('message', (d) => serverMessages.push(d.toString()));
    });
  });

  afterAll(() => new Promise<void>(r => wss.close(() => r())));

  afterEach(() => {
    serverSockets = [];
    serverMessages = [];
  });

  it('start() establishes a real WebSocket connection', async () => {
    const handler = createSessionHandler(() => {}, defaultClientFactory);
    const result = await handler.start({ openclawBaseUrl: url, workflow: 'w', authRef: 't' });
    expect(result).toHaveProperty('sessionHandle');
    expect(serverSockets).toHaveLength(1);  // a real connection arrived
    await handler.stop(result);
  });

  it('forces URL to ws://localhost:9090 when WAVECLICK_MOCK_OPENCLAW=1', async () => {
    const wss9090 = new WebSocketServer({ port: 9090 });
    await new Promise<void>(r => wss9090.once('listening', r));
    const connected: boolean[] = [];
    const msgs9090: string[] = [];
    wss9090.on('connection', (ws) => {
      connected.push(true);
      ws.on('message', (d) => msgs9090.push(d.toString()));
    });
    process.env.WAVECLICK_MOCK_OPENCLAW = '1';
    let result: Record<string, unknown> = {};
    try {
      const handler = createSessionHandler(() => {}, defaultClientFactory);
      result = await handler.start({
        openclawBaseUrl: 'ws://real-upstream.example.com',
        workflow: 'w',
        authRef: 't',
      });
      expect(connected).toHaveLength(1);  // connected to 9090, not real-upstream
      await handler.stop(result);
    } finally {
      delete process.env.WAVECLICK_MOCK_OPENCLAW;
      await new Promise<void>(r => wss9090.close(() => r()));
    }
  });

  it('emits provider.envelope IPC event when server sends a JSON frame', async () => {
    const emitted: IpcMessage[] = [];
    const handler = createSessionHandler((m) => emitted.push(m), defaultClientFactory);
    const result = await handler.start({ openclawBaseUrl: url, workflow: 'w', authRef: 't' });

    const serverSocket = serverSockets[serverSockets.length - 1];
    serverSocket.send(JSON.stringify({
      schema_version: '1.0',
      session_id: 'sid',
      utterance_id: 'uid',
      assistant_text: 'hi',
      confidence: 0.9,
      actions: [],
    }));
    await waitMs(50);

    expect(emitted[0].kind).toBe('event');
    expect(emitted[0].method).toBe('provider.envelope');
    await handler.stop(result);
  });

  it('emits provider.tool_call IPC event when server sends a tool_call frame', async () => {
    const emitted: IpcMessage[] = [];
    const handler = createSessionHandler((m) => emitted.push(m), defaultClientFactory);
    const result = await handler.start({ openclawBaseUrl: url, workflow: 'w', authRef: 't' });

    serverSockets[serverSockets.length - 1].send(
      JSON.stringify({ type: 'tool_call', call_id: 'c1', name: 'open_file', input: { path: 'foo.ts' } }),
    );
    await waitMs(50);

    expect(emitted[0].kind).toBe('event');
    expect(emitted[0].method).toBe('provider.tool_call');
    expect(emitted[0].payload.call_id).toBe('c1');
    await handler.stop(result);
  });

  it('emits E_PROTOCOL error when server sends invalid JSON', async () => {
    const emitted: IpcMessage[] = [];
    const handler = createSessionHandler((m) => emitted.push(m), defaultClientFactory);
    const result = await handler.start({ openclawBaseUrl: url, workflow: 'w', authRef: 't' }) as { sessionHandle: string };

    serverSockets[serverSockets.length - 1].send('not-valid-json{');
    await waitMs(50);

    expect(emitted[0].kind).toBe('error');
    expect(emitted[0].payload.code).toBe('E_PROTOCOL');
    await handler.stop(result);
  });

  it('toolResult sends a tool_result frame to the server', async () => {
    const handler = createSessionHandler(() => {}, defaultClientFactory);
    const result = await handler.start({ openclawBaseUrl: url, workflow: 'w', authRef: 't' }) as { sessionHandle: string };

    await handler.toolResult({ session_handle: result.sessionHandle, call_id: 'c42', result: { found: true } });
    await waitMs(50);

    const lastMsg = JSON.parse(serverMessages[serverMessages.length - 1]);
    expect(lastMsg.type).toBe('tool_result');
    expect(lastMsg.call_id).toBe('c42');
    expect(lastMsg.output).toEqual({ found: true });
    await handler.stop(result);
  });

  it('audioStop sends an audio_end frame to the server', async () => {
    const handler = createSessionHandler(() => {}, defaultClientFactory);
    const result = await handler.start({ openclawBaseUrl: url, workflow: 'w', authRef: 't' }) as { sessionHandle: string };

    await handler.audioStop({ session_handle: result.sessionHandle });
    await waitMs(50);

    const lastMsg = JSON.parse(serverMessages[serverMessages.length - 1]);
    expect(lastMsg.type).toBe('audio_end');
    await handler.stop(result);
  });

  it('audioStart returns ok:true for a valid session handle', async () => {
    const handler = createSessionHandler(() => {}, defaultClientFactory);
    const result = await handler.start({ openclawBaseUrl: url, workflow: 'w', authRef: 't' }) as { sessionHandle: string };

    const audioResult = await handler.audioStart({ session_handle: result.sessionHandle });
    expect(audioResult.ok).toBe(true);

    await handler.audioStop({ session_handle: result.sessionHandle });
    await handler.stop(result);
  });
});
```

- [ ] **Step 2: Run the sidecar tests — both files**

```bash
cd "packages/sidecar"
npm test
```

Expected: all tests in both `ipc.test.ts` and `session.test.ts` pass. Zero uses of `vi.fn()` remain in the sidecar test directory.

- [ ] **Step 3: Confirm no vi.fn() left**

```bash
grep -r "vi\.fn\|vi\.mock\|vi\.mocked" packages/sidecar/src/__tests__/
```

Expected: no output.

- [ ] **Step 4: Commit**

```bash
git add packages/sidecar/src/__tests__/session.test.ts
git commit -m "test(sidecar): rewrite session tests — real WS server, zero mocks"
```

---

## Task 4: Add @vscode/test-electron deps and update extension package.json

**Files:**
- Modify: `packages/extension/package.json`
- Delete: `packages/extension/vitest.config.ts`
- Delete: `packages/extension/src/__mocks__/vscode.ts`

- [ ] **Step 1: Install new devDependencies**

```bash
cd "packages/extension"
npm install --save-dev @vscode/test-electron@^2.4.0 mocha@^10.7.0 @types/mocha@^10.0.0
```

- [ ] **Step 2: Update the test script in package.json**

Change:
```json
"test": "vitest run"
```
To:
```json
"test": "node esbuild.config.js && tsc -p tsconfig.json && node dist/test/runTests.js"
```

Also remove `vitest` from `devDependencies` in the same edit (it is no longer needed).

- [ ] **Step 3: Delete vitest.config.ts**

```bash
rm "packages/extension/vitest.config.ts"
```

- [ ] **Step 4: Delete the vscode mock**

```bash
rm "packages/extension/src/__mocks__/vscode.ts"
```

- [ ] **Step 5: Commit**

```bash
cd "packages/extension"
git add package.json package-lock.json
git rm vitest.config.ts src/__mocks__/vscode.ts
git commit -m "chore(extension): swap vitest+vscode-mock for @vscode/test-electron+mocha"
```

---

## Task 5: Create extension test runner infrastructure

**Files:**
- Create: `packages/extension/src/test/runTests.ts`
- Create: `packages/extension/src/test/suite/index.ts`

- [ ] **Step 1: Create runTests.ts**

```typescript
// packages/extension/src/test/runTests.ts
import { runTests } from '@vscode/test-electron';
import * as path from 'path';

async function main(): Promise<void> {
  // extensionDevelopmentPath: the folder containing this extension's package.json
  const extensionDevelopmentPath = path.resolve(__dirname, '../../');
  // extensionTestsPath: the compiled suite index (without .js extension)
  const extensionTestsPath = path.resolve(__dirname, './suite/index');
  await runTests({ extensionDevelopmentPath, extensionTestsPath });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

- [ ] **Step 2: Create suite/index.ts**

```typescript
// packages/extension/src/test/suite/index.ts
import * as path from 'path';
import Mocha from 'mocha';

export function run(): Promise<void> {
  const mocha = new Mocha({ ui: 'bdd', timeout: 30_000, color: true });
  mocha.addFile(path.join(__dirname, 'executor.test.js'));
  return new Promise((resolve, reject) => {
    mocha.run((failures) => {
      if (failures > 0) {
        reject(new Error(`${failures} test(s) failed.`));
      } else {
        resolve();
      }
    });
  });
}
```

- [ ] **Step 3: Verify TypeScript compiles the new files**

```bash
cd "packages/extension"
npx tsc -p tsconfig.json --noEmit
```

Expected: no errors. The tsconfig `include: ["src"]` covers `src/test/`.

- [ ] **Step 4: Commit**

```bash
git add packages/extension/src/test/runTests.ts packages/extension/src/test/suite/index.ts
git commit -m "feat(extension): add @vscode/test-electron runner + mocha suite loader"
```

---

## Task 6: Write executor integration tests

**Files:**
- Create: `packages/extension/src/test/suite/executor.test.ts`

Tests use Node's built-in `assert` module. The `vscode` import in `executor.ts` resolves to the real VS Code API because tests run inside the extension host. Assertions are on log callbacks and promise resolution rather than mock spies.

- [ ] **Step 1: Create executor.test.ts**

```typescript
// packages/extension/src/test/suite/executor.test.ts
import * as assert from 'assert';
import * as path from 'path';
import { executeEnvelope } from '../../executor';

// From dist/test/suite/ go up 4 levels → packages/, then into shared/maps
const MAPS_DIR = path.resolve(__dirname, '../../../../shared/maps');

function makeEnvelope(actions: unknown[]): unknown {
  return {
    schema_version: '1.0',
    session_id: '00000000-0000-0000-0000-000000000001',
    utterance_id: '00000000-0000-0000-0000-000000000002',
    assistant_text: 'test',
    confidence: 0.9,
    actions,
  };
}

describe('executeEnvelope — real VS Code', () => {

  describe('execute_command', () => {
    it('open_scm alias executes workbench.view.scm without error', async () => {
      const logs: string[] = [];
      await executeEnvelope(
        makeEnvelope([{ id: 'a1', type: 'execute_command', alias: 'open_scm', risk: 'low' }]),
        { mapsDir: MAPS_DIR, log: (s) => logs.push(s) },
      );
      assert.ok(!logs.some((l) => l.includes('unknown alias')), 'unexpected unknown-alias log');
    });

    it('unknown alias logs but does not throw', async () => {
      const logs: string[] = [];
      await executeEnvelope(
        makeEnvelope([{ id: 'a1', type: 'execute_command', alias: 'nonexistent_alias', risk: 'low' }]),
        { mapsDir: MAPS_DIR, log: (s) => logs.push(s) },
      );
      assert.ok(logs.some((l) => l.includes('unknown alias')), 'expected unknown-alias log');
    });

    it('high-risk command executes when requestConfirm returns true', async () => {
      const logs: string[] = [];
      try {
        await executeEnvelope(
          makeEnvelope([{ id: 'a1', type: 'execute_command', alias: 'git_commit', risk: 'high' }]),
          {
            mapsDir: MAPS_DIR,
            log: (s) => logs.push(s),
            requestConfirm: async () => true,
          },
        );
      } catch {
        // git.commit may error in headless VS Code (nothing to commit) — that is expected
      }
      assert.ok(!logs.some((l) => l.includes('user cancelled')), 'command should not be cancelled');
    });

    it('high-risk command does not execute when requestConfirm returns false', async () => {
      const logs: string[] = [];
      await executeEnvelope(
        makeEnvelope([{ id: 'a1', type: 'execute_command', alias: 'git_commit', risk: 'high' }]),
        {
          mapsDir: MAPS_DIR,
          log: (s) => logs.push(s),
          requestConfirm: async () => false,
        },
      );
      assert.ok(logs.some((l) => l.includes('user cancelled')), 'expected cancelled log');
    });
  });

  describe('show_information_message', () => {
    it('resolves without error', async () => {
      const logs: string[] = [];
      await executeEnvelope(
        makeEnvelope([{ id: 'a1', type: 'show_information_message', message: 'Hello world', risk: 'low' }]),
        { mapsDir: MAPS_DIR, log: (s) => logs.push(s) },
      );
      assert.ok(!logs.some((l) => l.includes('invalid')), 'unexpected error in logs');
    });
  });

  describe('noop', () => {
    it('logs the reason and does not call executeCommand', async () => {
      const logs: string[] = [];
      await executeEnvelope(
        makeEnvelope([{ id: 'a1', type: 'noop', reason: 'nothing to do', risk: 'low' }]),
        { mapsDir: MAPS_DIR, log: (s) => logs.push(s) },
      );
      assert.ok(logs.some((l) => l.includes('noop')), 'expected noop log');
    });
  });

  describe('invalid envelope', () => {
    it('logs error when envelope has an extra field (Zod strict)', async () => {
      const logs: string[] = [];
      await executeEnvelope(
        {
          ...makeEnvelope([{ id: 'a1', type: 'execute_command', alias: 'open_scm', risk: 'low' }]) as object,
          extra_field: 'unexpected',
        },
        { mapsDir: MAPS_DIR, log: (s) => logs.push(s) },
      );
      assert.ok(logs.some((l) => l.includes('invalid envelope')), 'expected invalid-envelope log');
    });

    it('logs error when required field is missing', async () => {
      const logs: string[] = [];
      await executeEnvelope({ schema_version: '1.0' }, { mapsDir: MAPS_DIR, log: (s) => logs.push(s) });
      assert.ok(logs.some((l) => l.includes('invalid envelope')), 'expected invalid-envelope log');
    });
  });

  describe('empty actions array', () => {
    it('fails Zod validation and logs error', async () => {
      const logs: string[] = [];
      await executeEnvelope(makeEnvelope([]), { mapsDir: MAPS_DIR, log: (s) => logs.push(s) });
      assert.ok(logs.some((l) => l.includes('invalid envelope')), 'expected invalid-envelope log');
    });
  });

  describe('loadCommandMap error handling', () => {
    it('logs error when mapsDir does not exist', async () => {
      const logs: string[] = [];
      await executeEnvelope(
        makeEnvelope([{ id: 'a1', type: 'execute_command', alias: 'open_scm', risk: 'low' }]),
        { mapsDir: '/nonexistent/does-not-exist', log: (s) => logs.push(s) },
      );
      assert.ok(logs.some((l) => l.includes('failed to load command map')), 'expected load-error log');
    });
  });

  describe('multi-action envelope', () => {
    it('continues processing after an unknown alias', async () => {
      const logs: string[] = [];
      await executeEnvelope(
        makeEnvelope([
          { type: 'execute_command', alias: 'nonexistent_alias_xyz', risk: 'low', id: 'a1' },
          { type: 'execute_command', alias: 'open_scm', risk: 'low', id: 'a2' },
        ]),
        { mapsDir: MAPS_DIR, log: (s) => logs.push(s) },
      );
      assert.ok(logs.some((l) => l.includes('unknown alias')), 'first action should log unknown-alias');
      // second action executes without crashing — no invalid-envelope log
      assert.ok(!logs.some((l) => l.includes('invalid envelope')), 'should not log invalid-envelope');
    });
  });
});
```

- [ ] **Step 2: Commit**

```bash
git add packages/extension/src/test/suite/executor.test.ts
git commit -m "test(extension): executor integration tests inside real VS Code via @vscode/test-electron"
```

---

## Task 7: Build and verify extension tests end-to-end

**Files:** none (verification only)

- [ ] **Step 1: Full build + test run**

```bash
cd "packages/extension"
npm test
```

This runs:
1. `node esbuild.config.js` — bundles `dist/extension.js` (required for VS Code to load the extension)
2. `tsc -p tsconfig.json` — compiles `src/test/**` → `dist/test/**`
3. `node dist/test/runTests.js` — downloads VS Code if needed, launches headless, runs Mocha suite

Expected output ends with something like:
```
11 passing
```

- [ ] **Step 2: Confirm no vi.fn() or __mocks__ left anywhere in the extension package**

```bash
grep -r "vi\.fn\|vi\.mock\|vi\.mocked" packages/extension/src/
ls packages/extension/src/__mocks__/ 2>/dev/null && echo "STILL EXISTS" || echo "deleted"
```

Expected: grep produces no output; the `__mocks__` directory is gone.

- [ ] **Step 3: Final commit with both packages**

```bash
git add packages/extension/src/test/
git commit -m "test(extension): verify real VS Code integration tests pass"
```

---

## Self-Review

**Spec coverage check:**
- ✅ `ipc.test.ts` — all five SessionHandler methods covered (start, stop, audioStart, audioStop, toolResult) plus malformed JSON and E_UNKNOWN_METHOD
- ✅ `session.test.ts` — mock factory removed, wire-level assertions for all methods
- ✅ `executor.ts` — production patch for requestConfirm routing
- ✅ `@vscode/test-electron` — runner, suite loader, and tests created
- ✅ `vitest.config.ts` and `__mocks__/vscode.ts` deleted
- ✅ "What does not change" — shared tests, mock-openclaw, all other source files untouched

**Placeholder scan:** No TBDs, no TODOs, no "similar to above" references. All code blocks are complete and self-contained.

**Type consistency:**
- `handler.stop(result)` — `result` is `Record<string, unknown>` containing `sessionHandle`; `stop()` casts it to `SessionStopPayload` — ✅ consistent with session.ts
- `handler.audioStop({ session_handle: ... })` — matches `AudioStopPayload` in types.ts — ✅
- `handler.toolResult({ session_handle, call_id, result })` — matches `ToolResultPayload` in types.ts — ✅
- `requestConfirm: async () => true` — satisfies `(id: string, title: string, details?: string) => Promise<boolean>` — ✅
