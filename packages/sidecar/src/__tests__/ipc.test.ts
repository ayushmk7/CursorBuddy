import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { WebSocketServer } from 'ws';
import { processLine } from '../ipc';
import { createSessionHandler } from '../session';
import { defaultClientFactory } from '../openclaw-client';
import type { IpcMessage } from '../types';

function waitMs(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

describe('processLine — real session handler', () => {
  let wss: WebSocketServer;
  let url: string;

  beforeAll(async () => {
    wss = new WebSocketServer({ port: 0 });
    await new Promise<void>(r => wss.once('listening', r));
    url = `ws://localhost:${(wss.address() as { port: number }).port}`;
  });

  afterAll(() => new Promise<void>(r => {
    wss.clients.forEach(c => c.terminate());
    wss.close(() => r());
  }));

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

  it('session.stop responds with stopped:true', async () => {
    const { handler, write, responses } = makeCtx();
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
    // cleanup: stop recording then session
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
    await waitMs(20); // allow WS close to propagate
  });
});
