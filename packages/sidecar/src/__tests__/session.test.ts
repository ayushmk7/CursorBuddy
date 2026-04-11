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

  afterAll(() => new Promise<void>(r => {
    wss.clients.forEach(c => c.terminate());
    wss.close(() => r());
  }));

  afterEach(() => {
    serverSockets = [];
    serverMessages = [];
  });

  it('start() establishes a real WebSocket connection', async () => {
    const handler = createSessionHandler(() => {}, defaultClientFactory);
    const result = await handler.start({ openclawBaseUrl: url, workflow: 'w', authRef: 't' });
    expect(result).toHaveProperty('sessionHandle');
    expect(serverSockets).toHaveLength(1); // a real connection arrived
    await handler.stop(result);
    await waitMs(20);
  });

  it('forces URL to ws://localhost:9090 when WAVECLICK_MOCK_OPENCLAW=1', async () => {
    const wss9090 = new WebSocketServer({ port: 9090 });
    await new Promise<void>(r => wss9090.once('listening', r));
    const connected: boolean[] = [];
    wss9090.on('connection', () => connected.push(true));
    process.env.WAVECLICK_MOCK_OPENCLAW = '1';
    let result: Record<string, unknown> = {};
    try {
      const handler = createSessionHandler(() => {}, defaultClientFactory);
      result = await handler.start({
        openclawBaseUrl: 'ws://real-upstream.example.com',
        workflow: 'w',
        authRef: 't',
      });
      expect(connected).toHaveLength(1); // connected to 9090, not real-upstream
      await handler.stop(result);
      await waitMs(20);
    } finally {
      delete process.env.WAVECLICK_MOCK_OPENCLAW;
      await new Promise<void>(r => {
        wss9090.clients.forEach(c => c.terminate());
        wss9090.close(() => r());
      });
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
    await waitMs(20);
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
    await waitMs(20);
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
    await waitMs(20);
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
    await waitMs(20);
  });

  it('audioStop sends an audio_end frame to the server', async () => {
    const handler = createSessionHandler(() => {}, defaultClientFactory);
    const result = await handler.start({ openclawBaseUrl: url, workflow: 'w', authRef: 't' }) as { sessionHandle: string };

    await handler.audioStop({ session_handle: result.sessionHandle });
    await waitMs(50);

    const lastMsg = JSON.parse(serverMessages[serverMessages.length - 1]);
    expect(lastMsg.type).toBe('audio_end');
    await handler.stop(result);
    await waitMs(20);
  });

  it('audioStart returns ok:true for a valid session handle', async () => {
    const handler = createSessionHandler(() => {}, defaultClientFactory);
    const result = await handler.start({ openclawBaseUrl: url, workflow: 'w', authRef: 't' }) as { sessionHandle: string };

    const audioResult = await handler.audioStart({ session_handle: result.sessionHandle });
    expect(audioResult.ok).toBe(true);

    await handler.audioStop({ session_handle: result.sessionHandle });
    await handler.stop(result);
    await waitMs(20);
  });
});
