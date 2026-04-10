import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as vscode from 'vscode';
import { executeEnvelope } from '../executor';
import * as path from 'path';

const MAPS_DIR = path.resolve(__dirname, '../../../..', 'packages/shared/maps');

// Helper to build a minimal valid envelope payload
function makeEnvelope(actions: unknown[]): unknown {
  return {
    schema_version: '1.0',
    session_id: '00000000-0000-0000-0000-000000000001',
    utterance_id: '00000000-0000-0000-0000-000000000002',
    assistant_text: 'test',
    confidence: 0.9,
    actions,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

// Test 1: Valid open_scm envelope -> executeCommand('workbench.view.scm') called
describe('execute_command action', () => {
  it('open_scm alias calls workbench.view.scm', async () => {
    const payload = makeEnvelope([
      { id: 'a1', type: 'execute_command', alias: 'open_scm', risk: 'low' },
    ]);
    const log = vi.fn();
    await executeEnvelope(payload, { mapsDir: MAPS_DIR, log });
    expect(vscode.commands.executeCommand).toHaveBeenCalledWith('workbench.view.scm');
  });

  // Test 2: Unknown alias -> no command called, no crash
  it('unknown alias does not crash and does not call executeCommand', async () => {
    const payload = makeEnvelope([
      { id: 'a1', type: 'execute_command', alias: 'nonexistent_alias', risk: 'low' },
    ]);
    const log = vi.fn();
    await expect(executeEnvelope(payload, { mapsDir: MAPS_DIR, log })).resolves.toBeUndefined();
    expect(vscode.commands.executeCommand).not.toHaveBeenCalled();
  });

  // Test 7: High-risk command + user confirms -> command executes
  it('high-risk command executes when user confirms', async () => {
    vi.mocked(vscode.window.showWarningMessage).mockResolvedValue('Confirm' as any);
    const payload = makeEnvelope([
      { id: 'a1', type: 'execute_command', alias: 'git_commit', risk: 'high' },
    ]);
    const log = vi.fn();
    await executeEnvelope(payload, { mapsDir: MAPS_DIR, log });
    expect(vscode.commands.executeCommand).toHaveBeenCalledWith('git.commit');
  });

  // Test 8: High-risk command + user cancels -> command does NOT execute
  it('high-risk command does not execute when user cancels', async () => {
    vi.mocked(vscode.window.showWarningMessage).mockResolvedValue(undefined as any);
    const payload = makeEnvelope([
      { id: 'a1', type: 'execute_command', alias: 'git_commit', risk: 'high' },
    ]);
    const log = vi.fn();
    await executeEnvelope(payload, { mapsDir: MAPS_DIR, log });
    expect(vscode.commands.executeCommand).not.toHaveBeenCalled();
  });
});

// Test 3: show_information_message action -> showInformationMessage called
describe('show_information_message action', () => {
  it('calls showInformationMessage with message', async () => {
    const payload = makeEnvelope([
      { id: 'a1', type: 'show_information_message', message: 'Hello world', risk: 'low' },
    ]);
    const log = vi.fn();
    await executeEnvelope(payload, { mapsDir: MAPS_DIR, log });
    expect(vscode.window.showInformationMessage).toHaveBeenCalledWith('Hello world');
  });
});

// Test 4: noop action -> log called with reason, no command called
describe('noop action', () => {
  it('logs noop reason and does not call executeCommand', async () => {
    const payload = makeEnvelope([
      { id: 'a1', type: 'noop', reason: 'nothing to do', risk: 'low' },
    ]);
    const log = vi.fn();
    await executeEnvelope(payload, { mapsDir: MAPS_DIR, log });
    expect(log).toHaveBeenCalledWith(expect.stringContaining('noop'));
    expect(vscode.commands.executeCommand).not.toHaveBeenCalled();
  });
});

// Test 5: Invalid envelope (extra property -> Zod strict fails)
describe('invalid envelope', () => {
  it('logs error and does not call executeCommand on extra property', async () => {
    const payload = {
      schema_version: '1.0',
      session_id: '00000000-0000-0000-0000-000000000001',
      utterance_id: '00000000-0000-0000-0000-000000000002',
      assistant_text: 'test',
      confidence: 0.9,
      actions: [{ id: 'a1', type: 'execute_command', alias: 'open_scm', risk: 'low' }],
      extra_field: 'unexpected',
    };
    const log = vi.fn();
    await executeEnvelope(payload, { mapsDir: MAPS_DIR, log });
    expect(log).toHaveBeenCalledWith(expect.stringContaining('invalid envelope'));
    expect(vscode.commands.executeCommand).not.toHaveBeenCalled();
  });

  it('logs error and does not call executeCommand on missing required field', async () => {
    const payload = { schema_version: '1.0' };
    const log = vi.fn();
    await executeEnvelope(payload, { mapsDir: MAPS_DIR, log });
    expect(log).toHaveBeenCalledWith(expect.stringContaining('invalid envelope'));
    expect(vscode.commands.executeCommand).not.toHaveBeenCalled();
  });
});

// Test 6: Empty actions array -> Zod rejects (schema requires actions.length > 0)
describe('empty actions array', () => {
  it('fails Zod validation and logs error', async () => {
    const payload = makeEnvelope([]);
    const log = vi.fn();
    await executeEnvelope(payload, { mapsDir: MAPS_DIR, log });
    expect(log).toHaveBeenCalledWith(expect.stringContaining('invalid envelope'));
    expect(vscode.commands.executeCommand).not.toHaveBeenCalled();
  });
});
