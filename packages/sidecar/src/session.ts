import { randomUUID } from 'crypto';
import { IpcMessage, SessionStartPayload, SessionStopPayload } from './types';
import { SessionHandler } from './ipc';
import { OpenClawClientFactory, OpenClawWsClient, defaultClientFactory } from './openclaw-client';
import { endPlayback, playPcmChunk } from './audio';

interface MintSessionResponse {
  session_id: string;
  upstream: {
    type: string;
    url: string;
    headers?: Record<string, string>;
  };
}

async function mintBridgeSession(payload: SessionStartPayload): Promise<{ sessionId: string; wsUrl: string; headers: Record<string, string> }> {
  const bridgeBase = payload.bridgeBaseUrl ?? 'http://127.0.0.1:8787';
  const mintUrl = `${bridgeBase.replace(/\/$/, '')}/v1/sessions`;
  const auth = payload.authRef?.trim();
  if (!auth) {
    throw new Error('bridge mode requires cursorbuddy.openclaw.auth token');
  }
  const response = await fetch(mintUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${auth}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client: {
        vscode_version: 'unknown',
        extension_version: 'unknown',
        os: process.platform,
        sidecar_version: 'dev',
      },
      openclaw_workflow: payload.workflow,
      locale: payload.locale ?? 'en-US',
    }),
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`bridge mint failed (${response.status}): ${body}`);
  }
  const minted = await response.json() as MintSessionResponse;
  const wsUrl = minted.upstream?.url;
  const headers = minted.upstream?.headers ?? {};
  if (!minted.session_id || !wsUrl) {
    throw new Error('bridge mint returned incomplete payload');
  }
  return { sessionId: minted.session_id, wsUrl, headers };
}

export function createSessionHandler(
  emit: (msg: IpcMessage) => void,
  clientFactory: OpenClawClientFactory = defaultClientFactory,
  activeSessions: Map<string, OpenClawWsClient> = new Map()
): SessionHandler {
  return {
    async start(payload: Record<string, unknown>): Promise<Record<string, unknown>> {
      const p = payload as unknown as SessionStartPayload;
      const mode = p.connectionMode ?? 'bridge';
      let url = p.openclawBaseUrl;
      let sessionHandle = randomUUID();
      let headers: Record<string, string> | undefined;
      if (mode === 'bridge') {
        const minted = await mintBridgeSession(p);
        sessionHandle = minted.sessionId;
        url = minted.wsUrl;
        headers = minted.headers;
      } else if (!url) {
        throw new Error('openclawBaseUrl is required for direct mode');
      }

      const client = clientFactory({
        url,
        headers,
        onEnvelope: (raw) => {
          emit({ v: 1, kind: 'event', id: randomUUID(), method: 'provider.envelope', payload: raw as Record<string, unknown> });
        },
        onToolCall: (callId, name, input) => {
          emit({ v: 1, kind: 'event', id: randomUUID(), method: 'provider.tool_call',
                 payload: { call_id: callId, name, input: input as Record<string, unknown> } });
        },
        onAudioOutputChunk: (base64Pcm, sampleRate) => {
          playPcmChunk(Buffer.from(base64Pcm, 'base64'), sampleRate);
        },
        onAudioOutputDone: () => {
          endPlayback();
        },
        onError: (code, message) => {
          emit({
            v: 1,
            kind: 'event',
            id: randomUUID(),
            method: 'sidecar.error',
            payload: { code, message, session_handle: sessionHandle },
          });
          emit({ v: 1, kind: 'error', id: randomUUID(), payload: { code, message } });
        },
        onClose: () => {
          emit({
            v: 1,
            kind: 'event',
            id: randomUUID(),
            method: 'sidecar.closed',
            payload: { session_handle: sessionHandle },
          });
          activeSessions.delete(sessionHandle);
        },
      });

      await client.connect();
      activeSessions.set(sessionHandle, client);
      client.sendText(JSON.stringify({
        type: 'session_start',
        session_id: sessionHandle,
        workflow: p.workflow,
        locale: p.locale ?? 'en-US',
      }));

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
