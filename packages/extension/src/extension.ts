import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext): void {
  const outputChannel = vscode.window.createOutputChannel('WaveClick');
  outputChannel.appendLine('WaveClick activated');

  context.subscriptions.push(
    vscode.commands.registerCommand('waveclick.startSession', () => {
      outputChannel.appendLine('[cmd] startSession triggered (not yet wired)');
      vscode.window.showInformationMessage('WaveClick: starting session...');
    }),
    vscode.commands.registerCommand('waveclick.stopSession', () => {
      outputChannel.appendLine('[cmd] stopSession triggered');
    }),
    outputChannel,
  );
}

export function deactivate(): void {}
