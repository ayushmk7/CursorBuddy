import WebSocket from 'ws';
import {
  AssistantEnvelopeV1Schema,
  AudioOutputChunkServerFrameSchema,
  AudioOutputDoneServerFrameSchema,
  ToolCallServerFrameSchema,
} from '@cursorbuddy/shared';

export interface OpenClawClientOptions {
  url: string;
  headers?: Record<string, string>;
  onEnvelope: (raw: unknown) => void;
  onToolCall: (callId: string, name: string, input: unknown) => void;
  onAudioOutputChunk: (base64Pcm: string, sampleRate: number) => void;
  onAudioOutputDone: () => void;
  onError: (code: string, message: string) => void;
  onClose: () => void;
}

export type OpenClawClientFactory = (opts: OpenClawClientOptions) => OpenClawWsClient;

export class OpenClawWsClient {
  private ws: WebSocket | null = null;

  constructor(private readonly opts: OpenClawClientOptions) {}

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      let resolved = false;
      const ws = new WebSocket(this.opts.url, {
        headers: this.opts.headers ?? {},
      });
      this.ws = ws;
      ws.on('open', () => { resolved = true; resolve(); });
      ws.on('error', (err) => {
        if (!resolved) {
          reject(err); // pre-connect: let the caller handle it
        } else {
          this.opts.onError('E_NET', err.message); // post-connect: route to callback
        }
      });
      ws.on('close', () => this.opts.onClose());
      ws.on('message', (data) => {
        try {
          const parsed = JSON.parse(data.toString());
          const toolCall = ToolCallServerFrameSchema.safeParse(parsed);
          if (toolCall.success) {
            this.opts.onToolCall(toolCall.data.call_id, toolCall.data.name, toolCall.data.input);
            return;
          }
          const audioChunk = AudioOutputChunkServerFrameSchema.safeParse(parsed);
          if (audioChunk.success) {
            this.opts.onAudioOutputChunk(audioChunk.data.data, audioChunk.data.sample_rate);
            return;
          }
          const audioDone = AudioOutputDoneServerFrameSchema.safeParse(parsed);
          if (audioDone.success) {
            this.opts.onAudioOutputDone();
            return;
          }
          const envelope = AssistantEnvelopeV1Schema.safeParse(parsed);
          if (envelope.success) {
            this.opts.onEnvelope(envelope.data);
            return;
          }
          this.opts.onError('E_PROTOCOL', 'unknown upstream message shape');
        } catch {
          this.opts.onError('E_PROTOCOL', 'failed to parse upstream message');
        }
      });
    });
  }

  sendText(text: string): void {
    this.ws?.send(text);
  }

  sendAudio(pcmBuffer: Buffer, sampleRate: number = 16000): void {
    this.ws?.send(JSON.stringify({
      type: 'audio_chunk',
      data: pcmBuffer.toString('base64'),
      encoding: 'pcm16',
      sample_rate: sampleRate,
    }));
  }

  sendToolResult(callId: string, result: unknown): void {
    this.ws?.send(JSON.stringify({ type: 'tool_result', call_id: callId, output: result }));
  }

  sendAudioEnd(): void {
    this.ws?.send(JSON.stringify({ type: 'audio_end' }));
  }

  dispose(): void {
    this.ws?.close();
    this.ws = null;
  }
}

export function defaultClientFactory(opts: OpenClawClientOptions): OpenClawWsClient {
  return new OpenClawWsClient(opts);
}
