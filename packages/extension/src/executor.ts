import * as vscode from 'vscode';
import { AssistantEnvelopeV1Schema, loadCommandMap, resolveAlias } from '@waveclick/shared';

export async function executeEnvelope(
  rawPayload: unknown,
  ctx: { mapsDir: string; log(s: string): void },
): Promise<void> {
  // Step 1: Validate envelope
  const result = AssistantEnvelopeV1Schema.safeParse(rawPayload);
  if (!result.success) {
    ctx.log('invalid envelope: ' + JSON.stringify(result.error));
    return;
  }

  const envelope = result.data;

  // Step 2: Load command map
  const map = loadCommandMap(vscode.version, ctx.mapsDir);

  // Step 3: Execute each action
  for (const action of envelope.actions) {
    switch (action.type) {
      case 'execute_command': {
        let entry;
        try {
          entry = resolveAlias(map, action.alias);
        } catch {
          ctx.log('unknown alias: ' + action.alias);
          continue;
        }

        // Confirm high-risk commands
        if (entry.risk === 'high') {
          const confirmed = await vscode.window.showWarningMessage(
            `High-risk action: ${entry.description ?? entry.commands[0]}`,
            { modal: true },
            'Confirm',
          );
          if (confirmed !== 'Confirm') {
            ctx.log('user cancelled high-risk command: ' + action.alias);
            continue;
          }
        }

        await vscode.commands.executeCommand(entry.commands[0], ...(action.args ?? []));
        break;
      }

      case 'show_information_message': {
        await vscode.window.showInformationMessage(action.message);
        break;
      }

      case 'noop': {
        ctx.log('noop: ' + (action.reason ?? ''));
        break;
      }

      default: {
        ctx.log('unimplemented action: ' + (action as { type: string }).type);
        continue;
      }
    }
  }
}
