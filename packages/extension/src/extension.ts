import * as vscode from 'vscode';
import * as path from 'path';
import { SidecarManager } from './sidecarManager';
import { SessionManager } from './sessionManager';
import { WaveClickWebviewProvider } from './webviewProvider';
import { executeEnvelope } from './executor';

export function activate(context: vscode.ExtensionContext): void {
  const outputChannel = vscode.window.createOutputChannel('WaveClick');
  const log = (line: string) => outputChannel.appendLine(line);

  const sidecarPath = path.join(context.extensionUri.fsPath, '..', '..', 'sidecar', 'dist', 'index.js');
  const mapsDir = path.join(context.extensionUri.fsPath, '..', '..', 'shared', 'maps');

  const webviewProvider = new WaveClickWebviewProvider(context.extensionUri);

  const sidecarManager = new SidecarManager(
    sidecarPath,
    process.env.WAVECLICK_MOCK_OPENCLAW === '1' ? { WAVECLICK_MOCK_OPENCLAW: '1' } : {},
    (raw) => executeEnvelope(raw, { mapsDir, log }).catch((err) => log('[executor error] ' + String(err))),
    (code, msg) => {
      log(`[sidecar error] ${code}: ${msg}`);
      vscode.window.showErrorMessage(`WaveClick: ${msg}`);
    },
    log
  );

  const sessionManager = new SessionManager(
    context,
    sidecarManager,
    (state) => {
      log(`[session state] ${state}`);
      webviewProvider.postState({ state });
    },
    log
  );

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(WaveClickWebviewProvider.viewType, webviewProvider),
    vscode.commands.registerCommand('waveclick.startSession', () => sessionManager.start()),
    vscode.commands.registerCommand('waveclick.stopSession', () => sessionManager.stop()),
    outputChannel
  );
}

export function deactivate(): void {}
