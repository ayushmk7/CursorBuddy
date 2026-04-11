import { randomUUID } from 'crypto';
import * as readline from 'readline';
import { spawn, ChildProcess } from 'child_process';

interface IpcMessage {
  v: 1;
  kind: 'request' | 'event' | 'response' | 'error';
  id: string;
  method?: string;
  payload: Record<string, unknown>;
}

interface PendingRequest {
  resolve: (value: unknown) => void;
  reject: (reason: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}

const REQUEST_TIMEOUT_MS = 10_000;
const BACKOFF_INITIAL_MS = 1_000;
const BACKOFF_MAX_MS = 30_000;

export class SidecarManager {
  private sidecarPath: string;
  private env: Record<string, string>;
  private onEvent: (method: string, payload: unknown) => void;
  private onError: (code: string, msg: string) => void;
  private log: (line: string) => void;

  private child: ChildProcess | null = null;
  private pending: Map<string, PendingRequest> = new Map();
  private stopped = false;
  private restartDelay = BACKOFF_INITIAL_MS;
  private receivedFirstMessage = false;

  constructor(
    sidecarPath: string,
    env: Record<string, string>,
    onEvent: (method: string, payload: unknown) => void,
    onError: (code: string, msg: string) => void,
    log: (line: string) => void
  ) {
    this.sidecarPath = sidecarPath;
    this.env = env;
    this.onEvent = onEvent;
    this.onError = onError;
    this.log = log;
  }

  private autoRestart(): void {
    const delay = this.restartDelay;
    this.restartDelay = Math.min(this.restartDelay * 2, BACKOFF_MAX_MS);
    this.log(`[sidecar] restarting in ${delay}ms`);
    setTimeout(() => {
      if (!this.stopped) {
        this.autoRestart_spawn().catch((err) => {
          this.log(`[sidecar] restart failed: ${err}`);
        });
      }
    }, delay);
  }

  private async autoRestart_spawn(): Promise<void> {
    // same as start() but does NOT reset restartDelay
    this.stopped = false;
    this.receivedFirstMessage = false;

    if (this.child) {
      this.child.kill();
      this.child = null;
    }

    return this._spawn();
  }

  async start(): Promise<void> {
    this.stopped = false;
    this.receivedFirstMessage = false;
    this.restartDelay = BACKOFF_INITIAL_MS;

    if (this.child) {
      this.child.kill();
      this.child = null;
    }

    return this._spawn();
  }

  private async _spawn(): Promise<void> {
    const child = spawn('node', [this.sidecarPath], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, ...this.env },
    });

    this.child = child;

    // Wire up readline on stdout
    const rl = readline.createInterface({ input: child.stdout! });

    rl.on('line', (line: string) => {
      // Reset backoff delay on first successful message
      if (!this.receivedFirstMessage) {
        this.receivedFirstMessage = true;
        this.restartDelay = BACKOFF_INITIAL_MS;
      }

      let msg: IpcMessage;
      try {
        msg = JSON.parse(line) as IpcMessage;
      } catch {
        this.log(`[sidecar] malformed JSON: ${line}`);
        return;
      }

      if (msg.kind === 'response' || msg.kind === 'error') {
        const pending = this.pending.get(msg.id);
        if (pending) {
          clearTimeout(pending.timer);
          this.pending.delete(msg.id);
          if (msg.kind === 'response') {
            pending.resolve(msg.payload);
          } else {
            const errPayload = msg.payload as { code?: string; message?: string };
            pending.reject(new Error(`${errPayload.code ?? 'E_UNKNOWN'}: ${errPayload.message ?? line}`));
          }
        }
      } else if (msg.kind === 'event') {
        this.onEvent(msg.method ?? '', msg.payload);
      }
    });

    // Forward stderr lines to log
    const stderrRl = readline.createInterface({ input: child.stderr! });
    stderrRl.on('line', (line: string) => {
      this.log(`[sidecar stderr] ${line}`);
    });

    // Suppress write errors on stdin — already handled per-request in the write callback
    child.stdin!.on('error', () => {
      // write errors are already handled per-request in the write callback
    });

    // Handle exit with backoff restart
    child.on('exit', (code, signal) => {
      rl.close();
      stderrRl.close();
      this.child = null;

      this.log(`[sidecar] exited (code=${code}, signal=${signal})`);

      // Reject all pending requests
      for (const [id, pending] of this.pending) {
        clearTimeout(pending.timer);
        pending.reject(new Error('sidecar process exited'));
        this.pending.delete(id);
      }

      if (this.stopped) {
        return;
      }

      this.autoRestart();
    });

    // Wait for child 'spawn' event to resolve
    return new Promise<void>((resolve, reject) => {
      child.on('spawn', () => resolve());
      child.on('error', (err) => reject(err));
    });
  }

  async request(method: string, payload: object): Promise<unknown> {
    if (!this.child) {
      throw new Error('sidecar not running');
    }

    const id = randomUUID();
    const msg: IpcMessage = { v: 1, kind: 'request', id, method, payload: payload as Record<string, unknown> };

    return new Promise<unknown>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`request timeout: ${method}`));
      }, REQUEST_TIMEOUT_MS);

      this.pending.set(id, { resolve, reject, timer });

      const line = JSON.stringify(msg) + '\n';
      this.child!.stdin!.write(line, (err) => {
        if (err) {
          clearTimeout(timer);
          this.pending.delete(id);
          reject(err);
        }
      });
    });
  }

  stop(): void {
    this.stopped = true;
    if (this.child) {
      this.child.kill();
      this.child = null;
    }
  }
}
