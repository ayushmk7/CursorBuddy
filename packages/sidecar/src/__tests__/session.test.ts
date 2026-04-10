import { describe, it, expect, vi } from 'vitest';
import { createSessionHandler } from '../session';
import type { IpcMessage } from '../types';

// Mock OpenClawWsClient factory
function makeMockClientFactory(opts: {
  connectResolves?: boolean;
  errorOnConnect?: boolean;
}) {
  return vi.fn().mockImplementation((clientOpts: any) => ({
    connect: opts.errorOnConnect
      ? vi.fn().mockRejectedValue(new Error('connection refused'))
      : vi.fn().mockResolvedValue(undefined),
    sendText: vi.fn(),
    dispose: vi.fn(),
    // expose the callbacks so tests can trigger them
    _opts: clientOpts,
  }));
}

describe('createSessionHandler', () => {
  it('calls connect() on startSession', async () => {
    const emitted: IpcMessage[] = [];
    const emit = (msg: IpcMessage) => emitted.push(msg);
    const mockFactory = makeMockClientFactory({});
    const handler = createSessionHandler(emit, mockFactory);

    const result = await handler.start({
      openclawBaseUrl: 'ws://upstream.example.com',
      workflow: 'waveclick_session',
      authRef: 'token',
    });

    expect(result).toHaveProperty('sessionHandle');
    const instance = mockFactory.mock.results[0].value;
    expect(instance.connect).toHaveBeenCalledOnce();
  });

  it('forces URL to ws://localhost:9090 when WAVECLICK_MOCK_OPENCLAW=1', async () => {
    process.env.WAVECLICK_MOCK_OPENCLAW = '1';
    const emitted: IpcMessage[] = [];
    const emit = (msg: IpcMessage) => emitted.push(msg);
    const mockFactory = makeMockClientFactory({});
    const handler = createSessionHandler(emit, mockFactory);

    await handler.start({ openclawBaseUrl: 'ws://real-upstream.example.com', workflow: 'waveclick_session', authRef: 'token' });

    const instance = mockFactory.mock.results[0].value;
    expect(instance._opts.url).toBe('ws://localhost:9090');

    delete process.env.WAVECLICK_MOCK_OPENCLAW;
  });

  it('emits provider.envelope IPC event when onEnvelope fires', async () => {
    const emitted: IpcMessage[] = [];
    const emit = (msg: IpcMessage) => emitted.push(msg);
    const mockFactory = makeMockClientFactory({});
    const handler = createSessionHandler(emit, mockFactory);

    await handler.start({ openclawBaseUrl: 'ws://localhost:9090', workflow: 'w', authRef: 'mock' });

    // trigger the onEnvelope callback
    const instance = mockFactory.mock.results[0].value;
    instance._opts.onEnvelope({ schema_version: '1.0', session_id: 'sid', utterance_id: 'uid', assistant_text: 'hi', confidence: 0.9, actions: [] });

    expect(emitted).toHaveLength(1);
    expect(emitted[0].method).toBe('provider.envelope');
    expect(emitted[0].kind).toBe('event');
  });

  it('emits IPC error with E_OPENCLAW when onError fires', async () => {
    const emitted: IpcMessage[] = [];
    const emit = (msg: IpcMessage) => emitted.push(msg);
    const mockFactory = makeMockClientFactory({});
    const handler = createSessionHandler(emit, mockFactory);

    await handler.start({ openclawBaseUrl: 'ws://localhost:9090', workflow: 'w', authRef: 'mock' });

    const instance = mockFactory.mock.results[0].value;
    instance._opts.onError('E_OPENCLAW', 'upstream closed');

    expect(emitted).toHaveLength(1);
    expect(emitted[0].kind).toBe('error');
    expect(emitted[0].payload.code).toBe('E_OPENCLAW');
  });
});
