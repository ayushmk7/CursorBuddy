# CursorBuddy — Making It Fully Functional

**Date:** 2026-04-10  
**Audience:** Claude Code implementing all remaining work  
**Goal:** Take CursorBuddy from its current "skeleton + prototype" state to a working, installable VS Code extension that can be F5-launched, tested end-to-end with a mock OpenClaw server, and packaged as a `.vsix`.

---

## Project Map (Read This First)

```
packages/
  extension/          ← VS Code extension host (TypeScript, esbuild)
    src/
      extension.ts          COMPLETE — activation, wiring
      sessionManager.ts     COMPLETE — state machine
      sidecarManager.ts     COMPLETE — child-process IPC
      executor.ts           PARTIAL  — missing 3 action types
      webviewProvider.ts    PARTIAL  — message handler is a stub
      webview/
        main.ts             PARTIAL  — skeleton only (no real UI)
    esbuild.config.js       COMPLETE — builds extension.js + webview.js

  sidecar/            ← Node.js child process (TypeScript, esbuild)
    src/
      index.ts              COMPLETE
      ipc.ts                COMPLETE — session.start / session.stop
      session.ts            COMPLETE — OpenClaw WS connect
      openclaw-client.ts    COMPLETE — WS send/receive
      types.ts              COMPLETE

  shared/             ← Zod schemas, command maps (TypeScript)
    src/
      envelope.ts           COMPLETE — all action types defined
      command-map.ts        COMPLETE
    maps/
      command-map.vscode-1.98.json
      command-map.vscode-1.99.json

  bridge/             ← Optional Go gateway — already feature-complete, skip for now

frontend/
  index.html          ← Beautiful UI prototype (HTML/CSS/JS) — NOT yet wired into webview
  assets/
    styles.css
    app.js
```

**The core problem:** The beautiful prototype UI in `frontend/index.html` exists as a standalone HTML file but is completely disconnected from the extension's webview. The webview currently serves a near-empty page (`<div id="status">Loading...</div>`). Everything needs to be stitched together.

---

## What Is Already Working (Do Not Break)

- The full IPC pipe: `extension ↔ sidecarManager ↔ sidecar process ↔ OpenClaw WebSocket`
- `SessionManager` state machine (`inactive → connecting → live → blocked`)
- Envelope validation with Zod (`AssistantEnvelopeV1Schema`)
- Command map loading and alias resolution
- `execute_command`, `show_information_message`, `noop` action types in executor
- The esbuild build producing `dist/extension.js` and `dist/webview.js`
- All existing unit tests (do not break them)

---

## Gap 1 — Webview UI (Highest Priority)

### Current State

`packages/extension/src/webviewProvider.ts` line 50 serves:
```html
<body>
  <div id="status">Loading...</div>
  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
```

