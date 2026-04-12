import { IncomingMessage } from "http";
import { WebSocket, WebSocketServer } from "ws";
import {
  AudioChunkFrameSchema,
  AudioEndFrameSchema,
  SessionStartFrameSchema,
  ToolResultFrameSchema,
  ToolCallServerFrameSchema,
  AudioOutputChunkServerFrameSchema,
  AudioOutputDoneServerFrameSchema,
} from "@cursorbuddy/shared";
import { buildEnvelope } from "./envelopeBuilder";
import { OpenClawConfig } from "./config";
import { RealtimeClient } from "./realtimeClient";

interface SessionState {
  sessionId: string;
  realtime: RealtimeClient;
  responseText: string;
  turnState: "idle" | "capturingAudio" | "awaitingModel" | "awaitingToolResult" | "streamingOutput" | "completed" | "failed";
  completionSent: boolean;
}

function unauthorized(socket: WebSocket): void {
  socket.close(1008, "unauthorized");
}

function parseSessionIdFromPath(pathname: string): string | null {
  const match = pathname.match(/^\/sessions\/([a-fA-F0-9-]+)$/);
  return match ? match[1] : null;
}

export function createOpenClawServer(config: OpenClawConfig): WebSocketServer {
  const wss = new WebSocketServer({ port: config.OPENCLAW_LISTEN_PORT });
  const sessions = new Map<WebSocket, SessionState>();

  const emitCompletion = (socket: WebSocket, current: SessionState): void => {
    if (current.completionSent) return;
    const safeText = current.responseText.trim() || "Done. I updated your editor state.";
    const envelope = buildEnvelope({
      sessionId: current.sessionId,
      assistantText: safeText,
    });
    socket.send(JSON.stringify(envelope));
    const done = AudioOutputDoneServerFrameSchema.parse({ type: "audio_output_done" });
    socket.send(JSON.stringify(done));
    current.completionSent = true;
    current.turnState = "completed";
  };

  wss.on("connection", async (socket: WebSocket, req: IncomingMessage) => {
    const authHeader = req.headers.authorization ?? "";
    if (authHeader !== `Bearer ${config.OPENCLAW_SERVICE_TOKEN}`) {
      unauthorized(socket);
      return;
    }
    const url = new URL(req.url ?? "/", "http://localhost");
    const pathSessionId = parseSessionIdFromPath(url.pathname);
    if (!pathSessionId) {
      socket.close(1008, "invalid session path");
      return;
    }

    let state: SessionState | null = null;
    socket.on("message", async (raw) => {
      let parsed: unknown;
      try {
        parsed = JSON.parse(raw.toString());
      } catch {
        socket.close(1003, "invalid json");
        return;
      }

      const sessionStart = SessionStartFrameSchema.safeParse(parsed);
      if (sessionStart.success) {
        if (sessionStart.data.session_id !== pathSessionId) {
          socket.close(1008, "session mismatch");
          return;
        }
        const realtime = new RealtimeClient(config.OPENAI_API_KEY, config.OPENAI_REALTIME_MODEL, {
          onText: (delta) => {
            const current = sessions.get(socket);
            if (current) {
              current.responseText += delta;
              current.turnState = "streamingOutput";
            }
          },
          onAudioChunk: (base64Pcm, sampleRate) => {
            const frame = AudioOutputChunkServerFrameSchema.parse({
              type: "audio_output_chunk",
              data: base64Pcm,
              encoding: "pcm16",
              sample_rate: sampleRate,
            });
            socket.send(JSON.stringify(frame));
          },
          onToolCall: (toolCall) => {
            const current = sessions.get(socket);
            if (current) {
              current.turnState = "awaitingToolResult";
            }
            const frame = ToolCallServerFrameSchema.parse({
              type: "tool_call",
              call_id: toolCall.callId,
              name: "vscode_probe_state",
              input: toolCall.input as Record<string, unknown>,
            });
            socket.send(JSON.stringify(frame));
          },
          onResponseDone: (hasToolCall) => {
            const current = sessions.get(socket);
            if (!current) return;
            if (!hasToolCall) {
              emitCompletion(socket, current);
            } else {
              current.turnState = "awaitingToolResult";
            }
          },
          onError: () => {
            const current = sessions.get(socket);
            if (current) {
              current.turnState = "failed";
            }
            socket.close(1011, "realtime error");
          },
        });
        try {
          await realtime.connect(config.OPENCLAW_DEFAULT_VOICE);
        } catch {
          socket.close(1011, "realtime connect failed");
          return;
        }
        state = {
          sessionId: sessionStart.data.session_id,
          realtime,
          responseText: "",
          turnState: "idle",
          completionSent: false,
        };
        sessions.set(socket, state);
        return;
      }

      const audioChunk = AudioChunkFrameSchema.safeParse(parsed);
      if (audioChunk.success) {
        const current = sessions.get(socket);
        if (!current) return;
        current.turnState = "capturingAudio";
        current.realtime.sendAudio(audioChunk.data.data);
        return;
      }

      const audioEnd = AudioEndFrameSchema.safeParse(parsed);
      if (audioEnd.success) {
        const current = sessions.get(socket);
        if (!current) return;
        current.responseText = "";
        current.completionSent = false;
        current.turnState = "awaitingModel";
        current.realtime.commitAudioAndRespond();
        return;
      }

      const toolResult = ToolResultFrameSchema.safeParse(parsed);
      if (toolResult.success) {
        const current = sessions.get(socket);
        if (!current) return;
        current.turnState = "awaitingModel";
        current.realtime.submitToolResult(toolResult.data.call_id, toolResult.data.output);
        // Wait for model completion callback to emit envelope/audio_done.
        return;
      }
    });

    socket.on("close", () => {
      const current = sessions.get(socket);
      if (current) {
        current.realtime.close();
        sessions.delete(socket);
      }
    });
  });

  return wss;
}
