import WebSocket from "ws";

interface ToolCall {
  callId: string;
  name: string;
  input: unknown;
}

interface RealtimeCallbacks {
  onText: (text: string) => void;
  onAudioChunk: (base64Pcm: string, sampleRate: number) => void;
  onToolCall: (call: ToolCall) => void;
  onResponseDone: (hasToolCall: boolean) => void;
  onError: (message: string) => void;
}

export class RealtimeClient {
  private ws: WebSocket | null = null;
  private connected = false;

  constructor(
    private readonly apiKey: string,
    private readonly model: string,
    private readonly callbacks: RealtimeCallbacks
  ) {}

  connect(voice: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(`wss://api.openai.com/v1/realtime?model=${encodeURIComponent(this.model)}`, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
      });
      this.ws = ws;
      ws.on("open", () => {
        this.connected = true;
        ws.send(
          JSON.stringify({
            type: "session.update",
            session: {
              type: "realtime",
              model: this.model,
              audio: {
                output: { voice },
              },
              tools: [
                {
                  type: "function",
                  name: "vscode_probe_state",
                  description: "Probe VS Code workspace and editor state.",
                  parameters: {
                    type: "object",
                    additionalProperties: false,
                    properties: {
                      include_git: { type: "boolean" },
                      include_active_editor: { type: "boolean" },
                      include_file_body: { type: "boolean" },
                    },
                  },
                },
              ],
              turn_detection: {
                type: "server_vad",
                create_response: false,
                interrupt_response: true,
              },
            },
          })
        );
        resolve();
      });
      ws.on("error", (err) => {
        this.callbacks.onError(err.message);
        reject(err);
      });
      ws.on("message", (message) => this.handleEvent(message.toString()));
      ws.on("close", () => {
        this.connected = false;
      });
    });
  }

  sendAudio(base64Pcm: string): void {
    if (!this.connected || !this.ws) return;
    this.ws.send(
      JSON.stringify({
        type: "input_audio_buffer.append",
        audio: base64Pcm,
      })
    );
  }

  commitAudioAndRespond(): void {
    if (!this.connected || !this.ws) return;
    this.ws.send(JSON.stringify({ type: "input_audio_buffer.commit" }));
    this.ws.send(JSON.stringify({ type: "response.create" }));
  }

  submitToolResult(callId: string, output: unknown): void {
    if (!this.connected || !this.ws) return;
    this.ws.send(
      JSON.stringify({
        type: "conversation.item.create",
        item: {
          type: "function_call_output",
          call_id: callId,
          output: JSON.stringify(output ?? {}),
        },
      })
    );
    this.ws.send(JSON.stringify({ type: "response.create" }));
  }

  close(): void {
    this.ws?.close();
    this.ws = null;
    this.connected = false;
  }

  private handleEvent(raw: string): void {
    let parsed: any;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return;
    }
    const type = parsed?.type;
    if (type === "response.output_text.delta" && typeof parsed.delta === "string") {
      this.callbacks.onText(parsed.delta);
      return;
    }
    if (type === "response.output_audio.delta" && typeof parsed.delta === "string") {
      this.callbacks.onAudioChunk(parsed.delta, 24000);
      return;
    }
    if (type === "response.done") {
      const outputItems = parsed?.response?.output ?? [];
      let hasToolCall = false;
      for (const item of outputItems) {
        if (item?.type === "function_call") {
          hasToolCall = true;
          let input: unknown = {};
          try {
            input = item.arguments ? JSON.parse(item.arguments) : {};
          } catch {
            input = {};
          }
          this.callbacks.onToolCall({
            callId: item.call_id,
            name: item.name,
            input,
          });
        }
      }
      this.callbacks.onResponseDone(hasToolCall);
    }
  }
}
