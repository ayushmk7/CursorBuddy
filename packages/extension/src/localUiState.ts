import type { AssistantEnvelopeV1, CursorBuddyAction } from '@cursorbuddy/shared';
import type { SessionState } from './sessionManager';

export const LOCAL_CLIENT_SOURCE_OF_TRUTH = [
  'docs/07_LOCAL_CURSOR_AND_COMPANION.md',
  'backend/agents/docs/COMPANION_OVERLAY_UX_SPEC.md',
  'backend/agents/docs/BACKEND_VS_LOCAL_RUNTIME.md',
  'docs/02_TECHNICAL_PRD.md',
  'docs/design/autoapply-design-tokens.md',
  'frontend/agents/docs/STACK.md',
  'frontend/agents/docs/IMPLEMENTATION_STEPS.md',
  'frontend/agents/docs/AGENT_SYSTEM_INSTRUCTIONS.md',
] as const;

export type SupportMode =
  | 'idle'
  | 'connecting'
  | 'live'
  | 'blocked'
  | 'listening'
  | 'speaking'
  | 'confirm'
  | 'degraded';

export type StepStatus = 'pending' | 'running' | 'done' | 'blocked';

export interface ShortcutHint {
  id: 'follow' | 'voice' | 'mini-chat';
  keys: string;
  label: string;
}

export interface SupportCopy {
  mode: SupportMode;
  title: string;
  detail: string;
}

export interface TranscriptEntry {
  role: 'user' | 'assistant';
  text: string;
}

export interface LocalClientStep {
  id: string;
  title: string;
  detail?: string;
  status: StepStatus;
}

export interface ConfirmationState {
  id: string;
  title: string;
  details?: string;
}

export interface AudioState {
  listening: boolean;
  speaking: boolean;
  level: number;
  latencyMs?: number;
}

export interface LocalClientUiState {
  docs: readonly string[];
  session: {
    state: SessionState;
  };
  support: SupportCopy;
  shortcuts: ShortcutHint[];
  transcript: TranscriptEntry[];
  steps: LocalClientStep[];
  confirmation: ConfirmationState | null;
  audio: AudioState;
}

export interface LocalClientSnapshotMessage {
  type: 'snapshot';
  payload: LocalClientUiState;
}

export interface LocalClientPatchMessage {
  type: 'patch';
  payload: LocalClientUiState;
}

export type LocalClientWebviewMessage =
  | LocalClientSnapshotMessage
  | LocalClientPatchMessage
  | {
      type: 'push_to_talk';
      down: boolean;
    }
  | {
      type: 'confirm_result';
      id: string;
      confirmed: boolean;
    };

const DEFAULT_SHORTCUTS: ShortcutHint[] = [
  { id: 'follow', keys: 'Control+Option+L', label: 'Wake Larry and keep follow mode active' },
  { id: 'voice', keys: 'Control+Option+V', label: 'Start a voice request' },
  { id: 'mini-chat', keys: 'Control+Option+C', label: 'Open the secondary mini chat' },
];

export function createInitialLocalClientUiState(): LocalClientUiState {
  return {
    docs: LOCAL_CLIENT_SOURCE_OF_TRUTH,
    session: {
      state: 'inactive',
    },
    support: supportCopyFor('inactive'),
    shortcuts: DEFAULT_SHORTCUTS,
    transcript: [],
    steps: [],
    confirmation: null,
    audio: {
      listening: false,
      speaking: false,
      level: 0,
    },
  };
}

export function setSessionState(
  state: LocalClientUiState,
  sessionState: SessionState,
): LocalClientUiState {
  const next: LocalClientUiState = {
    ...state,
    session: { state: sessionState },
  };

  if (sessionState === 'inactive') {
    return {
      ...next,
      support: supportCopyFor(sessionState),
      transcript: [],
      steps: [],
      confirmation: null,
      audio: {
        ...next.audio,
        listening: false,
        speaking: false,
        level: 0,
      },
    };
  }

  if (next.confirmation) {
    return {
      ...next,
      support: supportCopyFor('confirm', next.confirmation.details),
    };
  }

  if (next.audio.listening) {
    return {
      ...next,
      support: supportCopyFor('listening'),
    };
  }

  if (next.audio.speaking) {
    return {
      ...next,
      support: supportCopyFor('speaking'),
    };
  }

  return {
    ...next,
    support: supportCopyFor(sessionState),
  };
}

export function setListening(state: LocalClientUiState, listening: boolean): LocalClientUiState {
  const next: LocalClientUiState = {
    ...state,
    audio: {
      ...state.audio,
      listening,
    },
  };

  if (state.confirmation) {
    return next;
  }

  return {
    ...next,
    support: listening ? supportCopyFor('listening') : supportCopyFor(next.session.state),
  };
}

export function setSpeaking(state: LocalClientUiState, speaking: boolean): LocalClientUiState {
  const next: LocalClientUiState = {
    ...state,
    audio: {
      ...state.audio,
      speaking,
    },
  };

  if (state.confirmation) {
    return next;
  }

  if (next.audio.listening) {
    return next;
  }

  return {
    ...next,
    support: speaking ? supportCopyFor('speaking') : supportCopyFor(next.session.state),
  };
}

