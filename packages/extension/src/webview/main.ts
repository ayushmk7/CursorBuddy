declare function acquireVsCodeApi(): {
  postMessage(msg: unknown): void;
  getState(): unknown;
  setState(state: unknown): void;
};

const vscodeApi = acquireVsCodeApi();

// Pending confirm dialog id
let pendingConfirmId: string | undefined;

// ── Boot ────────────────────────────────────────────────────────────────────

window.addEventListener('load', () => {
  vscodeApi.postMessage({ type: 'ui_ready' });
  bindPtt();
  bindConfirmButtons();
});

// ── Message handler ──────────────────────────────────────────────────────────

window.addEventListener('message', (event: MessageEvent) => {
  const msg = event.data as {
    type: string;
    [key: string]: unknown;
  };

  switch (msg.type) {
    case 'state':
      handleState(msg.state as string);
      break;
    case 'transcript_delta':
      handleTranscriptDelta(msg.role as string, msg.text as string);
      break;
    case 'envelope_steps':
      handleEnvelopeSteps(msg.steps as Array<{ id: string; title: string; detail?: string }>);
      break;
    case 'step_status':
      handleStepStatus(msg.id as string, msg.status as string);
      break;
    case 'confirm_request':
      handleConfirmRequest(msg.id as string, msg.title as string, msg.details as string | undefined);
      break;
    case 'confirm_clear':
      handleConfirmClear();
      break;
    case 'audio_level':
      handleAudioLevel(msg.level as number);
      break;
    case 'latency_ms':
      handleLatencyMs(msg.ms as number);
      break;
  }
});

// ── State ────────────────────────────────────────────────────────────────────

function handleState(state: string): void {
  const pill = document.getElementById('status-pill');
  const sessionStrip = document.getElementById('session-strip');
  const pttLabel = document.getElementById('ptt-label');

  if (pill) {
    pill.textContent = capitalize(state);
    pill.setAttribute('data-state', state);
  }

  if (sessionStrip) {
    if (state === 'inactive') {
      sessionStrip.hidden = true;
    } else {
      sessionStrip.hidden = false;
    }
  }

  if (state === 'inactive') {
    const transcript = document.getElementById('transcript');
    if (transcript) transcript.innerHTML = '';

    const stepList = document.getElementById('step-list');
    if (stepList) stepList.innerHTML = '';

    const safetyFooter = document.getElementById('safety-footer');
    if (safetyFooter) safetyFooter.hidden = true;

    pendingConfirmId = undefined;
  }

  if (state === 'connecting' && pttLabel) {
    pttLabel.textContent = 'Connecting...';
  }
}

// ── Transcript ───────────────────────────────────────────────────────────────

function handleTranscriptDelta(role: string, text: string): void {
  const transcript = document.getElementById('transcript');
  if (!transcript) return;

  const article = document.createElement('article');
  article.className = `bubble bubble--${role}`;

  const roleEl = document.createElement('p');
  roleEl.className = 'bubble__role';
  roleEl.textContent = role;

  const textEl = document.createElement('p');
  textEl.textContent = text;

  article.appendChild(roleEl);
  article.appendChild(textEl);
  transcript.appendChild(article);

  // Scroll to bottom
  transcript.scrollTop = transcript.scrollHeight;
}

// ── Steps ────────────────────────────────────────────────────────────────────

function handleEnvelopeSteps(steps: Array<{ id: string; title: string; detail?: string }>): void {
  const stepList = document.getElementById('step-list');
  if (!stepList) return;

  stepList.innerHTML = '';

  for (const step of steps) {
    const li = document.createElement('li');
    li.className = 'step-row';
    li.setAttribute('data-step-id', step.id);

    const dot = document.createElement('div');
    dot.className = 'step-dot';

    const content = document.createElement('div');

    const title = document.createElement('p');
    title.className = 'step-title';
    title.textContent = step.title;
    content.appendChild(title);

    if (step.detail) {
      const detail = document.createElement('p');
      detail.className = 'step-detail';
      detail.textContent = step.detail;
      content.appendChild(detail);
    }

    li.appendChild(dot);
    li.appendChild(content);
    stepList.appendChild(li);
  }
}

