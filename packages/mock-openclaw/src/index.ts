import { WebSocketServer, WebSocket } from 'ws';
import { randomUUID } from 'crypto';

const PORT = 9090;
const wss = new WebSocketServer({ port: PORT });

console.log(`[mock-openclaw] listening on ws://localhost:${PORT}`);

wss.on('connection', (ws: WebSocket) => {
  console.log('[mock-openclaw] client connected');

  ws.on('message', (data: Buffer) => {
    let msg: any;
    try { msg = JSON.parse(data.toString()); } catch { return; }
    console.log('[mock-openclaw] received:', JSON.stringify(msg));

    if (msg.type === 'session_start') {
      // Send a greeting envelope
      setTimeout(() => sendEnvelope(ws, greetingEnvelope(msg.sessionHandle)), 300);
    } else if (msg.type === 'audio_end') {
      // Respond to a voice command with a canned envelope
      setTimeout(() => sendEnvelope(ws, cannedEnvelope(msg.sessionHandle ?? 'unknown')), 500);
    } else if (msg.type === 'tool_call') {
      // Not expected in mock mode — ignore
    }
  });

  ws.on('close', () => console.log('[mock-openclaw] client disconnected'));
});

function sendEnvelope(ws: WebSocket, envelope: object): void {
  ws.send(JSON.stringify(envelope));
}

function greetingEnvelope(sessionId: string): object {
  return {
    schema_version: '1.0',
    session_id: randomUUID(),
    utterance_id: randomUUID(),
    assistant_text: "Hi! I'm CursorBuddy. Hold the Push-to-Talk button and say a command.",
    confidence: 1.0,
    actions: [
      { type: 'show_information_message', id: 'greet-1', risk: 'low',
        message: "CursorBuddy session started. Hold PTT to speak." }
    ],
  };
}

function cannedEnvelope(sessionId: string): object {
  return {
    schema_version: '1.0',
    session_id: randomUUID(),
    utterance_id: randomUUID(),
    assistant_text: "Opening Source Control so you can commit your changes.",
    confidence: 0.92,
    actions: [
      { type: 'execute_command', id: 'open-scm-1', risk: 'low', alias: 'open_scm' }
    ],
  };
}