export function setAudioLevel(state: LocalClientUiState, level: number): LocalClientUiState {
  return {
    ...state,
    audio: {
      ...state.audio,
      level: Math.max(0, Math.min(1, level)),
    },
  };
}

export function setLatency(state: LocalClientUiState, latencyMs?: number): LocalClientUiState {
  return {
    ...state,
    audio: {
      ...state.audio,
      latencyMs,
    },
  };
}

export function setConfirmation(
  state: LocalClientUiState,
  confirmation: ConfirmationState,
): LocalClientUiState {
  return {
    ...state,
    confirmation,
    support: supportCopyFor('confirm', confirmation.details),
  };
}

export function clearConfirmation(state: LocalClientUiState): LocalClientUiState {
  return {
    ...state,
    confirmation: null,
    support: state.audio.listening
      ? supportCopyFor('listening')
      : state.audio.speaking
        ? supportCopyFor('speaking')
        : supportCopyFor(state.session.state),
  };
}

export function appendTranscriptEntry(
  state: LocalClientUiState,
  entry: TranscriptEntry,
): LocalClientUiState {
  return {
    ...state,
    transcript: [...state.transcript, entry],
  };
}

export function replaceSteps(
  state: LocalClientUiState,
  steps: Array<Pick<LocalClientStep, 'id' | 'title' | 'detail'>>,
): LocalClientUiState {
  return {
    ...state,
    steps: steps.map((step) => ({
      ...step,
      status: 'pending',
    })),
  };
}

export function updateStepStatus(
  state: LocalClientUiState,
  id: string,
  status: StepStatus,
): LocalClientUiState {
  return {
    ...state,
    steps: state.steps.map((step) => (step.id === id ? { ...step, status } : step)),
  };
}

export function setDegradedSupport(
  state: LocalClientUiState,
  detail: string,
): LocalClientUiState {
  return {
    ...state,
    support: supportCopyFor('degraded', detail),
  };
}

export function buildStepsFromEnvelope(envelope: AssistantEnvelopeV1): LocalClientStep[] {
  return envelope.actions
    .filter((action) => action.type !== 'noop')
    .map((action) => ({
      id: action.id,
      title: actionTitle(action),
      detail: actionDetail(action),
      status: 'pending' as StepStatus,
    }));
}

function actionTitle(action: CursorBuddyAction): string {
  switch (action.type) {
    case 'execute_command':
      return action.alias.replace(/_/g, ' ');
    case 'show_information_message':
      return 'Show message';
    case 'reveal_uri':
      return 'Open file';
    case 'set_editor_selection':
      return 'Navigate to location';
    case 'request_user_confirm':
      return action.title;
    default:
      return action.type;
  }
}

function actionDetail(action: CursorBuddyAction): string | undefined {
  switch (action.type) {
    case 'execute_command':
      return action.args?.map((value) => String(value)).join(', ');
    case 'show_information_message':
      return action.message;
    case 'reveal_uri':
      return action.uri;
    case 'set_editor_selection':
      return `Line ${action.start.line + 1}`;
    case 'request_user_confirm':
      return action.details;
    default:
      return undefined;
  }
}

function supportCopyFor(mode: SupportMode | SessionState, detailOverride?: string): SupportCopy {
  switch (mode) {
    case 'inactive':
    case 'idle':
      return {
        mode: 'idle',
        title: 'Minimal support UI',
        detail: 'Larry is the primary surface. This view only handles setup, fallback transcript, and confirmations.',
      };
    case 'connecting':
      return {
        mode: 'connecting',
        title: 'Connecting Larry',
        detail: detailOverride ?? 'Starting the local runtime and waiting for a live session.',
      };
    case 'live':
      return {
        mode: 'live',
        title: 'Support view is ready',
        detail: detailOverride ?? 'Live guidance stays lightweight here while Larry remains the primary product surface.',
      };
    case 'blocked':
      return {
        mode: 'blocked',
        title: 'Larry is blocked',
        detail:
          detailOverride ??
          'Check auth, mic permissions, or local runtime health. The support UI stays minimal and explains what needs attention.',
      };
    case 'listening':
      return {
        mode: 'listening',
        title: 'Listening for your request',
        detail: detailOverride ?? 'Voice is the primary path. Transcript fallback will appear here only as needed.',
      };
    case 'speaking':
      return {
        mode: 'speaking',
        title: 'Larry is speaking',
        detail: detailOverride ?? 'Guidance should stay short, local, and paired with visible text.',
      };
    case 'confirm':
      return {
        mode: 'confirm',
        title: 'Confirm before continuing',
        detail: detailOverride ?? 'Higher-risk actions stay behind an explicit confirmation gate.',
      };
    case 'degraded':
      return {
        mode: 'degraded',
        title: 'Running in fallback mode',
        detail: detailOverride ?? 'Some live Larry capabilities are unavailable, so this support surface is providing a lighter fallback.',
      };
  }
}
