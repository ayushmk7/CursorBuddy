import { startIpcLoop } from './ipc';
import { createSessionHandler } from './session';
import { writeLine } from './ipc';

const handler = createSessionHandler(writeLine);
startIpcLoop(handler);