`packages/extension/src/webview/main.ts` is a skeleton:
- Posts `ui_ready` on load ✓
- Handles `state` messages (updates `#status` text only) ✓
- Handles `transcript_delta` messages (appends `<div>` to `#transcript` — but `#transcript` doesn't exist in the HTML) ✗
- Listens for `#ptt` mousedown/mouseup (but `#ptt` doesn't exist in the HTML) ✗

### What Needs to Be Built

The full webview UI must be built inside `packages/extension/src/webview/`. The design already exists in `frontend/index.html`, `frontend/assets/styles.css`, and `frontend/assets/app.js`. The task is to port it into the extension's webview system.

#### Step 1 — Create `packages/extension/src/webview/ui.ts`

This file provides the HTML string for the webview. Do NOT use a separate HTML file — embed it directly so esbuild can bundle everything. Create a function `getWebviewHtml(nonce: string, scriptUri: string): string` that returns the complete HTML.

The HTML structure (mirror `frontend/index.html` sections, adapted for webview):

```html
<!DOCTYPE html>
<html lang="en" class="theme-dark">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy"
    content="default-src 'none';
             script-src 'nonce-${nonce}';
             style-src 'nonce-${nonce}';
             img-src ${cspSource} data:;
             font-src ${cspSource};">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CursorBuddy</title>
  <style nonce="${nonce}">
    /* ALL CSS inline here — VS Code webviews cannot load external stylesheets
       from file:// — copy and adapt frontend/assets/styles.css */
    /* Map prototype CSS vars to VS Code theme vars: see mapping table below */
  </style>
</head>
<body>
  <!-- HEADER: status pill + latency -->
  <header class="sidebar-header">
    <div class="header-brand">
      <span class="brand-name">CursorBuddy</span>
    </div>
    <div class="status-cluster">
      <span class="status-pill" id="status-pill" data-state="inactive">Inactive</span>
      <span class="latency-pill" id="latency-pill" hidden></span>
    </div>
  </header>

  <!-- SESSION STRIP: PTT button + waveform meter -->
  <section class="session-strip" id="session-strip">
    <button type="button" class="ptt-button" id="ptt"
            aria-pressed="false" aria-label="Push to talk — hold to speak">
      <span class="ptt-button__label">Push to talk</span>
      <span class="ptt-button__state" id="ptt-label">Tap to start</span>
    </button>
    <div class="meter-wrap" aria-hidden="true">
      <div class="wave-meter" id="wave-meter">
        <!-- 12 spans for animated bars — JS sets --level custom prop -->
        <span></span><span></span><span></span><span></span>
        <span></span><span></span><span></span><span></span>
        <span></span><span></span><span></span><span></span>
      </div>
    </div>
  </section>

  <!-- TRANSCRIPT -->
  <section class="transcript-section" aria-labelledby="transcript-heading">
    <h3 id="transcript-heading" class="section-title">Transcript</h3>
    <div class="transcript-log" id="transcript" aria-live="polite" aria-atomic="false">
      <!-- Bubbles injected by JS -->
    </div>
  </section>

  <!-- STEPS LIST (actions from current envelope) -->
  <section class="steps-section" aria-labelledby="steps-heading">
    <h3 id="steps-heading" class="section-title">Steps</h3>
    <ol class="step-list" id="step-list">
      <!-- Step rows injected by JS -->
    </ol>
  </section>

  <!-- SAFETY FOOTER (confirm/cancel for high-risk actions) -->
  <section class="safety-footer" id="safety-footer" hidden>
    <h3 class="section-title">Confirm action</h3>
    <p class="safety-description" id="safety-desc"></p>
    <div class="confirm-actions">
      <button type="button" class="button button--ghost" id="btn-cancel">Cancel</button>
      <button type="button" class="button button--primary" id="btn-confirm">Confirm</button>
    </div>
  </section>

  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>
```

#### Step 2 — CSS Mapping (VS Code Theme Variables)

The prototype uses custom CSS variables. In the webview, replace ALL custom vars with VS Code theme variables. Key mapping:

| Prototype var | VS Code var |
|---|---|
| `--bg-primary` | `var(--vscode-sideBar-background)` |
| `--bg-card` | `var(--vscode-editor-background)` |
| `--text-primary` | `var(--vscode-foreground)` |
| `--text-secondary` | `var(--vscode-descriptionForeground)` |
| `--text-muted` | `var(--vscode-disabledForeground)` |
| `--border` | `var(--vscode-sideBarSectionHeader-border)` |
| `--accent` | `var(--vscode-button-background)` |
| `--accent-hover` | `var(--vscode-button-hoverBackground)` |
| `--accent-fg` | `var(--vscode-button-foreground)` |
| `--danger` | `var(--vscode-errorForeground)` |
| `--status-live` | `var(--vscode-statusBarItem-remoteBackground)` |
| `--status-blocked` | `var(--vscode-statusBarItem-errorBackground)` |

Do NOT set `background-color` or `color` on `html`/`body` directly; inherit from VS Code.

#### Step 3 — Rewrite `packages/extension/src/webview/main.ts`

The new `main.ts` must handle all message types coming from the extension and send messages back. Full interface:

**Messages FROM extension TO webview (`postMessage`):**

```typescript
// State change
{ type: 'state', state: 'inactive' | 'connecting' | 'live' | 'blocked' }

// New transcript entry (user utterance or assistant reply)  
{ type: 'transcript_delta', role: 'user' | 'assistant', text: string }

// Steps from a new envelope — replaces current step list
{ type: 'envelope_steps', steps: Array<{ id: string, title: string, detail?: string }> }

// Mark a step as done/running/blocked
{ type: 'step_status', id: string, status: 'pending' | 'running' | 'done' | 'blocked' }

// Ask the webview to show confirm/cancel for a high-risk action
{ type: 'confirm_request', id: string, title: string, details?: string }

// Clear the confirm footer (after resolution)
{ type: 'confirm_clear' }

// Audio level for waveform animation (0.0–1.0, sent at ~30fps while listening)
{ type: 'audio_level', level: number }

// Latency update
{ type: 'latency_ms', ms: number }
```

**Messages FROM webview TO extension (`vscode.postMessage`):**

```typescript
// Webview is mounted and ready to receive messages
{ type: 'ui_ready' }

// PTT button state changed
{ type: 'push_to_talk', down: boolean }

// User confirmed a pending high-risk action (id matches confirm_request.id)
{ type: 'confirm_result', id: string, confirmed: boolean }
```

**`main.ts` implementation requirements:**

1. On `ui_ready` — sent on `window.load` (already done)
2. On `state` message:
   - Update `#status-pill` text and `data-state` attribute
   - Show/hide `#session-strip` (hidden when `inactive`)
   - If `inactive`, clear `#transcript`, `#step-list`, hide `#safety-footer`
   - If `connecting` — show spinner text on PTT button
3. On `transcript_delta` — append a `<article class="bubble bubble--{role}">` to `#transcript`, scroll to bottom
4. On `envelope_steps` — clear `#step-list`, inject `<li>` rows for each step (status `pending` initially)
5. On `step_status` — find `<li data-step-id="{id}">`, update `class` (`is-done`, `is-active`, `is-blocked`)
6. On `confirm_request` — show `#safety-footer`, set `#safety-desc`, store the pending `id`
7. On `confirm_clear` — hide `#safety-footer`
8. On `audio_level` — animate `#wave-meter` bars using CSS `--level` custom property per-bar (stagger with offset)
9. On `latency_ms` — update `#latency-pill` text (e.g., `"RTT 184ms"`), show it
10. PTT button `mousedown`/`mouseup` → post `push_to_talk`
11. `#btn-confirm` click → post `confirm_result` with stored id and `confirmed: true`
12. `#btn-cancel` click → post `confirm_result` with stored id and `confirmed: false`

#### Step 4 — Update `webviewProvider.ts`

The `onDidReceiveMessage` stub at line 22–24 needs full implementation:

```typescript
webviewView.webview.onDidReceiveMessage((message) => {
  switch (message.type) {
    case 'ui_ready':
      // Replay current state so webview initializes correctly after reopen
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
```

Add the following fields and methods to `CursorBuddyWebviewProvider`:

```typescript
private _currentState: SessionState = 'inactive';
private _onPushToTalk?: (down: boolean) => void;
private _onConfirmResult?: (id: string, confirmed: boolean) => void;

// Called by extension.ts to register callbacks
setCallbacks(opts: {
  onPushToTalk: (down: boolean) => void;
  onConfirmResult: (id: string, confirmed: boolean) => void;
}): void {
  this._onPushToTalk = opts.onPushToTalk;
  this._onConfirmResult = opts.onConfirmResult;
}

// Override postState to also track local copy
postState(state: { state: SessionState }): void {
  this._currentState = state.state;
  this._view?.webview.postMessage({ type: 'state', ...state });
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
```

Also update `_getHtmlForWebview` to call the new `getWebviewHtml(nonce, scriptUri)` function from `ui.ts` instead of the inline template.

#### Step 5 — Update `extension.ts`

Wire the new webview callbacks in `activate()`:

```typescript
webviewProvider.setCallbacks({
  onPushToTalk: (down) => {
    // For now: log it. Audio capture is Gap 2.
    log(`[ptt] ${down ? 'down' : 'up'}`);
    // Later: sidecarManager.request('audio.ptt', { down })
  },
  onConfirmResult: (id, confirmed) => {
    // Resolve the pending high-risk confirmation
    pendingConfirms.get(id)?.(confirmed);
    pendingConfirms.delete(id);
    webviewProvider.postConfirmClear();
  },
});
```

Add `pendingConfirms: Map<string, (confirmed: boolean) => void>` to the activation scope.

---

## Gap 2 — Complete the Executor (Missing Action Types)

### Current State

`packages/extension/src/executor.ts` handles:
- `execute_command` ✓
- `show_information_message` ✓
- `noop` ✓

Falls through to `default` for:
- `reveal_uri` ✗
- `set_editor_selection` ✗
- `request_user_confirm` ✗

### What Needs to Be Added

Add these cases to the `switch` in `executeEnvelope`:

```typescript
case 'reveal_uri': {
  const uri = vscode.Uri.parse(action.uri);
  await vscode.commands.executeCommand('vscode.open', uri);
  ctx.log('revealed uri: ' + action.uri);
  break;
}

case 'set_editor_selection': {
  const target = vscode.Uri.parse(action.uri);
  const doc = await vscode.workspace.openTextDocument(target);
  const editor = await vscode.window.showTextDocument(doc, { preserveFocus: true });
  const start = new vscode.Position(action.start.line, action.start.character);
  const end   = new vscode.Position(action.end.line,   action.end.character);
  editor.selection = new vscode.Selection(start, end);
  editor.revealRange(new vscode.Range(start, end), vscode.TextEditorRevealType.InCenterIfOutsideViewport);
  ctx.log(`set selection in ${action.uri} [${action.start.line}:${action.start.character}→${action.end.line}:${action.end.character}]`);
  break;
}

case 'request_user_confirm': {
  // Route through the webview confirm UI if available, otherwise fallback to modal
  if (ctx.requestConfirm) {
    const confirmed = await ctx.requestConfirm(action.id, action.title, action.details);
    if (!confirmed) {
      ctx.log('user cancelled confirm: ' + action.title);
      return; // Stop processing remaining actions in this envelope
    }
  } else {
    const answer = await vscode.window.showWarningMessage(
      action.title + (action.details ? '\n' + action.details : ''),
      { modal: true },
      'Confirm'
    );
    if (answer !== 'Confirm') {
      ctx.log('user cancelled confirm: ' + action.title);
      return;
    }
  }
  ctx.log('user confirmed: ' + action.title);
  break;
}
```

Update the `ctx` parameter type in `executeEnvelope` to include the optional confirm callback:

```typescript
ctx: {
  mapsDir: string;
  log(s: string): void;
  requestConfirm?: (id: string, title: string, details?: string) => Promise<boolean>;
}
```

In `extension.ts`, pass the callback using `pendingConfirms`:

```typescript
const pendingConfirms = new Map<string, (confirmed: boolean) => void>();

const sidecarManager = new SidecarManager(
  sidecarPath,
  process.env.WAVECLICK_MOCK_OPENCLAW === '1' ? { WAVECLICK_MOCK_OPENCLAW: '1' } : {},
  (raw) => executeEnvelope(raw, {
    mapsDir,
    log,
    requestConfirm: (id, title, details) => new Promise<boolean>((resolve) => {
      pendingConfirms.set(id, resolve);
      webviewProvider.postConfirmRequest(id, title, details);
    }),
  }).catch((err) => log('[executor error] ' + String(err))),
  ...
```

Also, after each envelope is fully executed, push transcript and step feedback to the webview. Add a `postEnvelopeToWebview` helper inside `activate()`:

```typescript
// Called immediately before executeEnvelope
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
    case 'execute_command':    return a.alias.replace(/_/g, ' ');
    case 'show_information_message': return 'Show message';
    case 'reveal_uri':         return 'Open file';
    case 'set_editor_selection': return 'Navigate to location';
    case 'request_user_confirm': return a.title;
    default: return a.type;
  }
}

function actionDetail(a: CursorBuddyAction): string | undefined {
  switch (a.type) {
    case 'execute_command': return a.args?.join(', ');
    case 'show_information_message': return a.message;
    case 'reveal_uri': return a.uri;
    case 'set_editor_selection': return `Line ${a.start.line + 1}`;
    case 'request_user_confirm': return a.details;
    default: return undefined;
  }
}
```

Import `AssistantEnvelopeV1`, `CursorBuddyAction` from `@cursorbuddy/shared` in `extension.ts`.

Step status updates should be sent from `executeEnvelope`. Pass a `postStepStatus` callback through `ctx`:

```typescript
ctx: {
  mapsDir: string;
  log(s: string): void;
  requestConfirm?: (id: string, title: string, details?: string) => Promise<boolean>;
  postStepStatus?: (id: string, status: 'pending' | 'running' | 'done' | 'blocked') => void;
}
```

In executor, before executing each action: `ctx.postStepStatus?.(action.id, 'running')`, on success: `ctx.postStepStatus?.(action.id, 'done')`, on cancel: `ctx.postStepStatus?.(action.id, 'blocked')`.

---

## Gap 3 — Workspace State Probe (vscode_probe_state)

### Context

OpenClaw will call back into the extension via the sidecar to ask for VS Code workspace state (which files are open, git status, active editor). The `openclaw-pack` package documents this tool in `packages/openclaw-pack/tools/vscode_probe_state.md`. Currently nothing in the sidecar or extension handles incoming probe requests from OpenClaw.

### How It Must Work

The flow is:
1. OpenClaw sends a message to the sidecar WebSocket: `{ type: "tool_call", name: "vscode_probe_state", call_id: "<uuid>", input: { include_git: true, include_active_editor: true, include_file_body: false } }`
2. Sidecar routes this to the extension via IPC: new event `provider.tool_call`
3. Extension's `WorkspaceAdapter` collects the state from VS Code APIs
4. Extension sends the result back via new IPC request: `tool_call.result`
5. Sidecar forwards the result to OpenClaw via WebSocket

### Implementation

#### `packages/sidecar/src/openclaw-client.ts` changes

Add `onToolCall` callback to `OpenClawClientOptions`:

```typescript
interface OpenClawClientOptions {
  url: string;
  onEnvelope: (raw: unknown) => void;
  onToolCall: (callId: string, name: string, input: unknown) => void;  // NEW
  onError: (code: string, message: string) => void;
  onClose: () => void;
}
```

In the `ws.on('message', ...)` handler, distinguish envelope from tool_call:

```typescript
ws.on('message', (data) => {
  try {
    const parsed = JSON.parse(data.toString());
    if (parsed?.type === 'tool_call') {
      this.opts.onToolCall(parsed.call_id, parsed.name, parsed.input);
    } else {
      this.opts.onEnvelope(parsed);
    }
  } catch {
    this.opts.onError('E_PROTOCOL', 'failed to parse upstream message');
  }
});
```

Add a method to send tool results back:

```typescript
sendToolResult(callId: string, result: unknown): void {
  this.ws?.send(JSON.stringify({ type: 'tool_result', call_id: callId, output: result }));
}
```

#### `packages/sidecar/src/session.ts` changes

In the `clientFactory` call, pass an `onToolCall` handler:

```typescript
const client = clientFactory({
  url,
  onEnvelope: (raw) => {
    emit({ v: 1, kind: 'event', id: randomUUID(), method: 'provider.envelope', payload: raw as Record<string, unknown> });
  },
  onToolCall: (callId, name, input) => {
    // Emit a tool_call event to the extension; extension must reply
    emit({ v: 1, kind: 'event', id: randomUUID(), method: 'provider.tool_call',
           payload: { call_id: callId, name, input: input as Record<string, unknown> } });
  },
  onError: ...
  onClose: ...
});
```

Add `tool_call.result` to the IPC handler in `ipc.ts`:

```typescript
case 'tool_call.result': {
  const result = await handler.toolResult(msg.payload);
  respond('response', result);
  break;
}
```

Add `toolResult` to the `SessionHandler` interface:
```typescript
toolResult(payload: Record<string, unknown>): Promise<Record<string, unknown>>;
```

Implement in `session.ts`:
```typescript
toolResult(payload): Promise<Record<string, unknown>> {
  const { session_handle, call_id, result } = payload as { session_handle: string; call_id: string; result: unknown };
  const client = activeSessions.get(session_handle);
  client?.sendToolResult(call_id, result);
  return Promise.resolve({ ok: true });
}
```

#### `packages/extension/src/workspaceAdapter.ts` — NEW FILE

Create this file:

```typescript
import * as vscode from 'vscode';

export interface WorkspaceState {
  vscode_version: string;
  workspace_folders: Array<{ name: string; uri: string }>;
  git?: {
    repositories: Array<{
      root: string;
      head_branch: string;
      head_sha: string;
      modified_files: string[];
      staged_files: string[];
    }>;
  };
  active_editor?: {
    uri: string;
    language_id: string;
    line_count: number;
    selection: { start: { line: number; character: number }; end: { line: number; character: number } };
    file_body?: string;
  };
}

export async function probeWorkspaceState(input: {
  include_git?: boolean;
  include_active_editor?: boolean;
  include_file_body?: boolean;
}): Promise<WorkspaceState> {
  const state: WorkspaceState = {
    vscode_version: vscode.version,
    workspace_folders: (vscode.workspace.workspaceFolders ?? []).map(f => ({
      name: f.name,
      uri: f.uri.toString(),
    })),
  };

  if (input.include_git) {
    try {
      // Use the built-in git extension API
      const gitExtension = vscode.extensions.getExtension('vscode.git')?.exports;
      const git = gitExtension?.getAPI(1);
      if (git) {
        state.git = {
          repositories: await Promise.all(
            git.repositories.map(async (repo: any) => ({
              root: repo.rootUri.fsPath,
              head_branch: repo.state.HEAD?.name ?? 'detached',
              head_sha: repo.state.HEAD?.commit ?? '',
              modified_files: repo.state.workingTreeChanges.map((c: any) => c.uri.fsPath),
              staged_files: repo.state.indexChanges.map((c: any) => c.uri.fsPath),
            }))
          ),
        };
      }
    } catch {
      // Git extension unavailable — omit
    }
  }

  if (input.include_active_editor) {
    const editor = vscode.window.activeTextEditor;
    if (editor) {
      const editorState: WorkspaceState['active_editor'] = {
        uri: editor.document.uri.toString(),
        language_id: editor.document.languageId,
        line_count: editor.document.lineCount,
        selection: {
          start: { line: editor.selection.start.line, character: editor.selection.start.character },
          end:   { line: editor.selection.end.line,   character: editor.selection.end.character },
        },
      };
      if (input.include_file_body) {
        // Only include if explicitly requested (privacy gate)
        editorState.file_body = editor.document.getText();
      }
      state.active_editor = editorState;
    }
  }

  return state;
}
```

#### Update `extension.ts` to handle `provider.tool_call` events

In `activate()`, modify how `SidecarManager` is constructed. The `onEnvelope` callback in `SidecarManager` currently only handles envelope events. Expand it to also handle tool call events by adding a second callback, or by inspecting the event method in the constructor.

The cleanest approach: change `SidecarManager` constructor to accept an `onEvent` callback instead of just `onEnvelope`:

```typescript
// In SidecarManager._spawn(), replace the onEnvelope call:
} else if (msg.kind === 'event') {
  this.onEvent(msg.method ?? '', msg.payload);  // changed from onEnvelope
}
```

In `extension.ts`:

```typescript
const sidecarManager = new SidecarManager(
  sidecarPath,
  ...,
  async (eventMethod, payload) => {
    if (eventMethod === 'provider.envelope') {
      // Existing envelope handling
      const parsed = AssistantEnvelopeV1Schema.safeParse(payload);
      if (parsed.success) postEnvelopeToWebview(parsed.data);
      executeEnvelope(payload, { mapsDir, log, requestConfirm, postStepStatus }).catch(...);
    } else if (eventMethod === 'provider.tool_call') {
      const { call_id, name, input, session_handle } = payload as any;
      if (name === 'vscode_probe_state') {
        try {
          const result = await probeWorkspaceState(input ?? {});
          await sidecarManager.request('tool_call.result', { session_handle, call_id, result });
        } catch (err) {
          log('[tool_call error] ' + String(err));
        }
      } else {
        log('[tool_call] unknown tool: ' + name);
      }
    }
  },
  ...
);
```

Note: `SidecarManager` signature changes from `onEnvelope: (raw: unknown) => void` to `onEvent: (method: string, payload: unknown) => void`. Update the existing test for `SidecarManager` accordingly.

---

## Gap 4 — Audio Capture in the Sidecar

### Context

The sidecar currently connects to OpenClaw but sends no audio. The PTT button in the webview fires `push_to_talk` messages but nothing in the extension or sidecar acts on them. This is the most complex remaining gap.

### Approach: Use the `node-microphone` or `naudiodon` package

The sidecar runs as a Node.js process with access to native modules. The recommended approach is to use the `naudiodon` package (PortAudio bindings for Node.js) or a simpler alternative `node-record-lpcm16`. Both allow capturing raw PCM audio from the default microphone.

#### New IPC methods to add to sidecar `ipc.ts`:

```
audio.start  — begin capturing from mic; payload: { session_handle, sample_rate? }
audio.stop   — stop capturing; payload: { session_handle }
```

#### New file: `packages/sidecar/src/audio.ts`

```typescript
import { createReadStream } from 'fs';
// Using node-record-lpcm16 for simplicity (no native build required on macOS)
// Install: npm install node-record-lpcm16 @types/node-record-lpcm16

let recording: any = null;

export interface AudioOptions {
  sampleRate?: number;
  onChunk: (pcmBuffer: Buffer) => void;
  onError: (err: Error) => void;
  onSilence: () => void;
}

export function startRecording(opts: AudioOptions): void {
  if (recording) return;

  const recorder = require('node-record-lpcm16');
  recording = recorder.record({
    sampleRate: opts.sampleRate ?? 16000,
    channels: 1,
    audioType: 'raw',
    encoding: 'signed-integer',
    bits: 16,
    endian: 'little',
  });

  recording.stream()
    .on('data', (chunk: Buffer) => opts.onChunk(chunk))
    .on('error', (err: Error) => opts.onError(err));
}

export function stopRecording(): void {
  recording?.stop();
  recording = null;
}
```

#### Update `session.ts` to wire audio:

When `audio.start` IPC request is received:
1. Call `startRecording({ onChunk: (buf) => client.sendAudio(buf) })`
2. `sendAudio` base64-encodes the PCM buffer and sends: `{ type: "audio_chunk", data: "<base64>", encoding: "pcm16", sample_rate: 16000 }`

When `audio.stop` IPC request is received:
1. Call `stopRecording()`
2. Send: `{ type: "audio_end" }` to OpenClaw

#### Update `extension.ts` PTT callback:

```typescript
onPushToTalk: async (down) => {
  if (down) {
    webviewProvider.postState({ state: 'live' }); // Show listening state immediately
    await sidecarManager.request('audio.start', { session_handle: currentSessionHandle });
  } else {
    await sidecarManager.request('audio.stop', { session_handle: currentSessionHandle });
  }
},
```

Store `currentSessionHandle` from the `session.start` response:

```typescript
const { sessionHandle } = await sidecarManager.request('session.start', { ... }) as { sessionHandle: string };
currentSessionHandle = sessionHandle;
```

#### `packages/sidecar/package.json` — add dependency:

```json
"dependencies": {
  "ws": "^8.0.0",
  "node-record-lpcm16": "^1.0.1"
}
```

Note: `node-record-lpcm16` requires `sox` to be installed on the host machine (`brew install sox` on macOS). Document this in the README. For Windows, it requires `SoX` for Windows or `ALSA`. This is acceptable for an MVP — add a check at startup:

```typescript
// In sidecar/src/index.ts, add at top:
import { execSync } from 'child_process';
try {
  execSync('sox --version', { stdio: 'ignore' });
} catch {
  process.stderr.write('[audio] sox not found — microphone input unavailable. Install with: brew install sox\n');
}
```

---

## Gap 5 — SecretStorage for Auth Token

### Current State

`packages/extension/package.json` has `cursorbuddy.openclaw.auth` as a plain VS Code configuration setting. Auth tokens in plain settings are visible to the user's settings.json and other extensions.

### Fix

In `sessionManager.ts`, replace the `cfg.get('openclaw.auth')` call with SecretStorage:

```typescript
async start(): Promise<void> {
  ...
  // Try SecretStorage first, fall back to config for dev convenience
  let authRef = await this.context.secrets.get('cursorbuddy.openclaw.auth') ?? '';
  if (!authRef) {
    authRef = cfg.get<string>('openclaw.auth', '');
  }
  ...
}
```

Add a new command `cursorbuddy.setAuth` in `extension.ts`:

```typescript
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
```

Add the command to `package.json` contributes:
```json
{ "command": "cursorbuddy.setAuth", "title": "CursorBuddy: Set Auth Token" }
```

---

## Gap 6 — Mock OpenClaw Server for E2E Testing

### Context

The mock mode (`WAVECLICK_MOCK_OPENCLAW=1`) points the sidecar to `ws://localhost:9090` but no mock server exists in the repo. You cannot run F5 and test end-to-end without one.

### Create `packages/mock-openclaw/` as a new package

This is a lightweight WebSocket server that plays back canned `AssistantEnvelopeV1` responses when it receives certain trigger messages.

#### `packages/mock-openclaw/src/index.ts`

```typescript
import { WebSocketServer, WebSocket } from 'ws';

const PORT = 9090;
const wss = new WebSocketServer({ port: PORT });

console.log(`[mock-openclaw] listening on ws://localhost:${PORT}`);

wss.on('connection', (ws: WebSocket) => {
  console.log('[mock-openclaw] client connected');

  ws.on('message', (data: Buffer) => {
    let msg: any;
    try { msg = JSON.parse(data.toString()); } catch { return; }
    console.log('[mock-openclaw] received:', JSON.stringify(msg));

    if (msg.type === 'session_start') {
      // Send a greeting envelope
      setTimeout(() => sendEnvelope(ws, greetingEnvelope(msg.sessionHandle)), 300);
    } else if (msg.type === 'audio_end') {
      // Respond to a voice command with a canned envelope
      setTimeout(() => sendEnvelope(ws, cannedEnvelope(msg.sessionHandle ?? 'unknown')), 500);
    } else if (msg.type === 'tool_call') {
      // Not expected in mock mode — ignore
    }
  });

  ws.on('close', () => console.log('[mock-openclaw] client disconnected'));
});

function sendEnvelope(ws: WebSocket, envelope: object): void {
  ws.send(JSON.stringify(envelope));
}

function greetingEnvelope(sessionId: string): object {
  return {
    schema_version: '1.0',
    session_id: sessionId,
    utterance_id: crypto.randomUUID(),
    assistant_text: "Hi! I'm CursorBuddy. Hold the Push-to-Talk button and say a command.",
    confidence: 1.0,
    actions: [
      { type: 'show_information_message', id: 'greet-1', risk: 'low',
        message: "CursorBuddy session started. Hold PTT to speak." }
    ],
  };
}

function cannedEnvelope(sessionId: string): object {
  return {
    schema_version: '1.0',
    session_id: sessionId,
    utterance_id: crypto.randomUUID(),
    assistant_text: "Opening Source Control so you can commit your changes.",
    confidence: 0.92,
    actions: [
      { type: 'execute_command', id: 'open-scm-1', risk: 'low', alias: 'open_scm' }
    ],
  };
}
```

#### `packages/mock-openclaw/package.json`

```json
{
  "name": "@cursorbuddy/mock-openclaw",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "start": "npx ts-node src/index.ts",
    "build": "esbuild src/index.ts --bundle --platform=node --outfile=dist/index.js"
  },
  "dependencies": { "ws": "^8.0.0" },
  "devDependencies": { "typescript": "^5.4.0", "esbuild": "^0.21.0", "@types/ws": "^8.0.0" }
}
```

Add to root `package.json` workspace:
```json
"workspaces": ["packages/*"]
```

Update `.vscode/tasks.json` to add a "Start Mock OpenClaw" task that runs `cd packages/mock-openclaw && npm run start`. Update `.vscode/launch.json` compound configuration to start mock-openclaw before the extension.

---

## Gap 7 — Build System Verification and VSIX Packaging

### What Needs to Happen for a Working F5 Launch

1. Before F5, the extension must be built: `packages/extension npm run build` → produces `dist/extension.js` + `dist/webview.js`
2. Before F5, the sidecar must be built: `packages/sidecar npm run build` → produces `dist/index.js`
3. `launch.json` must set `WAVECLICK_MOCK_OPENCLAW=1` in the environment

Check `.vscode/launch.json` and ensure:
```json
{
  "type": "extensionHost",
  "env": { "WAVECLICK_MOCK_OPENCLAW": "1" },
  "preLaunchTask": "Build All"
}
```

Check `.vscode/tasks.json` for a `"Build All"` compound task that runs both `npm run build` in `packages/extension` and `packages/sidecar`. If missing, create it.

### VSIX Packaging

Install `@vscode/vsce` as a dev dependency in the extension package:
```json
"devDependencies": {
  "@vscode/vsce": "^3.0.0"
}
```

Add to `packages/extension/package.json` scripts:
```json
"package": "vsce package --out ../../dist/cursorbuddy.vsix"
```

Create `packages/extension/.vscodeignore`:
```
**/__tests__/**
**/*.test.ts
**/*.test.js
**/*.map
src/
tsconfig.json
esbuild.config.js
vitest.config.ts
```

Ensure `packages/extension/package.json` has a `files` or `main` pointing to `dist/extension.js`, and that `resources/icon.svg` exists (create a placeholder if not).

---

## Gap 8 — Transcript: User Side

Currently there is no path for user utterance text to flow into the transcript. When the user speaks, the OpenClaw response envelope contains `assistant_text`. But the "You said:" bubble has no data source.

### Fix

Two approaches. Use whichever fits your OpenClaw integration:

**Option A (preferred):** When the sidecar receives an `audio_end` acknowledgment from OpenClaw that includes the ASR transcript, emit a new IPC event `provider.transcript` with `{ role: 'user', text: '<asr result>' }`. The extension handles this event and calls `webviewProvider.postMessage({ type: 'transcript_delta', role: 'user', text })`.

**Option B (immediate):** When PTT is released in `extension.ts`, post an interim "..." bubble:
```typescript
webviewProvider.postTranscript({ role: 'user', text: '...' });
```
Then when the envelope arrives with `assistant_text`, the "..." is replaced (or just left as-is, since the transcript doesn't need to be perfect for MVP).

For MVP, implement Option B. Add `postTranscript` to `CursorBuddyWebviewProvider`:

```typescript
postTranscript(msg: { role: 'user' | 'assistant'; text: string }): void {
  this._view?.webview.postMessage({ type: 'transcript_delta', role: msg.role, text: msg.text });
}
```

In `extension.ts`, also call `postTranscript` right after an envelope is received:
```typescript
webviewProvider.postTranscript({ role: 'assistant', text: envelope.assistant_text });
```

---

## Testing Checklist

After all gaps are implemented, verify the following manually with F5:

1. **Extension activates** — CursorBuddy panel appears in activity bar
2. **Start Session** — status pill shows "Connecting" then "Live"
3. **Greeting envelope** — mock-openclaw sends greeting; sidebar shows assistant bubble and info message notification
4. **PTT hold** — waveform meter animates (even if just CSS animation for MVP)
5. **PTT release** — after 500ms, mock-openclaw sends canned envelope; Source Control view opens; transcript shows "Opening Source Control..." bubble; step row goes green
6. **Stop Session** — status pill goes "Inactive", transcript clears
7. **Confirm flow** — if you manually send a high-risk envelope (add a test command), the safety footer appears with Cancel/Confirm
8. **Theme inheritance** — UI looks correct in both dark and light VS Code themes

Run unit tests: `npm test` in each of `packages/extension`, `packages/sidecar`, `packages/shared`. All should pass.

---

## Implementation Order

Execute in this sequence to minimize blocking dependencies:

1. **Gap 6** — Mock OpenClaw server first. You need it running to test everything else.
2. **Gap 1, Step 1–4** — Build the webview HTML, CSS (with VS Code vars), and `ui.ts`.
3. **Gap 1, Step 3** — Rewrite `webview/main.ts` with full message handling.
4. **Gap 1, Step 4–5** — Wire `webviewProvider.ts` and update `extension.ts`.
5. **Gap 2** — Fill in missing executor action types (`reveal_uri`, `set_editor_selection`, `request_user_confirm`).
6. **Gap 8** — Wire transcript bubbles.
7. **Gap 3** — Workspace probe (can be stubbed initially: return empty git state if git extension unavailable).
8. **Gap 5** — SecretStorage (low risk, do before any auth testing).
9. **Gap 7** — Verify build and VSIX packaging.
10. **Gap 4** — Audio capture last (most risk of platform issues; everything else should work without real audio).

---

## Files To Create (New)

| File | Purpose |
|---|---|
| `packages/extension/src/webview/ui.ts` | HTML/CSS template for webview |
| `packages/extension/src/workspaceAdapter.ts` | VS Code workspace state probe |
| `packages/mock-openclaw/src/index.ts` | Mock WebSocket server for testing |
| `packages/mock-openclaw/package.json` | Package config for mock server |
| `packages/sidecar/src/audio.ts` | Microphone capture using node-record-lpcm16 |
| `packages/extension/resources/icon.svg` | Extension icon (required for VSIX) |
| `packages/extension/.vscodeignore` | Exclude dev files from VSIX |

## Files To Modify (Existing)

| File | What Changes |
|---|---|
| `packages/extension/src/webviewProvider.ts` | Implement `onDidReceiveMessage`, add new `post*` methods, use `ui.ts` for HTML |
| `packages/extension/src/webview/main.ts` | Full UI event handling rewrite |
| `packages/extension/src/executor.ts` | Add `reveal_uri`, `set_editor_selection`, `request_user_confirm` cases; add `requestConfirm` and `postStepStatus` to ctx |
| `packages/extension/src/extension.ts` | Add `pendingConfirms`, pass `requestConfirm` to executor, handle `provider.tool_call` events, add `cursorbuddy.setAuth` command |
| `packages/extension/src/sessionManager.ts` | Use SecretStorage for auth token |
| `packages/extension/package.json` | Add `cursorbuddy.setAuth` command, add `@vscode/vsce` devDep, add `package` script |
| `packages/sidecar/src/ipc.ts` | Add `audio.start`, `audio.stop`, `tool_call.result` methods |
| `packages/sidecar/src/session.ts` | Wire `onToolCall`, `sendAudio`, `audio.start/stop` |
| `packages/sidecar/src/openclaw-client.ts` | Add `onToolCall` callback, `sendAudio`, `sendToolResult` |
| `packages/sidecar/src/types.ts` | Add `AudioStartPayload`, `AudioStopPayload` types |
| `packages/sidecar/package.json` | Add `node-record-lpcm16` dependency |
| `.vscode/tasks.json` | Add "Start Mock OpenClaw" task and compound "Build All + Mock" |
| `.vscode/launch.json` | Set `WAVECLICK_MOCK_OPENCLAW=1`, add preLaunchTask |

---

## Key Invariants — Do Not Break

- All `@cursorbuddy/shared` Zod schemas are strict — never loosen them
- The `execute_command` high-risk gate in the executor must always prompt before execution
- Content Security Policy in the webview HTML must stay intact (`nonce-${nonce}` only — no `unsafe-inline`)
- Sidecar must stay a separate child process — never inline into the extension host
- IPC messages must always be valid JSON NDJSON lines with `v: 1` versioning
- All existing unit tests must continue to pass
