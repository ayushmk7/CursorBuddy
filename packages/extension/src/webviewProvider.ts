import * as vscode from 'vscode';
import { randomBytes } from 'crypto';
import { LocalClientUiState } from './localUiState';
import { getWebviewHtml } from './webview/ui';

export class CursorBuddyWebviewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'cursorbuddy.sidebar';
  private _view?: vscode.WebviewView;

  private _snapshot?: LocalClientUiState;
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
          if (this._snapshot) {
            this._view?.webview.postMessage({ type: 'snapshot', payload: this._snapshot });
          }
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

  postSnapshot(snapshot: LocalClientUiState): void {
    this._snapshot = snapshot;
    this._view?.webview.postMessage({ type: 'snapshot', payload: snapshot });
  }

  postPatch(snapshot: LocalClientUiState): void {
    this._snapshot = snapshot;
    this._view?.webview.postMessage({ type: 'patch', payload: snapshot });
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
