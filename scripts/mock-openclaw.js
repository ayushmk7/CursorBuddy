#!/usr/bin/env node
// Mock OpenClaw WebSocket server for CI testing.
// Returns a canned AssistantEnvelopeV1 in response to any text message.
// NEVER used in production.

const { WebSocketServer } = require("ws");
const PORT = parseInt(process.env.PORT || "9090", 10);

const CANNED_ENVELOPE = JSON.stringify({
  schema_version: "1.0",
  session_id: "00000000-0000-0000-0000-000000000001",
  utterance_id: "00000000-0000-0000-0000-000000000002",
  assistant_text: "Opening the Source Control view.",
  confidence: 0.95,
  actions: [
    { id: "a1", type: "execute_command", risk: "low", alias: "open_scm", args: [] },
  ],
});

const wss = new WebSocketServer({ port: PORT });
wss.on("connection", (ws) => {
  console.log("mock-openclaw: client connected");
  ws.on("message", () => {
    ws.send(CANNED_ENVELOPE);
  });
  ws.on("close", () => console.log("mock-openclaw: client disconnected"));
});
console.log(`mock-openclaw listening on ws://0.0.0.0:${PORT}`);
