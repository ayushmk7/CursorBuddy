import { randomUUID } from 'crypto';
import { IpcMessage, SessionStartPayload, SessionStopPayload } from './types';
import { SessionHandler } from './ipc';
import { OpenClawClientFactory, OpenClawWsClient, defaultClientFactory } from './openclaw-client';

const activeSessions = new Map<string, OpenClawWsClient>();

export function createSessionHandler(
  emit: (msg: IpcMessage) => void,
  clientFactory: OpenClawClientFactory = defaultClientFactory
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
        onError: (code, message) => {
          emit({ v: 1, kind: 'error', id: randomUUID(), payload: { code, message } });
        },
        onClose: () => {
          activeSessions.delete(sessionHandle);
        },
      });

      await client.connect();
      activeSessions.set(sessionHandle, client);

      // Trigger mock-openclaw to send its canned envelope
      client.sendText(JSON.stringify({ type: 'session_start', sessionHandle }));

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
  };
}
