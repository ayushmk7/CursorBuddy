import * as vscode from 'vscode';
import * as path from 'path';
import { AssistantEnvelopeV1Schema, AssistantEnvelopeV1, CursorBuddyAction } from '@cursorbuddy/shared';
import { SidecarManager } from './sidecarManager';
import { SessionManager } from './sessionManager';
import { CursorBuddyWebviewProvider } from './webviewProvider';
import { executeEnvelope } from './executor';
import { probeWorkspaceState } from './workspaceAdapter';

export function activate(context: vscode.ExtensionContext): void {
  const outputChannel = vscode.window.createOutputChannel('CursorBuddy');
  const log = (line: string) => outputChannel.appendLine(line);

  const sidecarPath = path.join(context.extensionUri.fsPath, '..', '..', 'sidecar', 'dist', 'index.js');
  const mapsDir = path.join(context.extensionUri.fsPath, '..', '..', 'shared', 'maps');

  const pendingConfirms = new Map<string, (confirmed: boolean) => void>();

  const webviewProvider = new CursorBuddyWebviewProvider(context.extensionUri);

  function postEnvelopeToWebview(envelope: AssistantEnvelopeV1): void {
    webviewProvider.postTranscript({ role: 'assistant', text: envelope.assistant_text });
    webviewProvider.postEnvelopeSteps(
      envelope.actions
        .filter(a => a.type !== 'noop')
        .map(a => ({
          id: a.id,
          title: actionTitle(a),
          detail: actionDetail(a),
        }))
    );
  }

  function actionTitle(a: CursorBuddyAction): string {
    switch (a.type) {
      case 'execute_command':           return a.alias.replace(/_/g, ' ');
      case 'show_information_message':  return 'Show message';
      case 'reveal_uri':                return 'Open file';
      case 'set_editor_selection':      return 'Navigate to location';
      case 'request_user_confirm':      return a.title;
      default:                          return a.type;
    }
  }

  function actionDetail(a: CursorBuddyAction): string | undefined {
    switch (a.type) {
      case 'execute_command':           return a.args?.join(', ');
      case 'show_information_message':  return a.message;
      case 'reveal_uri':                return a.uri;
      case 'set_editor_selection':      return `Line ${a.start.line + 1}`;
      case 'request_user_confirm':      return a.details;
      default:                          return undefined;
    }
  }

  const sidecarManager = new SidecarManager(
    sidecarPath,
    process.env.WAVECLICK_MOCK_OPENCLAW === '1' ? { WAVECLICK_MOCK_OPENCLAW: '1' } : {},
    async (eventMethod, payload) => {
      if (eventMethod === 'provider.envelope') {
        const parsed = AssistantEnvelopeV1Schema.safeParse(payload);
        if (parsed.success) {
          postEnvelopeToWebview(parsed.data);
        }
        executeEnvelope(payload, {
          mapsDir,
          log,
          requestConfirm: (id, title, details) => new Promise<boolean>((resolve) => {
            pendingConfirms.set(id, resolve);
            webviewProvider.postConfirmRequest(id, title, details);
          }),
          postStepStatus: (id, status) => webviewProvider.postStepStatus(id, status),
        }).catch((err) => log('[executor error] ' + String(err)));
      } else if (eventMethod === 'provider.tool_call') {
        const { call_id, name, input } = payload as { call_id: string; name: string; input: Record<string, unknown>; session_handle?: string };
        const sessionHandle = sessionManager.getSessionHandle();
        if (name === 'vscode_probe_state') {
          try {
            const result = await probeWorkspaceState(input ?? {});
            await sidecarManager.request('tool_call.result', { session_handle: sessionHandle, call_id, result });
          } catch (err) {
            log('[tool_call error] ' + String(err));
          }
        } else {
          log('[tool_call] unknown tool: ' + name);
        }
      } else {
        log(`[sidecar event] ${eventMethod}: ${JSON.stringify(payload)}`);
      }
    },
    (code, msg) => {
      log(`[sidecar error] ${code}: ${msg}`);
      vscode.window.showErrorMessage(`CursorBuddy: ${msg}`);
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

  webviewProvider.setCallbacks({
    onPushToTalk: async (down) => {
      const sessionHandle = sessionManager.getSessionHandle();
      if (!sessionHandle) return;
      if (down) {
        webviewProvider.postTranscript({ role: 'user', text: '...' });
        await sidecarManager.request('audio.start', { session_handle: sessionHandle }).catch(err => log('[audio.start] ' + String(err)));
      } else {
        await sidecarManager.request('audio.stop', { session_handle: sessionHandle }).catch(err => log('[audio.stop] ' + String(err)));
      }
    },
    onConfirmResult: (id, confirmed) => {
      pendingConfirms.get(id)?.(confirmed);
      pendingConfirms.delete(id);
      webviewProvider.postConfirmClear();
    },
  });

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(CursorBuddyWebviewProvider.viewType, webviewProvider),
    vscode.commands.registerCommand('cursorbuddy.startSession', () => sessionManager.start()),
    vscode.commands.registerCommand('cursorbuddy.stopSession', () => sessionManager.stop()),
    vscode.commands.registerCommand('cursorbuddy.setAuth', async () => {
      const token = await vscode.window.showInputBox({
        prompt: 'Enter your CursorBuddy OpenClaw auth token',
        password: true,
        placeHolder: 'Paste token here',
      });
      if (token !== undefined) {
        await context.secrets.store('cursorbuddy.openclaw.auth', token);
        vscode.window.showInformationMessage('CursorBuddy: auth token saved securely');
      }
    }),
    outputChannel
  );
}

export function deactivate(): void {}
