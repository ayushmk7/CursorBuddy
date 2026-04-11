import { randomUUID } from 'crypto';
import { IpcMessage, SessionStartPayload, SessionStopPayload } from './types';
import { SessionHandler } from './ipc';
import { OpenClawClientFactory, OpenClawWsClient, defaultClientFactory } from './openclaw-client';

export function createSessionHandler(
  emit: (msg: IpcMessage) => void,
  clientFactory: OpenClawClientFactory = defaultClientFactory,
  activeSessions: Map<string, OpenClawWsClient> = new Map()
): SessionHandler {
  return {
    async start(payload: Record<string, unknown>): Promise<Record<string, unknown>> {
      const p = payload as unknown as SessionStartPayload;
      const url = process.env.WAVECLICK_MOCK_OPENCLAW === '1'
        ? 'ws://localhost:9090'
        : p.openclawBaseUrl;

      const sessionHandle = randomUUID();

      const client = clientFactory({
        url,
        onEnvelope: (raw) => {
          emit({ v: 1, kind: 'event', id: randomUUID(), method: 'provider.envelope', payload: raw as Record<string, unknown> });
        },
        onToolCall: (callId, name, input) => {
          emit({ v: 1, kind: 'event', id: randomUUID(), method: 'provider.tool_call',
                 payload: { call_id: callId, name, input: input as Record<string, unknown> } });
        },
        onError: (code, message) => {
          emit({ v: 1, kind: 'error', id: randomUUID(), payload: { code, message } });
        },
        onClose: () => {
          activeSessions.delete(sessionHandle);
        },
      });

      await client.connect();
      activeSessions.set(sessionHandle, client);

      // In mock mode, send a text message to trigger mock-openclaw's canned envelope response.
      // Not sent to real OpenClaw (which manages its own session lifecycle).
      if (process.env.WAVECLICK_MOCK_OPENCLAW === '1') {
        client.sendText(JSON.stringify({ type: 'session_start', sessionHandle }));
      }

      return { sessionHandle };
    },

    async stop(payload: Record<string, unknown>): Promise<Record<string, unknown>> {
      const p = payload as unknown as SessionStopPayload;
      const client = activeSessions.get(p.sessionHandle);
      if (client) {
        client.dispose();
        activeSessions.delete(p.sessionHandle);
      }
      return { stopped: true };
    },

    async audioStart(payload: Record<string, unknown>): Promise<Record<string, unknown>> {
      const { session_handle, sample_rate } = payload as { session_handle: string; sample_rate?: number };
      const client = activeSessions.get(session_handle);
      if (!client) return { ok: false, error: 'session not found' };
      const { startRecording } = await import('./audio');
      startRecording({
        sampleRate: sample_rate,
        onChunk: (buf) => client.sendAudio(buf, sample_rate ?? 16000),
        onError: (err) => {
          emit({ v: 1, kind: 'error', id: randomUUID(), payload: { code: 'E_AUDIO', message: err.message } });
        },
      });
      return { ok: true };
    },

    async audioStop(payload: Record<string, unknown>): Promise<Record<string, unknown>> {
      const { session_handle } = payload as { session_handle: string };
      const client = activeSessions.get(session_handle);
      const { stopRecording } = await import('./audio');
      stopRecording();
      if (client) {
        client.sendAudioEnd();
      }
      return { ok: true };
    },

    async toolResult(payload: Record<string, unknown>): Promise<Record<string, unknown>> {
      const { session_handle, call_id, result } = payload as { session_handle: string; call_id: string; result: unknown };
      const client = activeSessions.get(session_handle);
      client?.sendToolResult(call_id, result);
      return { ok: true };
    },
  };
}
