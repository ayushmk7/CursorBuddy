import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
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
    const result = await handler.start({ connectionMode: 'direct', openclawBaseUrl: url, workflow: 'w', authRef: 't' });
    expect(result).toHaveProperty('sessionHandle');
    expect(serverSockets).toHaveLength(1); // a real connection arrived
    await handler.stop(result);
    await waitMs(20);
  });

  it('bridge mode mints session and uses returned websocket URL + headers', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        session_id: '00000000-0000-0000-0000-000000000123',
        upstream: {
          type: 'websocket',
          url,
          headers: { Authorization: 'Bearer bridge-token' },
        },
      }),
    });
    vi.stubGlobal('fetch', fetchMock);
    const handler = createSessionHandler(() => {}, defaultClientFactory);
    const result = await handler.start({
      connectionMode: 'bridge',
      bridgeBaseUrl: 'http://127.0.0.1:8787',
      openclawBaseUrl: '',
      workflow: 'cursorbuddy_session',
      authRef: 'user-token',
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect((result as { sessionHandle: string }).sessionHandle).toBe('00000000-0000-0000-0000-000000000123');
    await handler.stop(result);
    vi.unstubAllGlobals();
  });

  it('emits provider.envelope IPC event when server sends a JSON frame', async () => {
    const emitted: IpcMessage[] = [];
    const handler = createSessionHandler((m) => emitted.push(m), defaultClientFactory);
    const result = await handler.start({ connectionMode: 'direct', openclawBaseUrl: url, workflow: 'w', authRef: 't' });

    const serverSocket = serverSockets[serverSockets.length - 1];
    serverSocket.send(JSON.stringify({
      schema_version: '1.0',
      session_id: '00000000-0000-0000-0000-000000000010',
      utterance_id: '00000000-0000-0000-0000-000000000011',
      assistant_text: 'hi',
      confidence: 0.9,
      actions: [{ type: 'noop', id: 'noop-1', risk: 'low' }],
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
    const result = await handler.start({ connectionMode: 'direct', openclawBaseUrl: url, workflow: 'w', authRef: 't' });

    serverSockets[serverSockets.length - 1].send(
      JSON.stringify({ type: 'tool_call', call_id: 'c1', name: 'vscode_probe_state', input: {} }),
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
    const result = await handler.start({ connectionMode: 'direct', openclawBaseUrl: url, workflow: 'w', authRef: 't' }) as { sessionHandle: string };

    serverSockets[serverSockets.length - 1].send('not-valid-json{');
    await waitMs(50);

    expect(emitted.some((m) => m.kind === 'event' && m.method === 'sidecar.error')).toBe(true);
    expect(emitted.some((m) => m.kind === 'error' && m.payload.code === 'E_PROTOCOL')).toBe(true);
    await handler.stop(result);
    await waitMs(20);
  });

  it('toolResult sends a tool_result frame to the server', async () => {
    const handler = createSessionHandler(() => {}, defaultClientFactory);
    const result = await handler.start({ connectionMode: 'direct', openclawBaseUrl: url, workflow: 'w', authRef: 't' }) as { sessionHandle: string };

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
    const result = await handler.start({ connectionMode: 'direct', openclawBaseUrl: url, workflow: 'w', authRef: 't' }) as { sessionHandle: string };

    await handler.audioStop({ session_handle: result.sessionHandle });
    await waitMs(50);

    const lastMsg = JSON.parse(serverMessages[serverMessages.length - 1]);
    expect(lastMsg.type).toBe('audio_end');
    await handler.stop(result);
    await waitMs(20);
  });

  it('audioStart returns ok:true for a valid session handle', async () => {
    const handler = createSessionHandler(() => {}, defaultClientFactory);
    const result = await handler.start({ connectionMode: 'direct', openclawBaseUrl: url, workflow: 'w', authRef: 't' }) as { sessionHandle: string };

    const audioResult = await handler.audioStart({ session_handle: result.sessionHandle });
    expect(audioResult.ok).toBe(true);

    await handler.audioStop({ session_handle: result.sessionHandle });
    await handler.stop(result);
    await waitMs(20);
  });

  it('audio output frames do not emit protocol errors', async () => {
    const emitted: IpcMessage[] = [];
    const handler = createSessionHandler((m) => emitted.push(m), defaultClientFactory);
    const result = await handler.start({ connectionMode: 'direct', openclawBaseUrl: url, workflow: 'w', authRef: 't' }) as { sessionHandle: string };

    const serverSocket = serverSockets[serverSockets.length - 1];
    serverSocket.send(JSON.stringify({
      type: 'audio_output_chunk',
      data: Buffer.from('pcm').toString('base64'),
      encoding: 'pcm16',
      sample_rate: 24000,
    }));
    serverSocket.send(JSON.stringify({ type: 'audio_output_done' }));
    await waitMs(30);

    expect(emitted.some((m) => m.kind === 'error' && m.payload.code === 'E_PROTOCOL')).toBe(false);
    await handler.stop(result);
    await waitMs(20);
  });

  it('emits sidecar.error event when websocket protocol error occurs', async () => {
    const emitted: IpcMessage[] = [];
    const handler = createSessionHandler((m) => emitted.push(m), defaultClientFactory);
    const result = await handler.start({ connectionMode: 'direct', openclawBaseUrl: url, workflow: 'w', authRef: 't' }) as { sessionHandle: string };

    serverSockets[serverSockets.length - 1].send('broken-json');
    await waitMs(30);

    expect(emitted.some((m) => m.kind === 'event' && m.method === 'sidecar.error')).toBe(true);
    await handler.stop(result);
    await waitMs(20);
  });
});
