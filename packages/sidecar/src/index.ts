import { execSync } from 'child_process';
import { startIpcLoop, writeLine } from './ipc';
import { createSessionHandler } from './session';

try {
  execSync('sox --version', { stdio: 'ignore' });
} catch {
  process.stderr.write('[audio] sox not found — microphone input unavailable. Install with: brew install sox\n');
}

const handler = createSessionHandler(writeLine);
startIpcLoop(handler);
