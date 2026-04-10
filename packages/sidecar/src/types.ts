export interface IpcMessage {
  v: 1;
  kind: 'request' | 'event' | 'response' | 'error';
  id: string;
  method?: string;
  payload: Record<string, unknown>;
}

export interface SessionStartPayload {
  openclawBaseUrl: string;
  workflow: string;
  authRef: string;
  bridgeJwt?: string;
}

export interface SessionStopPayload {
  sessionHandle: string;
}
