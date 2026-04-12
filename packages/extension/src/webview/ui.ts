export function getWebviewHtml(nonce: string, scriptUri: string, cspSource: string): string {
  return `<!DOCTYPE html>
<html lang="en">
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
    :root {
      --wg-space-1: 4px;
      --wg-space-2: 8px;
      --wg-space-3: 12px;
      --wg-space-4: 16px;
      --wg-space-5: 20px;
      --wg-space-6: 24px;
      --wg-radius-sm: 6px;
      --wg-radius-md: 10px;
      --wg-radius-lg: 14px;
      --wg-radius-pill: 999px;
      --wg-motion-fast: 120ms;
      --wg-motion-base: 200ms;
      --wg-motion-slow: 320ms;
      --wg-ease: cubic-bezier(0.16, 1, 0.3, 1);
      --wg-font-ui: var(--vscode-font-family, "Segoe UI", system-ui, sans-serif);
      --wg-font-mono: var(--vscode-editor-font-family, "SF Mono", "JetBrains Mono", ui-monospace, monospace);
      --wg-color-surface: color-mix(in srgb, var(--vscode-editor-background, #1e1e1e) 92%, transparent);
      --wg-color-surface-elevated: color-mix(in srgb, var(--vscode-editorWidget-background, #252526) 70%, transparent);
      --wg-color-border: var(--vscode-widget-border, rgba(128,128,128,0.35));
      --wg-color-fg: var(--vscode-foreground, #cccccc);
      --wg-color-muted: var(--vscode-descriptionForeground, #9d9d9d);
      --wg-color-accent: var(--vscode-textLink-foreground, #4da3ff);
      --wg-color-success: var(--vscode-testing-iconPassed, #3fc780);
      --wg-color-warning: var(--vscode-inputValidation-warningForeground, #cca700);
      --wg-color-danger: var(--vscode-errorForeground, #f85149);
    }

    *, *::before, *::after { box-sizing: border-box; }
    html, body { min-height: 100%; }

    body {
      margin: 0;
      padding: var(--wg-space-4);
      font-family: var(--wg-font-ui);
      color: var(--wg-color-fg);
      line-height: 1.5;
      background: var(--vscode-sideBar-background, #181818);
    }

    button, input, select, textarea { font: inherit; }
    button { cursor: pointer; }

    .support-shell {
      display: grid;
      gap: var(--wg-space-4);
    }

    .support-card {
      border: 1px solid var(--wg-color-border);
      border-radius: var(--wg-radius-lg);
      background: var(--wg-color-surface);
      padding: var(--wg-space-3);
    }

    .support-card[hidden] {
      display: none;
    }

    .support-header {
      display: grid;
      gap: var(--wg-space-3);
    }

    .eyebrow,
    .mono-note,
    .status-pill,
    .latency-pill,
    .shortcut-keys,
    .step-status {
      font-family: var(--wg-font-mono);
      font-size: 0.76rem;
      letter-spacing: 0.06em;
      text-transform: uppercase;
    }

    .eyebrow,
    .mono-note {
      margin: 0;
      color: var(--wg-color-muted);
    }

    .brand-row,
    .status-row,
    .section-row,
    .confirm-actions {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--wg-space-2);
    }

    .title-wrap {
      display: grid;
      gap: 2px;
    }

    .brand-name {
      margin: 0;
      font-size: 1rem;
      font-weight: 600;
    }

    .status-cluster {
      display: flex;
      gap: var(--wg-space-2);
      flex-wrap: wrap;
      justify-content: flex-end;
    }

    .status-pill,
    .latency-pill,
    .shortcut-keys {
      display: inline-flex;
      align-items: center;
      min-height: 28px;
      padding: 0 10px;
      border: 1px solid var(--wg-color-border);
      border-radius: var(--wg-radius-pill);
      background: var(--wg-color-surface-elevated);
    }

    .status-pill {
      color: var(--wg-color-accent);
    }

    .status-pill[data-state="live"] { color: var(--wg-color-success); }
    .status-pill[data-state="blocked"] { color: var(--wg-color-danger); }
    .status-pill[data-state="connecting"] { color: var(--wg-color-warning); }

    .support-copy {
      display: grid;
      gap: 4px;
    }

    .support-title {
      margin: 0;
      font-size: 0.95rem;
      font-weight: 600;
    }

    .support-description {
      margin: 0;
      color: var(--wg-color-muted);
      font-size: 0.9rem;
    }

    .shortcut-list {
      display: grid;
      gap: var(--wg-space-2);
      margin: 0;
      padding: 0;
      list-style: none;
    }

    .shortcut-row {
      display: grid;
      grid-template-columns: auto 1fr;
      gap: var(--wg-space-2);
      align-items: center;
    }

    .shortcut-label {
      color: var(--wg-color-muted);
      font-size: 0.86rem;
    }

    .audio-row {
      display: grid;
      gap: var(--wg-space-2);
    }

    .wave-meter {
      display: flex;
      align-items: end;
      gap: 2px;
      height: 22px;
    }

    .wave-meter span {
      display: block;
      width: 3px;
      height: 10px;
      border-radius: var(--wg-radius-pill);
      background: color-mix(in srgb, var(--wg-color-accent) 82%, transparent);
      opacity: 0.35;
      transform-origin: bottom center;
      transition: transform var(--wg-motion-fast) var(--wg-ease), opacity var(--wg-motion-fast) var(--wg-ease);
      transform: scaleY(calc(0.4 + var(--level, 0.2)));
    }

    .wave-meter.is-active span {
      opacity: 0.9;
    }

    .transcript-log {
      display: grid;
      gap: var(--wg-space-2);
      margin-top: var(--wg-space-2);
    }

    .bubble {
      display: grid;
      gap: 4px;
      padding: 10px 12px;
      border-radius: var(--wg-radius-md);
      background: var(--wg-color-surface-elevated);
      border: 1px solid var(--wg-color-border);
    }

    .bubble--user {
      background: color-mix(in srgb, var(--vscode-editor-selectionBackground, rgba(0,120,215,0.28)) 80%, transparent);
    }

    .bubble__role {
      margin: 0;
      font-family: var(--wg-font-mono);
      font-size: 0.74rem;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--wg-color-muted);
    }

    .bubble p { margin: 0; }

    .step-list {
      display: grid;
      gap: 0;
      margin: var(--wg-space-2) 0 0;
      padding: 0;
      list-style: none;
    }

    .step-row {
      display: grid;
      grid-template-columns: 16px minmax(0, 1fr);
      gap: var(--wg-space-3);
      align-items: start;
      padding: 10px 0;
      border-bottom: 1px solid var(--wg-color-border);
    }

    .step-row:last-child { border-bottom: none; }

    .step-dot {
      width: 12px;
      height: 12px;
      margin-top: 4px;
      border-radius: 50%;
      border: 1px solid var(--wg-color-border);
      background: color-mix(in srgb, var(--vscode-editor-background, #1e1e1e) 80%, transparent);
    }

    .step-row.is-done .step-dot {
      background: var(--wg-color-success);
      border-color: transparent;
    }

    .step-row.is-active .step-dot {
      background: var(--wg-color-accent);
      border-color: transparent;
    }

    .step-row.is-blocked .step-dot {
      background: var(--wg-color-danger);
      border-color: transparent;
    }

    .step-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--wg-space-2);
    }

    .step-title { margin: 0; font-weight: 600; font-size: 0.88rem; }
    .step-detail {
      margin: 4px 0 0;
      font-size: 0.86rem;
      color: var(--wg-color-muted);
    }

    .step-status {
      color: var(--wg-color-muted);
    }

    .confirm-card {
      border-color: color-mix(in srgb, var(--wg-color-warning) 60%, var(--wg-color-border));
    }

    .confirm-description,
    .empty-state {
      margin: var(--wg-space-2) 0 0;
      color: var(--wg-color-muted);
      font-size: 0.9rem;
    }

    .confirm-actions {
      gap: var(--wg-space-2);
      margin-top: var(--wg-space-3);
      justify-content: flex-start;
    }

    .button {
      min-height: 36px;
      padding: 0 14px;
      border-radius: var(--wg-radius-pill);
      border: 1px solid var(--wg-color-border);
      transition:
        transform var(--wg-motion-base) var(--wg-ease),
        background-color var(--wg-motion-base) var(--wg-ease);
    }

    .button:hover, .button:focus-visible { transform: translateY(-1px); }
    .button:focus-visible {
      outline: 2px solid var(--vscode-focusBorder, #0078d4);
      outline-offset: 2px;
    }

    .button--primary {
      color: var(--vscode-button-foreground, #ffffff);
      background: var(--vscode-button-background, #0078d4);
      border-color: transparent;
    }

    .button--ghost {
      color: var(--wg-color-fg);
      background: color-mix(in srgb, var(--vscode-editor-background, #1e1e1e) 86%, transparent);
    }

    @media (prefers-reduced-motion: reduce) {
      *, *::before, *::after {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
      }
      .wave-meter span {
        transform: scaleY(1);
      }
    }
  </style>
</head>
<body>
  <main class="support-shell" aria-label="Larry Support">
    <section class="support-card support-header">
      <div class="brand-row">
        <div class="title-wrap">
          <p class="eyebrow">CursorBuddy</p>
          <h1 class="brand-name">Larry Support</h1>
        </div>
        <div class="status-cluster">
          <span class="status-pill" id="status-pill" data-state="inactive">Inactive</span>
          <span class="latency-pill" id="latency-pill" hidden></span>
        </div>
      </div>

      <div class="support-copy">
        <p class="mono-note" id="support-mode-label">Minimal support UI</p>
        <p class="support-title" id="support-title">Minimal support UI</p>
        <p class="support-description" id="support-description">
          Larry is the primary surface. This view only handles setup, fallback transcript, and confirmations.
        </p>
      </div>

      <div class="audio-row">
        <div class="section-row">
          <span class="mono-note">Voice signal</span>
          <button type="button" class="button button--ghost" id="ptt" aria-pressed="false" aria-label="Push to talk">
            Push to talk
          </button>
        </div>
        <div class="wave-meter" id="wave-meter" aria-hidden="true">
          <span></span><span></span><span></span><span></span>
          <span></span><span></span><span></span><span></span>
        </div>
      </div>
    </section>

    <section class="support-card" aria-labelledby="shortcut-heading">
      <div class="section-row">
        <h2 id="shortcut-heading" class="brand-name">Current defaults</h2>
        <span class="mono-note">Support hints</span>
      </div>
      <ul class="shortcut-list" id="shortcut-hints"></ul>
    </section>

    <section class="support-card" id="transcript-section" aria-labelledby="transcript-heading">
      <div class="section-row">
        <h2 id="transcript-heading" class="brand-name">Transcript fallback</h2>
        <span class="mono-note">aria-live</span>
      </div>
      <p class="empty-state" id="transcript-empty">Live guidance should stay lightweight. Transcript appears here only when needed.</p>
      <div class="transcript-log" id="transcript" aria-live="polite" aria-atomic="false"></div>
    </section>

    <section class="support-card" id="steps-section" aria-labelledby="steps-heading">
      <div class="section-row">
        <h2 id="steps-heading" class="brand-name">Guidance steps</h2>
        <span class="mono-note">Safe navigation</span>
      </div>
      <p class="empty-state" id="steps-empty">Only lightweight, local guidance steps should appear here.</p>
      <ol class="step-list" id="step-list"></ol>
    </section>

    <section class="support-card confirm-card" id="confirm-card" aria-labelledby="confirm-heading" hidden>
      <div class="section-row">
        <h2 id="confirm-heading" class="brand-name">Confirm action</h2>
        <span class="mono-note">Explicit gate</span>
      </div>
      <p class="confirm-description" id="safety-desc"></p>
      <div class="confirm-actions">
        <button type="button" class="button button--ghost" id="btn-cancel">Cancel</button>
        <button type="button" class="button button--primary" id="btn-confirm">Confirm</button>
      </div>
    </section>
  </main>

  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
}
