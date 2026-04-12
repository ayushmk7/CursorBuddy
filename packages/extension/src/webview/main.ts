declare function acquireVsCodeApi(): {
  postMessage(msg: unknown): void;
  getState(): unknown;
  setState(state: unknown): void;
};

type SessionState = 'inactive' | 'connecting' | 'live' | 'blocked';
type SupportMode = 'idle' | 'connecting' | 'live' | 'blocked' | 'listening' | 'speaking' | 'confirm' | 'degraded';
type StepStatus = 'pending' | 'running' | 'done' | 'blocked';

interface ShortcutHint {
  id: string;
  keys: string;
  label: string;
}

interface TranscriptEntry {
  role: 'user' | 'assistant';
  text: string;
}

interface LocalClientStep {
  id: string;
  title: string;
  detail?: string;
  status: StepStatus;
}

interface ConfirmationState {
  id: string;
  title: string;
  details?: string;
}

interface LocalClientUiState {
  docs: readonly string[];
  session: {
    state: SessionState;
  };
  support: {
    mode: SupportMode;
    title: string;
    detail: string;
  };
  shortcuts: ShortcutHint[];
  transcript: TranscriptEntry[];
  steps: LocalClientStep[];
  confirmation: ConfirmationState | null;
  audio: {
    listening: boolean;
    speaking: boolean;
    level: number;
    latencyMs?: number;
  };
}

const vscodeApi = acquireVsCodeApi();

let pendingConfirmId: string | undefined;
let uiState: LocalClientUiState | null = null;

// ── Boot ────────────────────────────────────────────────────────────────────

window.addEventListener('load', () => {
  const persisted = vscodeApi.getState() as LocalClientUiState | null;
  if (persisted) {
    applyState(persisted);
  }
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
    case 'snapshot':
    case 'patch':
      applyState(msg.payload as LocalClientUiState);
      break;
  }
});

function applyState(nextState: LocalClientUiState): void {
  uiState = nextState;
  pendingConfirmId = nextState.confirmation?.id;
  vscodeApi.setState(nextState);

  renderSessionState(nextState);
  renderSupportStatus(nextState);
  renderShortcutHints(nextState);
  renderTranscript(nextState);
  renderSteps(nextState);
  renderConfirm(nextState);
  renderAudioState(nextState);
}

// ── PTT button ────────────────────────────────────────────────────────────────

