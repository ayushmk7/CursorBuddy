import * as assert from 'assert';
import {
  LOCAL_CLIENT_SOURCE_OF_TRUTH,
  appendTranscriptEntry,
  clearConfirmation,
  createInitialLocalClientUiState,
  replaceSteps,
  setConfirmation,
  setListening,
  setSessionState,
  updateStepStatus,
} from '../../localUiState';
import { getWebviewHtml } from '../../webview/ui';

describe('local client UI state', () => {
  it('keeps the documented source-of-truth order', () => {
    assert.deepStrictEqual(LOCAL_CLIENT_SOURCE_OF_TRUTH, [
      'docs/07_LOCAL_CURSOR_AND_COMPANION.md',
      'backend/agents/docs/COMPANION_OVERLAY_UX_SPEC.md',
      'backend/agents/docs/BACKEND_VS_LOCAL_RUNTIME.md',
      'docs/02_TECHNICAL_PRD.md',
      'docs/design/autoapply-design-tokens.md',
      'frontend/agents/docs/STACK.md',
      'frontend/agents/docs/IMPLEMENTATION_STEPS.md',
      'frontend/agents/docs/AGENT_SYSTEM_INSTRUCTIONS.md',
    ]);
  });

  it('starts as an inactive minimal support surface with shortcut hints', () => {
    const state = createInitialLocalClientUiState();

    assert.strictEqual(state.session.state, 'inactive');
    assert.strictEqual(state.support.mode, 'idle');
    assert.strictEqual(state.shortcuts.length, 3);
    assert.strictEqual(state.transcript.length, 0);
    assert.strictEqual(state.steps.length, 0);
    assert.strictEqual(state.confirmation, null);
  });

  it('maps blocked runtime state to blocked support copy', () => {
    const state = setSessionState(createInitialLocalClientUiState(), 'blocked');

    assert.strictEqual(state.support.mode, 'blocked');
    assert.match(state.support.title, /blocked/i);
    assert.match(state.support.detail, /auth|runtime|mic/i);
  });

  it('promotes listening to the primary support mode while live', () => {
    const initial = setSessionState(createInitialLocalClientUiState(), 'live');
    const state = setListening(initial, true);

    assert.strictEqual(state.audio.listening, true);
    assert.strictEqual(state.support.mode, 'listening');
    assert.match(state.support.title, /listening/i);
  });

  it('replaces steps and updates their statuses predictably', () => {
    const withSteps = replaceSteps(createInitialLocalClientUiState(), [
      { id: 'a1', title: 'Open Source Control', detail: 'Safe navigation only' },
      { id: 'a2', title: 'Wait for confirmation', detail: 'High-risk action stays gated' },
    ]);

    const updated = updateStepStatus(withSteps, 'a2', 'blocked');

    assert.strictEqual(updated.steps.length, 2);
    assert.strictEqual(updated.steps[0].status, 'pending');
    assert.strictEqual(updated.steps[1].status, 'blocked');
  });

  it('elevates confirmation into a dedicated support mode and clears it cleanly', () => {
    const base = setSessionState(createInitialLocalClientUiState(), 'live');
    const withConfirm = setConfirmation(base, {
      id: 'confirm-1',
      title: 'Confirm action',
      details: 'Git commit requires explicit approval.',
    });

    assert.strictEqual(withConfirm.support.mode, 'confirm');
    assert.ok(withConfirm.confirmation);
    assert.match(withConfirm.support.detail, /explicit approval/i);

    const cleared = clearConfirmation(withConfirm);
    assert.strictEqual(cleared.confirmation, null);
    assert.strictEqual(cleared.support.mode, 'live');
  });

  it('stores transcript fallback entries without turning the UI into chat-first chrome', () => {
    const state = appendTranscriptEntry(createInitialLocalClientUiState(), {
      role: 'assistant',
      text: 'Source Control is open. Type your commit message here.',
    });

    assert.strictEqual(state.transcript.length, 1);
    assert.strictEqual(state.transcript[0].role, 'assistant');
    assert.match(state.transcript[0].text, /Source Control/i);
  });
});

describe('local client webview HTML', () => {
  it('renders a minimal support shell with explicit support framing', () => {
    const html = getWebviewHtml('nonce-123', 'webview.js', 'vscode-resource:');

    assert.match(html, /Larry Support/);
    assert.match(html, /Minimal support UI/);
    assert.match(html, /id="shortcut-hints"/);
    assert.match(html, /id="support-title"/);
    assert.match(html, /id="transcript-section"/);
    assert.match(html, /id="steps-section"/);
    assert.match(html, /id="confirm-card"/);
  });
});
