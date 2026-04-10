import { startIpcLoop, writeLine } from './ipc';
import { createSessionHandler } from './session';

const handler = createSessionHandler(writeLine);
startIpcLoop(handler);
