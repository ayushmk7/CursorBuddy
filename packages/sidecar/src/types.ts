export interface IpcMessage {
  v: 1;
  kind: 'request' | 'event' | 'response' | 'error';
  id: string;
  method?: string;
  payload: Record<string, unknown>;
}

export interface SessionStartPayload {
  openclawBaseUrl: string;
  bridgeBaseUrl?: string;
  connectionMode?: "direct" | "bridge";
  workflow: string;
  authRef: string;
  locale?: string;
}

export interface SessionStopPayload {
  sessionHandle: string;
}

export interface AudioStartPayload {
  session_handle: string;
  sample_rate?: number;
}

export interface AudioStopPayload {
  session_handle: string;
}

export interface ToolResultPayload {
  session_handle: string;
  call_id: string;
  result: unknown;
}
