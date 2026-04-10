import * as vscode from 'vscode';
import { randomBytes } from 'crypto';
import { SessionState } from './sessionManager';

export class WaveClickWebviewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'waveclick.sidebar';
  private _view?: vscode.WebviewView;

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
    webviewView.webview.onDidReceiveMessage((message) => {
      // handle ui_ready, push_to_talk, confirm_result
    });
  }

  postState(state: { state: SessionState }): void {
    this._view?.webview.postMessage({ type: 'state', ...state });
  }

  postTranscript(delta: string): void {
    this._view?.webview.postMessage({ type: 'transcript_delta', delta });
  }

  private _getHtmlForWebview(webview: vscode.Webview): string {
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'dist', 'webview.js')
    );
    const nonce = this._getNonce();
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'nonce-${nonce}'; style-src 'nonce-${nonce}'; img-src ${webview.cspSource} data:; font-src ${webview.cspSource};">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>WaveClick</title>
</head>
<body>
  <div id="status">Loading...</div>
  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
  }

  private _getNonce(): string {
    return randomBytes(16).toString('base64url');
  }
}
