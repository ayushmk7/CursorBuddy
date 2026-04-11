import WebSocket from 'ws';

export interface OpenClawClientOptions {
  url: string;
  onEnvelope: (raw: unknown) => void;
  onToolCall: (callId: string, name: string, input: unknown) => void;
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
      const ws = new WebSocket(this.opts.url);
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
          if (parsed?.type === 'tool_call') {
            this.opts.onToolCall(parsed.call_id, parsed.name, parsed.input);
          } else {
            this.opts.onEnvelope(parsed);
          }
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
