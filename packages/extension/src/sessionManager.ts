import * as vscode from 'vscode';
import { SidecarManager } from './sidecarManager';

export type SessionState = 'inactive' | 'connecting' | 'live' | 'blocked';

export class SessionManager {
  private state: SessionState = 'inactive';
  private _sessionHandle: string = '';
  private context: vscode.ExtensionContext;
  private sidecarManager: SidecarManager;
  private onStateChange: (state: SessionState) => void;
  private log: (line: string) => void;

  constructor(
    context: vscode.ExtensionContext,
    sidecarManager: SidecarManager,
    onStateChange: (state: SessionState) => void,
    log: (line: string) => void
  ) {
    this.context = context;
    this.sidecarManager = sidecarManager;
    this.onStateChange = onStateChange;
    this.log = log;
  }

  async start(): Promise<void> {
    if (this.state === 'connecting' || this.state === 'live') {
      return;
    }
    const cfg = vscode.workspace.getConfiguration('cursorbuddy');
    const connectionMode = cfg.get<'direct' | 'bridge'>('connectionMode', 'bridge');
    const openclawBaseUrl = cfg.get<string>('openclaw.baseUrl', 'ws://localhost:9090');
    const bridgeBaseUrl = cfg.get<string>('bridge.baseUrl', 'http://127.0.0.1:8787');
    const workflow = cfg.get<string>('openclaw.workflow', 'cursorbuddy_session');

    // Try SecretStorage first, fall back to config for dev convenience
    let authRef = await this.context.secrets.get('cursorbuddy.openclaw.auth') ?? '';
    if (!authRef) {
      authRef = cfg.get<string>('openclaw.auth', '');
    }

    this.state = 'connecting';
    this.onStateChange('connecting');

    try {
      await this.sidecarManager.start();
      const locale = vscode.env.language;
      const startResult = await this.sidecarManager.request('session.start', {
        connectionMode,
        openclawBaseUrl,
        bridgeBaseUrl,
        workflow,
        authRef,
        locale,
      }) as { sessionHandle: string };
      this._sessionHandle = startResult.sessionHandle;
      this.state = 'live';
      this.onStateChange('live');
    } catch (err) {
      this.state = 'blocked';
      this.onStateChange('blocked');
      const error = err instanceof Error ? err : new Error(String(err));
      vscode.window.showErrorMessage('CursorBuddy: ' + error.message);
    }
  }

  async stop(): Promise<void> {
    if (this._sessionHandle) {
      try {
        await this.sidecarManager.request('session.stop', { sessionHandle: this._sessionHandle });
      } catch {
        // best effort
      }
      this._sessionHandle = '';
    }
    this.state = 'inactive';
    this.onStateChange('inactive');
    this.sidecarManager.stop();
  }

  getState(): SessionState {
    return this.state;
  }

  getSessionHandle(): string {
    return this._sessionHandle;
  }

  markBlocked(reason: string): void {
    if (this.state === 'inactive') return;
    this.state = 'blocked';
    this.onStateChange('blocked');
    vscode.window.showErrorMessage(`CursorBuddy: ${reason}`);
  }
}
