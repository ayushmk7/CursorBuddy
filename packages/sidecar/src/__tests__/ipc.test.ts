import { describe, it, expect, vi } from 'vitest';
import { processLine } from '../ipc';

describe('processLine', () => {
  it('returns E_UNKNOWN_METHOD for unknown methods', async () => {
    const responses: unknown[] = [];
    const write = (msg: unknown) => responses.push(msg);
    const sessionHandler = {
      start: vi.fn().mockResolvedValue({ sessionHandle: 'h1' }),
      stop: vi.fn().mockResolvedValue({}),
    };

    const line = JSON.stringify({ v: 1, kind: 'request', id: 'abc', method: 'foo.bar', payload: {} });
    await processLine(line, write, sessionHandler);

    expect(responses).toHaveLength(1);
    const resp = responses[0] as any;
    expect(resp.kind).toBe('error');
    expect(resp.id).toBe('abc');
    expect(resp.payload.code).toBe('E_UNKNOWN_METHOD');
  });

  it('does not crash on malformed JSON', async () => {
    const responses: unknown[] = [];
    const write = (msg: unknown) => responses.push(msg);
    const sessionHandler = { start: vi.fn(), stop: vi.fn() };
    await processLine('not-json', write, sessionHandler);
    expect(responses).toHaveLength(0); // silently dropped
  });

  it('calls session.start on session.start method and returns response', async () => {
    const responses: unknown[] = [];
    const write = (msg: unknown) => responses.push(msg);
    const sessionHandler = {
      start: vi.fn().mockResolvedValue({ sessionHandle: 'handle-1' }),
      stop: vi.fn(),
    };
    const payload = { openclawBaseUrl: 'ws://localhost:9090', workflow: 'waveclick_session', authRef: 'mock' };
    const line = JSON.stringify({ v: 1, kind: 'request', id: 'req1', method: 'session.start', payload });
    await processLine(line, write, sessionHandler);

    expect(sessionHandler.start).toHaveBeenCalledOnce();
    expect(responses).toHaveLength(1);
    const resp = responses[0] as any;
    expect(resp.kind).toBe('response');
    expect(resp.payload.sessionHandle).toBe('handle-1');
  });

  it('calls session.stop on session.stop method', async () => {
    const responses: unknown[] = [];
    const write = (msg: unknown) => responses.push(msg);
    const sessionHandler = {
      start: vi.fn(),
      stop: vi.fn().mockResolvedValue({}),
    };
    const line = JSON.stringify({ v: 1, kind: 'request', id: 'req2', method: 'session.stop', payload: { sessionHandle: 'h1' } });
    await processLine(line, write, sessionHandler);

    expect(sessionHandler.stop).toHaveBeenCalledOnce();
    const resp = responses[0] as any;
    expect(resp.kind).toBe('response');
  });
});
