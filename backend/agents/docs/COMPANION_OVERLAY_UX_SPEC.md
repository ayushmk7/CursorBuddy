# Larry overlay UX specification

**Status:** Normative for implementation and product QA. Extends [`docs/07_LOCAL_CURSOR_AND_COMPANION.md`](../../docs/07_LOCAL_CURSOR_AND_COMPANION.md) with shortcut, streaming layout, and speaking behavior.

## Product stance

- Larry is the primary product surface in v1.
- Larry is VS Code-only in v1.
- Larry performs safe navigation only.
- Larry is not OS-wide mouse automation.

Guide-the-user behavior is implemented via `AssistantEnvelopeV1` plus local rendering of text and TTS, not by taking over the machine.

## Vision

- A **single** lightweight surface anchored near the current VS Code work context.
- No separate chat app window.
- Minimal support UI may still exist for settings, logs, auth, and blocked states.
- When idle, Larry may either remain subtly visible or hide based on product settings. Default: visible but restrained.

## Default controls

| Input | Role |
|-------|------|
| `Control+Option+L` | Wake Larry / keep Larry in follow mode |
| `Control+Option+V` | Start a voice request |
| `Control+Option+C` | Toggle the secondary mini chat |

**Implementation note:** These are the current documented macOS-first defaults. Keep them user-rebindable in the product, but do not leave the docs vague.

## Voice and processing flow

1. User wakes or keeps Larry active with `Control+Option+L`.
2. Sidecar starts capture, subject to mic permission.
3. Audio streams to OpenClaw through the accepted bridge path.
4. Larry shows short transient bubble guidance as chunks arrive.
5. Larry may speak the result through TTS.
6. When the turn completes, actions in `AssistantEnvelopeV1` run through the executor.

## Follow behavior

- Update position relative to the current work point at a throttled rate.
- Keep offset small and predictable.
- Avoid blocking the extension host thread.
- Stay visually attached to current work without jitter.
- Follow the user's cursor by default.
- Move on its own only when guiding toward a safe destination in VS Code.
- After arrival, allow the mini chat to open for follow-up detail without becoming the main surface.

## Bubble layout (normative)

| Rule | Detail |
|------|--------|
| **Growth** | Start at one line and grow vertically as wrapped lines increase, up to a tuned max height. |
| **Scroll** | After max height, use inner scroll only in the secondary mini chat, not in the default transient bubble. |
| **Wrapping** | Keep a compact max width suitable for cursor-adjacent guidance. |
| **Typography** | System UI 12-13 px; concise, readable, direct. |
| **Animation** | Subtle only; respect reduced motion. |
| **Clearing** | New user turn clears or archives prior bubble content according to session policy. |

## Visual baseline

- Blue cursor-first identity
- Tiny status dot with green idle, yellow thinking, and red error semantics
- Comic-style transient bubble
- restrained brand accent
- high-contrast fallback for difficult themes
- clear differentiation between listening, thinking, and speaking states

## Accessibility

- Larry's spoken content must also exist as visible text.
- Critical content must also be available in support UI or transcript fallback.
- Decorative motion should be suppressible.

## Failure and degrade modes

| Condition | Behavior |
|-----------|----------|
| Larry unavailable | Support UI + editor decorations only. |
| OpenClaw blocked | Show blocked state in support UI; Larry may show a short error line or hide. |
| Mic denied | Support UI message plus text-only fallback if implemented. |

## Related

- [`BACKEND_VS_LOCAL_RUNTIME.md`](BACKEND_VS_LOCAL_RUNTIME.md)
- [`docs/02_TECHNICAL_PRD.md`](../../docs/02_TECHNICAL_PRD.md)
- [`docs/07_LOCAL_CURSOR_AND_COMPANION.md`](../../docs/07_LOCAL_CURSOR_AND_COMPANION.md)
