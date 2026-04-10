import WebSocket from 'ws';

export interface OpenClawClientOptions {
  url: string;
  onEnvelope: (raw: unknown) => void;
  onError: (code: string, message: string) => void;
  onClose: () => void;
}

export type OpenClawClientFactory = (opts: OpenClawClientOptions) => OpenClawWsClient;

export class OpenClawWsClient {
  private ws: WebSocket | null = null;

  constructor(private readonly opts: OpenClawClientOptions) {}

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(this.opts.url);
      this.ws = ws;
      ws.on('open', () => resolve());
      ws.on('error', (err) => {
        this.opts.onError('E_NET', err.message);
        reject(err);
      });
      ws.on('close', () => this.opts.onClose());
      ws.on('message', (data) => {
        try {
          const parsed = JSON.parse(data.toString());
          this.opts.onEnvelope(parsed);
        } catch {
          this.opts.onError('E_PROTOCOL', 'failed to parse upstream message');
        }
      });
    });
  }

  sendText(text: string): void {
    this.ws?.send(text);
  }

  dispose(): void {
    this.ws?.close();
    this.ws = null;
  }
}

export function defaultClientFactory(opts: OpenClawClientOptions): OpenClawWsClient {
  return new OpenClawWsClient(opts);
}