function bindPtt(): void {
  const ptt = document.getElementById('ptt');
  if (!ptt) return;

  ptt.addEventListener('mousedown', () => {
    ptt.setAttribute('aria-pressed', 'true');
    vscodeApi.postMessage({ type: 'push_to_talk', down: true });
  });

  ptt.addEventListener('mouseup', () => {
    ptt.setAttribute('aria-pressed', 'false');
    vscodeApi.postMessage({ type: 'push_to_talk', down: false });
  });

  ptt.addEventListener('mouseleave', () => {
    if (ptt.getAttribute('aria-pressed') === 'true') {
      ptt.setAttribute('aria-pressed', 'false');
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

function renderSessionState(state: LocalClientUiState): void {
  const pill = document.getElementById('status-pill');
  const ptt = document.getElementById('ptt') as HTMLButtonElement | null;

  if (pill) {
    pill.textContent = capitalize(state.session.state);
    pill.setAttribute('data-state', state.session.state);
  }

  if (ptt) {
    const busy = state.session.state === 'connecting';
    ptt.disabled = busy;
    ptt.setAttribute('aria-pressed', state.audio.listening ? 'true' : 'false');
    ptt.textContent = busy ? 'Connecting...' : state.audio.listening ? 'Listening...' : 'Push to talk';
  }
}

function renderSupportStatus(state: LocalClientUiState): void {
  const modeLabel = document.getElementById('support-mode-label');
  const title = document.getElementById('support-title');
  const description = document.getElementById('support-description');

  if (modeLabel) {
    modeLabel.textContent = labelForSupportMode(state.support.mode);
  }
  if (title) {
    title.textContent = state.support.title;
  }
  if (description) {
    description.textContent = state.support.detail;
  }
}

function renderShortcutHints(state: LocalClientUiState): void {
  const list = document.getElementById('shortcut-hints');
  if (!list) return;

  list.innerHTML = '';

  for (const shortcut of state.shortcuts) {
    const item = document.createElement('li');
    item.className = 'shortcut-row';

    const keys = document.createElement('span');
    keys.className = 'shortcut-keys';
    keys.textContent = shortcut.keys;

    const label = document.createElement('span');
    label.className = 'shortcut-label';
    label.textContent = shortcut.label;

    item.appendChild(keys);
    item.appendChild(label);
    list.appendChild(item);
  }
}

function renderTranscript(state: LocalClientUiState): void {
  const transcript = document.getElementById('transcript');
  const empty = document.getElementById('transcript-empty');
  if (!transcript || !empty) return;

  transcript.innerHTML = '';
  empty.toggleAttribute('hidden', state.transcript.length > 0);

  for (const entry of state.transcript) {
    const article = document.createElement('article');
    article.className = `bubble bubble--${entry.role}`;

    const roleEl = document.createElement('p');
    roleEl.className = 'bubble__role';
    roleEl.textContent = entry.role === 'user' ? 'You' : 'Larry';

    const textEl = document.createElement('p');
    textEl.textContent = entry.text;

    article.appendChild(roleEl);
    article.appendChild(textEl);
    transcript.appendChild(article);
  }
}

function renderSteps(state: LocalClientUiState): void {
  const stepList = document.getElementById('step-list');
  const empty = document.getElementById('steps-empty');
  if (!stepList || !empty) return;

  stepList.innerHTML = '';
  empty.toggleAttribute('hidden', state.steps.length > 0);

  for (const step of state.steps) {
    const row = document.createElement('li');
    row.className = 'step-row';
    row.dataset.stepId = step.id;
    applyStepStatusClass(row, step.status);

    const dot = document.createElement('div');
    dot.className = 'step-dot';

    const content = document.createElement('div');

    const header = document.createElement('div');
    header.className = 'step-header';

    const title = document.createElement('p');
    title.className = 'step-title';
    title.textContent = step.title;

    const status = document.createElement('span');
    status.className = 'step-status';
    status.textContent = capitalize(step.status);

    header.appendChild(title);
    header.appendChild(status);
    content.appendChild(header);

    if (step.detail) {
      const detail = document.createElement('p');
      detail.className = 'step-detail';
      detail.textContent = step.detail;
      content.appendChild(detail);
    }

    row.appendChild(dot);
    row.appendChild(content);
    stepList.appendChild(row);
  }
}

function renderConfirm(state: LocalClientUiState): void {
  const card = document.getElementById('confirm-card');
  const desc = document.getElementById('safety-desc');
  if (!card || !desc) return;

  if (!state.confirmation) {
    card.hidden = true;
    return;
  }

  card.hidden = false;
  desc.textContent = state.confirmation.details
    ? `${state.confirmation.title} — ${state.confirmation.details}`
    : state.confirmation.title;
}

function renderAudioState(state: LocalClientUiState): void {
  const pill = document.getElementById('latency-pill');
  const meter = document.getElementById('wave-meter');
  const spans = document.querySelectorAll<HTMLElement>('.wave-meter span');

  if (pill) {
    if (typeof state.audio.latencyMs === 'number') {
      pill.textContent = `RTT ${state.audio.latencyMs}ms`;
      pill.hidden = false;
    } else {
      pill.hidden = true;
    }
  }

  if (meter) {
    meter.classList.toggle('is-active', state.audio.listening || state.audio.speaking || state.audio.level > 0);
  }

  spans.forEach((span, index) => {
    const staggered = Math.min(1, Math.max(0.12, state.audio.level + (index % 3) * 0.08 - 0.05));
    span.style.setProperty('--level', String(staggered));
  });
}

function applyStepStatusClass(element: HTMLElement, status: StepStatus): void {
  element.classList.remove('is-done', 'is-active', 'is-blocked');

  if (status === 'done') {
    element.classList.add('is-done');
  } else if (status === 'running') {
    element.classList.add('is-active');
  } else if (status === 'blocked') {
    element.classList.add('is-blocked');
  }
}

function capitalize(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function labelForSupportMode(mode: SupportMode): string {
  switch (mode) {
    case 'idle':
      return 'Minimal support UI';
    case 'live':
      return 'Live support';
    case 'blocked':
      return 'Blocked state';
    case 'connecting':
      return 'Connecting';
    case 'listening':
      return 'Listening';
    case 'speaking':
      return 'Speaking';
    case 'confirm':
      return 'Confirmation';
    case 'degraded':
      return 'Fallback mode';
  }
}
