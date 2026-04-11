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
    }

    *, *::before, *::after { box-sizing: border-box; }

    html, body { min-height: 100%; }

    body {
      margin: 0;
      padding: var(--wg-space-4);
      font-family: var(--wg-font-ui);
      line-height: 1.5;
    }

    button, input, select, textarea { font: inherit; }
    button { cursor: pointer; }

    .sidebar-header,
    .session-strip,
    .status-cluster,
    .confirm-actions {
      display: flex;
    }

    .sidebar-header {
      align-items: center;
      justify-content: space-between;
      margin-bottom: var(--wg-space-4);
    }

    .brand-name {
      font-size: 1.1rem;
      font-weight: 700;
    }

    .status-cluster {
      gap: 8px;
      flex-wrap: wrap;
      justify-content: flex-end;
    }

    .status-pill,
    .latency-pill {
      font-family: var(--wg-font-mono);
      font-size: 0.76rem;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      display: inline-flex;
      align-items: center;
      min-height: 28px;
      padding: 0 10px;
      border: 1px solid var(--vscode-sideBarSectionHeader-border, var(--vscode-widget-border, rgba(128,128,128,0.35)));
      border-radius: var(--wg-radius-pill);
      background: color-mix(in srgb, var(--vscode-editor-background, #1e1e1e) 75%, transparent);
    }

    .status-pill { color: var(--vscode-button-background, #0078d4); }
    .status-pill[data-state="live"] { color: var(--vscode-statusBarItem-remoteBackground, #16825d); }
    .status-pill[data-state="blocked"] { color: var(--vscode-errorForeground, #f85149); }

    .section-title {
      margin: 0 0 var(--wg-space-2) 0;
      font-size: 0.88rem;
      font-weight: 700;
    }

    .session-strip {
      flex-direction: column;
      gap: var(--wg-space-4);
      margin-bottom: var(--wg-space-4);
      padding: var(--wg-space-3);
      border: 1px solid var(--vscode-sideBarSectionHeader-border, var(--vscode-widget-border, rgba(128,128,128,0.35)));
      border-radius: var(--wg-radius-lg);
      background: color-mix(in srgb, var(--vscode-editor-background, #1e1e1e) 92%, transparent);
    }

    .ptt-button {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      min-height: 56px;
      padding: 0 18px;
      border: 1px solid var(--vscode-sideBarSectionHeader-border, var(--vscode-widget-border, rgba(128,128,128,0.35)));
      border-radius: var(--wg-radius-pill);
      background: color-mix(in srgb, var(--vscode-button-background, #0078d4) 18%, var(--vscode-editor-background, #1e1e1e));
      color: var(--vscode-foreground, #cccccc);
      transition:
        transform var(--wg-motion-base) var(--wg-ease),
        background-color var(--wg-motion-base) var(--wg-ease);
      width: 100%;
    }

    .ptt-button:hover, .ptt-button:focus-visible { transform: translateY(-1px); }
    .ptt-button:focus-visible {
      outline: 2px solid var(--vscode-focusBorder, #0078d4);
      outline-offset: 2px;
    }

    .ptt-button[aria-pressed="true"] {
      background: color-mix(in srgb, var(--vscode-button-background, #0078d4) 38%, var(--vscode-editor-background, #1e1e1e));
    }

    .ptt-button__label { font-weight: 700; }
    .ptt-button__state {
      font-family: var(--wg-font-mono);
      font-size: 0.78rem;
      text-transform: uppercase;
      letter-spacing: 0.06em;
    }

    .meter-wrap { display: grid; gap: var(--wg-space-2); }

    .wave-meter {
      display: flex;
      align-items: end;
      gap: 3px;
      height: 40px;
    }

    .wave-meter span {
      display: block;
      width: 4px;
      border-radius: var(--wg-radius-pill);
      background: color-mix(in srgb, var(--vscode-button-background, #0078d4) 84%, transparent);
      animation: pulse 1.15s ease-in-out infinite;
      transform-origin: bottom center;
    }

    .wave-meter span:nth-child(odd) { animation-duration: 1.45s; }
    .wave-meter span:nth-child(3n) { animation-duration: 1.8s; }
    .wave-meter span:nth-child(1) { height: 14px; }
    .wave-meter span:nth-child(2) { height: 24px; }
    .wave-meter span:nth-child(3) { height: 18px; }
    .wave-meter span:nth-child(4) { height: 32px; }
    .wave-meter span:nth-child(5) { height: 22px; }
    .wave-meter span:nth-child(6) { height: 38px; }
    .wave-meter span:nth-child(7) { height: 28px; }
    .wave-meter span:nth-child(8) { height: 20px; }
    .wave-meter span:nth-child(9) { height: 30px; }
    .wave-meter span:nth-child(10) { height: 16px; }
    .wave-meter span:nth-child(11) { height: 26px; }
    .wave-meter span:nth-child(12) { height: 18px; }

    .transcript-section { margin-bottom: var(--wg-space-4); }

    .transcript-log {
      display: grid;
      gap: var(--wg-space-3);
      margin-top: var(--wg-space-2);
    }

    .bubble {
      display: grid;
      gap: 6px;
      padding: 10px 12px;
      border-radius: var(--wg-radius-md);
      background: color-mix(in srgb, var(--vscode-editor-background, #1e1e1e) 92%, transparent);
      border: 1px solid var(--vscode-sideBarSectionHeader-border, var(--vscode-widget-border, rgba(128,128,128,0.35)));
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
      color: var(--vscode-descriptionForeground, #9d9d9d);
    }

    .bubble p { margin: 0; }

    .steps-section { margin-bottom: var(--wg-space-4); }

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
      padding: 12px 0;
      border-bottom: 1px solid var(--vscode-sideBarSectionHeader-border, var(--vscode-widget-border, rgba(128,128,128,0.35)));
    }

    .step-row:last-child { border-bottom: none; }

    .step-dot {
      width: 12px;
      height: 12px;
      margin-top: 4px;
      border-radius: 50%;
      border: 1px solid var(--vscode-sideBarSectionHeader-border, var(--vscode-widget-border, rgba(128,128,128,0.35)));
      background: color-mix(in srgb, var(--vscode-editor-background, #1e1e1e) 80%, transparent);
    }

    .step-row.is-done .step-dot {
      background: var(--vscode-testing-iconPassed, #3fc780);
      border-color: transparent;
    }

    .step-row.is-active .step-dot {
      background: var(--vscode-button-background, #0078d4);
      border-color: transparent;
      box-shadow: 0 0 16px color-mix(in srgb, var(--vscode-button-background, #0078d4) 50%, transparent);
    }

    .step-row.is-blocked .step-dot {
      background: var(--vscode-errorForeground, #f85149);
      border-color: transparent;
    }

    .step-title { margin: 0; font-weight: 700; }
    .step-detail {
      margin: 4px 0 0;
      font-size: 0.86rem;
      color: var(--vscode-descriptionForeground, #9d9d9d);
    }

    .safety-footer {
      padding: var(--wg-space-3);
      border: 1px solid var(--vscode-sideBarSectionHeader-border, var(--vscode-widget-border, rgba(128,128,128,0.35)));
      border-radius: var(--wg-radius-lg);
      background: color-mix(in srgb, var(--vscode-editor-background, #1e1e1e) 92%, transparent);
    }

    .safety-description {
      margin: var(--wg-space-2) 0;
      color: var(--vscode-descriptionForeground, #9d9d9d);
      font-size: 0.9rem;
    }

    .confirm-actions {
      gap: var(--wg-space-2);
      margin-top: var(--wg-space-3);
    }

    .button {
      min-height: 36px;
      padding: 0 14px;
      border-radius: var(--wg-radius-pill);
      border: 1px solid var(--vscode-sideBarSectionHeader-border, var(--vscode-widget-border, rgba(128,128,128,0.35)));
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
      color: var(--vscode-foreground, #cccccc);
      background: color-mix(in srgb, var(--vscode-editor-background, #1e1e1e) 86%, transparent);
    }

    @keyframes pulse {
      0%, 100% { transform: scaleY(0.5); opacity: 0.42; }
      50% { transform: scaleY(1.15); opacity: 1; }
    }

    @media (prefers-reduced-motion: reduce) {
      *, *::before, *::after {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
      }
      .wave-meter span { animation: none; opacity: 0.76; }
    }
  </style>
</head>
<body>
  <header class="sidebar-header">
    <div class="header-brand">
      <span class="brand-name">CursorBuddy</span>
    </div>
    <div class="status-cluster">
      <span class="status-pill" id="status-pill" data-state="inactive">Inactive</span>
      <span class="latency-pill" id="latency-pill" hidden></span>
    </div>
  </header>

  <section class="session-strip" id="session-strip" hidden>
    <button type="button" class="ptt-button" id="ptt"
            aria-pressed="false" aria-label="Push to talk — hold to speak">
      <span class="ptt-button__label">Push to talk</span>
      <span class="ptt-button__state" id="ptt-label">Tap to start</span>
    </button>
    <div class="meter-wrap" aria-hidden="true">
      <div class="wave-meter" id="wave-meter">
        <span></span><span></span><span></span><span></span>
        <span></span><span></span><span></span><span></span>
        <span></span><span></span><span></span><span></span>
      </div>
    </div>
  </section>

  <section class="transcript-section" aria-labelledby="transcript-heading">
    <h3 id="transcript-heading" class="section-title">Transcript</h3>
    <div class="transcript-log" id="transcript" aria-live="polite" aria-atomic="false"></div>
  </section>

  <section class="steps-section" aria-labelledby="steps-heading">
    <h3 id="steps-heading" class="section-title">Steps</h3>
    <ol class="step-list" id="step-list"></ol>
  </section>

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
</html>`;
}
