declare function acquireVsCodeApi(): {
  postMessage(msg: unknown): void;
  getState(): unknown;
  setState(state: unknown): void;
};

const vscodeApi = acquireVsCodeApi();

window.addEventListener('load', () => {
  vscodeApi.postMessage({ type: 'ui_ready' });
  const statusEl = document.getElementById('status');
  if (statusEl) statusEl.textContent = 'Ready';
});

window.addEventListener('message', (event: MessageEvent) => {
  const msg = event.data as { type: string; payload?: unknown };
  if (msg.type === 'state') {
    const statusEl = document.getElementById('status');
    if (statusEl) statusEl.textContent = String((msg.payload as any)?.state ?? 'unknown');
  }
  if (msg.type === 'transcript_delta') {
    const transcriptEl = document.getElementById('transcript');
    if (transcriptEl) {
      const line = document.createElement('div');
      line.textContent = String((msg.payload as any)?.text ?? '');
      transcriptEl.appendChild(line);
    }
  }
});

document.getElementById('ptt')?.addEventListener('mousedown', () => {
  vscodeApi.postMessage({ type: 'push_to_talk', payload: { down: true } });
});
document.getElementById('ptt')?.addEventListener('mouseup', () => {
  vscodeApi.postMessage({ type: 'push_to_talk', payload: { down: false } });
});
