import * as vscode from 'vscode';
import { SidecarManager } from './sidecarManager';

export type SessionState = 'inactive' | 'connecting' | 'live' | 'blocked';

export class SessionManager {
  private state: SessionState = 'inactive';
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
    const cfg = vscode.workspace.getConfiguration('waveclick');
    let openclawBaseUrl = cfg.get<string>('openclaw.baseUrl', 'ws://localhost:9090');
    const workflow = cfg.get<string>('openclaw.workflow', 'waveclick_session');
    const authRef = cfg.get<string>('openclaw.auth', '');

    if (process.env.WAVECLICK_MOCK_OPENCLAW === '1') {
      openclawBaseUrl = 'ws://localhost:9090';
    }

    this.state = 'connecting';
    this.onStateChange('connecting');

    try {
      await this.sidecarManager.start();
      await this.sidecarManager.request('session.start', { openclawBaseUrl, workflow, authRef });
      this.state = 'live';
      this.onStateChange('live');
    } catch (err) {
      this.state = 'blocked';
      this.onStateChange('blocked');
      const error = err instanceof Error ? err : new Error(String(err));
      vscode.window.showErrorMessage('WaveClick: ' + error.message);
    }
  }

  async stop(): Promise<void> {
    this.state = 'inactive';
    this.onStateChange('inactive');
    this.sidecarManager.stop();
  }

  getState(): SessionState {
    return this.state;
  }
}