function handleStepStatus(id: string, status: string): void {
  const row = document.querySelector<HTMLElement>(`[data-step-id="${id}"]`);
  if (!row) return;

  row.classList.remove('is-done', 'is-active', 'is-blocked');

  if (status === 'done') {
    row.classList.add('is-done');
  } else if (status === 'running') {
    row.classList.add('is-active');
  } else if (status === 'blocked') {
    row.classList.add('is-blocked');
  }
  // 'pending' → no extra class (default appearance)
}

// ── Confirm ──────────────────────────────────────────────────────────────────

function handleConfirmRequest(id: string, title: string, details?: string): void {
  pendingConfirmId = id;

  const safetyFooter = document.getElementById('safety-footer');
  const safetyDesc = document.getElementById('safety-desc');

  if (safetyDesc) {
    safetyDesc.textContent = details ? `${title} — ${details}` : title;
  }

  if (safetyFooter) {
    safetyFooter.hidden = false;
  }
}

function handleConfirmClear(): void {
  const safetyFooter = document.getElementById('safety-footer');
  if (safetyFooter) safetyFooter.hidden = true;
  pendingConfirmId = undefined;
}

// ── Audio level ───────────────────────────────────────────────────────────────

function handleAudioLevel(level: number): void {
  const spans = document.querySelectorAll<HTMLElement>('.wave-meter span');
  spans.forEach((span, i) => {
    // Stagger: each bar gets a slightly different offset based on index
    const staggeredLevel = Math.min(1, Math.max(0, level + (i % 3) * 0.05 - 0.05));
    span.style.setProperty('--level', String(staggeredLevel));
  });
}

// ── Latency ──────────────────────────────────────────────────────────────────

function handleLatencyMs(ms: number): void {
  const pill = document.getElementById('latency-pill');
  if (!pill) return;
  pill.textContent = `RTT ${ms}ms`;
  pill.removeAttribute('hidden');
}

// ── PTT button ────────────────────────────────────────────────────────────────

function bindPtt(): void {
  const ptt = document.getElementById('ptt');
  if (!ptt) return;

  ptt.addEventListener('mousedown', () => {
    ptt.setAttribute('aria-pressed', 'true');
    const pttLabel = document.getElementById('ptt-label');
    if (pttLabel) pttLabel.textContent = 'Listening...';
    vscodeApi.postMessage({ type: 'push_to_talk', down: true });
  });

  ptt.addEventListener('mouseup', () => {
    ptt.setAttribute('aria-pressed', 'false');
    const pttLabel = document.getElementById('ptt-label');
    if (pttLabel) pttLabel.textContent = 'Tap to start';
    vscodeApi.postMessage({ type: 'push_to_talk', down: false });
  });

  // Also handle mouseleave so the button doesn't stay "pressed" if cursor leaves
  ptt.addEventListener('mouseleave', () => {
    if (ptt.getAttribute('aria-pressed') === 'true') {
      ptt.setAttribute('aria-pressed', 'false');
      const pttLabel = document.getElementById('ptt-label');
      if (pttLabel) pttLabel.textContent = 'Tap to start';
      vscodeApi.postMessage({ type: 'push_to_talk', down: false });
    }
  });
}

// ── Confirm buttons ───────────────────────────────────────────────────────────

function bindConfirmButtons(): void {
  document.getElementById('btn-confirm')?.addEventListener('click', () => {
    if (pendingConfirmId !== undefined) {
      vscodeApi.postMessage({ type: 'confirm_result', id: pendingConfirmId, confirmed: true });
      pendingConfirmId = undefined;
    }
  });

  document.getElementById('btn-cancel')?.addEventListener('click', () => {
    if (pendingConfirmId !== undefined) {
      vscodeApi.postMessage({ type: 'confirm_result', id: pendingConfirmId, confirmed: false });
      pendingConfirmId = undefined;
    }
  });
}

// ── Utils ─────────────────────────────────────────────────────────────────────

function capitalize(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}
