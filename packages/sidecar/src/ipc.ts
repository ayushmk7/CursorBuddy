import * as readline from 'readline';
import { IpcMessage } from './types';

export interface SessionHandler {
  start(payload: Record<string, unknown>): Promise<Record<string, unknown>>;
  stop(payload: Record<string, unknown>): Promise<Record<string, unknown>>;
  audioStart(payload: Record<string, unknown>): Promise<Record<string, unknown>>;
  audioStop(payload: Record<string, unknown>): Promise<Record<string, unknown>>;
  toolResult(payload: Record<string, unknown>): Promise<Record<string, unknown>>;
}

export function writeLine(msg: IpcMessage): void {
  process.stdout.write(JSON.stringify(msg) + '\n');
}

export async function processLine(
  line: string,
  write: (msg: IpcMessage) => void,
  handler: SessionHandler
): Promise<void> {
  let msg: IpcMessage;
  try {
    msg = JSON.parse(line) as IpcMessage;
  } catch {
    // silently drop malformed JSON
    return;
  }

  const respond = (kind: 'response' | 'error', payload: Record<string, unknown>) => {
    write({ v: 1, kind, id: msg.id, payload });
  };

  try {
    switch (msg.method) {
      case 'session.start': {
        const result = await handler.start(msg.payload);
        respond('response', result);
        break;
      }
      case 'session.stop': {
        const result = await handler.stop(msg.payload);
        respond('response', result);
        break;
      }
      case 'audio.start': {
        const result = await handler.audioStart(msg.payload);
        respond('response', result);
        break;
      }
      case 'audio.stop': {
        const result = await handler.audioStop(msg.payload);
        respond('response', result);
        break;
      }
      case 'tool_call.result': {
        const result = await handler.toolResult(msg.payload);
        respond('response', result);
        break;
      }
      default:
        respond('error', { code: 'E_UNKNOWN_METHOD', message: `Unknown method: ${msg.method ?? '(none)'}` });
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    respond('error', { code: 'E_INTERNAL', message });
  }
}

export function startIpcLoop(handler: SessionHandler): void {
  const rl = readline.createInterface({ input: process.stdin, terminal: false });
  rl.on('line', (line) => {
    processLine(line, writeLine, handler).catch((err) => {
      process.stderr.write(`[ipc error] ${err}\n`);
    });
  });
  rl.on('close', () => process.exit(0));
}
