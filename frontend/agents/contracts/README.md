# Contracts — local frontend pointers only

Authoritative contracts for the local frontend live outside this folder. Do not fork or duplicate them here.

## Where to look

| Contract | Location |
|----------|----------|
| `AssistantEnvelopeV1` shape and action types | [`docs/02_TECHNICAL_PRD.md`](../../../docs/02_TECHNICAL_PRD.md) §4 |
| Local runtime UI boundaries | [`docs/07_LOCAL_CURSOR_AND_COMPANION.md`](../../../docs/07_LOCAL_CURSOR_AND_COMPANION.md) |
| Pointer-follow capsule behavior | [`backend/agents/docs/COMPANION_OVERLAY_UX_SPEC.md`](../../../backend/agents/docs/COMPANION_OVERLAY_UX_SPEC.md) |
| Backend vs local responsibility split | [`backend/agents/docs/BACKEND_VS_LOCAL_RUNTIME.md`](../../../backend/agents/docs/BACKEND_VS_LOCAL_RUNTIME.md) |

## Implementation rule

The local frontend should render and explain:

- connection state
- transcript state
- step state
- confirmation state

It should not redefine backend contracts or invent alternate orchestration shapes.

If later code shares concrete TypeScript types, generate them from one canonical source and reuse them across local runtime packages.
