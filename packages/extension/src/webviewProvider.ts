import * as vscode from 'vscode';
import { randomBytes } from 'crypto';
import { SessionState } from './sessionManager';
import { getWebviewHtml } from './webview/ui';

export class CursorBuddyWebviewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'cursorbuddy.sidebar';
  private _view?: vscode.WebviewView;

  private _currentState: SessionState = 'inactive';
  private _onPushToTalk?: (down: boolean) => void;
  private _onConfirmResult?: (id: string, confirmed: boolean) => void;

  constructor(private readonly _extensionUri: vscode.Uri) {}

  resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ): void {
    this._view = webviewView;
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [vscode.Uri.joinPath(this._extensionUri, 'dist')],
    };
    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);
    webviewView.webview.onDidReceiveMessage((message: { type: string; [key: string]: unknown }) => {
      switch (message.type) {
        case 'ui_ready':
          // Replay current state so the freshly loaded webview is in sync
          this._view?.webview.postMessage({ type: 'state', state: this._currentState });
          break;
        case 'push_to_talk':
          this._onPushToTalk?.(message.down as boolean);
          break;
        case 'confirm_result':
          this._onConfirmResult?.(message.id as string, message.confirmed as boolean);
          break;
      }
    });
  }

  setCallbacks(opts: {
    onPushToTalk: (down: boolean) => void;
    onConfirmResult: (id: string, confirmed: boolean) => void;
  }): void {
    this._onPushToTalk = opts.onPushToTalk;
    this._onConfirmResult = opts.onConfirmResult;
  }

  postState(state: { state: SessionState }): void {
    this._currentState = state.state;
    this._view?.webview.postMessage({ type: 'state', ...state });
  }

  postTranscript(msg: { role: 'user' | 'assistant'; text: string }): void {
    this._view?.webview.postMessage({ type: 'transcript_delta', role: msg.role, text: msg.text });
  }

  postEnvelopeSteps(steps: Array<{ id: string; title: string; detail?: string }>): void {
    this._view?.webview.postMessage({ type: 'envelope_steps', steps });
  }

  postStepStatus(id: string, status: 'pending' | 'running' | 'done' | 'blocked'): void {
    this._view?.webview.postMessage({ type: 'step_status', id, status });
  }

  postConfirmRequest(id: string, title: string, details?: string): void {
    this._view?.webview.postMessage({ type: 'confirm_request', id, title, details });
  }

  postConfirmClear(): void {
    this._view?.webview.postMessage({ type: 'confirm_clear' });
  }

  postAudioLevel(level: number): void {
    this._view?.webview.postMessage({ type: 'audio_level', level });
  }

  postLatency(ms: number): void {
    this._view?.webview.postMessage({ type: 'latency_ms', ms });
  }

  private _getHtmlForWebview(webview: vscode.Webview): string {
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'dist', 'webview.js')
    );
    const nonce = this._getNonce();
    return getWebviewHtml(nonce, scriptUri.toString(), webview.cspSource);
  }

  private _getNonce(): string {
    return randomBytes(16).toString('base64url');
  }
}
