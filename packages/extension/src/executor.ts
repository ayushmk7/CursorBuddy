import * as vscode from 'vscode';
import { AssistantEnvelopeV1Schema, loadCommandMap, resolveAlias } from '@waveclick/shared';
import type { CommandEntry } from '@waveclick/shared';

export async function executeEnvelope(
  rawPayload: unknown,
  ctx: {
    mapsDir: string;
    log(s: string): void;
    requestConfirm?: (id: string, title: string, details?: string) => Promise<boolean>;
    postStepStatus?: (id: string, status: 'pending' | 'running' | 'done' | 'blocked') => void;
  },
): Promise<void> {
  // Step 1: Validate envelope
  const result = AssistantEnvelopeV1Schema.safeParse(rawPayload);
  if (!result.success) {
    ctx.log('invalid envelope: ' + JSON.stringify(result.error));
    return;
  }

  const envelope = result.data;

  // Step 2: Load command map
  let map: ReturnType<typeof loadCommandMap>;
  try {
    map = loadCommandMap(vscode.version, ctx.mapsDir);
  } catch (err) {
    ctx.log('failed to load command map: ' + String(err));
    return;
  }

  // Step 3: Execute each action
  for (const action of envelope.actions) {
    switch (action.type) {
      case 'execute_command': {
        let entry: CommandEntry;
        try {
          entry = resolveAlias(map, action.alias);
        } catch {
          ctx.log('unknown alias: ' + action.alias);
          continue;
        }

        // Confirm high-risk commands
        if (entry.risk === 'high') {
          let confirmed: boolean;
          if (ctx.requestConfirm) {
            confirmed = await ctx.requestConfirm(
              action.id,
              `High-risk action: ${entry.description ?? entry.commands[0]}`,
            );
          } else {
            confirmed =
              (await vscode.window.showWarningMessage(
                `High-risk action: ${entry.description ?? entry.commands[0]}`,
                { modal: true },
                'Confirm',
              )) === 'Confirm';
          }
          if (!confirmed) {
            ctx.postStepStatus?.(action.id, 'blocked');
            ctx.log('user cancelled high-risk command: ' + action.alias);
            continue;
          }
        }

        ctx.postStepStatus?.(action.id, 'running');
        await vscode.commands.executeCommand(entry.commands[0], ...(action.args ?? []));
        ctx.postStepStatus?.(action.id, 'done');
        break;
      }

      case 'show_information_message': {
        ctx.postStepStatus?.(action.id, 'running');
        await vscode.window.showInformationMessage(action.message);
        ctx.postStepStatus?.(action.id, 'done');
        break;
      }

      case 'noop': {
        ctx.log('noop: ' + (action.reason ?? ''));
        break;
      }

      case 'reveal_uri': {
        ctx.postStepStatus?.(action.id, 'running');
        const uri = vscode.Uri.parse(action.uri);
        await vscode.commands.executeCommand('vscode.open', uri);
        ctx.log('revealed uri: ' + action.uri);
        ctx.postStepStatus?.(action.id, 'done');
        break;
      }

      case 'set_editor_selection': {
        ctx.postStepStatus?.(action.id, 'running');
        const target = vscode.Uri.parse(action.uri);
        const doc = await vscode.workspace.openTextDocument(target);
        const editor = await vscode.window.showTextDocument(doc, { preserveFocus: true });
        const start = new vscode.Position(action.start.line, action.start.character);
        const end   = new vscode.Position(action.end.line,   action.end.character);
        editor.selection = new vscode.Selection(start, end);
        editor.revealRange(new vscode.Range(start, end), vscode.TextEditorRevealType.InCenterIfOutsideViewport);
        ctx.log(`set selection in ${action.uri} [${action.start.line}:${action.start.character}→${action.end.line}:${action.end.character}]`);
        ctx.postStepStatus?.(action.id, 'done');
        break;
      }

      case 'request_user_confirm': {
        ctx.postStepStatus?.(action.id, 'running');
        let confirmed: boolean;
        if (ctx.requestConfirm) {
          confirmed = await ctx.requestConfirm(action.id, action.title, action.details);
        } else {
          const answer = await vscode.window.showWarningMessage(
            action.title + (action.details ? '\n' + action.details : ''),
            { modal: true },
            'Confirm'
          );
          confirmed = answer === 'Confirm';
        }
        if (!confirmed) {
          ctx.postStepStatus?.(action.id, 'blocked');
          ctx.log('user cancelled confirm: ' + action.title);
          return; // Stop processing remaining actions in this envelope
        }
        ctx.postStepStatus?.(action.id, 'done');
        ctx.log('user confirmed: ' + action.title);
        break;
      }

      default: {
        ctx.log('unimplemented action: ' + (action as { type: string }).type);
        continue;
      }
    }
  }
}
