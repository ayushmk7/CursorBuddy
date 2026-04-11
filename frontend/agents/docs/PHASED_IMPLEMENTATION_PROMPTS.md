# Phased implementation prompts — local application frontend

Copy-paste blocks for working on the **local frontend** in `frontend/`.

These prompts are for the on-device UI only. They do **not** target `landingpage/`.

---

## Phase 0 — Scope reset

```text
Read frontend/agents/docs/AGENT_SYSTEM_INSTRUCTIONS.md, docs/07_LOCAL_CURSOR_AND_COMPANION.md, and backend/agents/docs/BACKEND_VS_LOCAL_RUNTIME.md.
Rewrite any frontend docs that still imply Next.js, marketing pages, or server-owned UI. Make frontend/ explicitly mean the local application UI only.
```

---

## Phase 1 — Local prototype scaffold

```text
Create a runnable prototype under frontend/ for the local UI only:
- Larry shell
- minimal support UI
- local status, transcript fallback, and confirmation states
Use local HTML/CSS/JS assets and keep them CSP-friendly.
```

---

## Phase 2 — Larry UI

```text
Read docs/07_LOCAL_CURSOR_AND_COMPANION.md and docs/design/autoapply-design-tokens.md Part B.
Implement Larry with:
- blue cursor rendering plus green idle / yellow thinking / red error dot semantics
- `Control+Option+L` / `Control+Option+V` / `Control+Option+C` default controls
- cursor-follow mode and self-move safe-guidance mode
- short comic-style bubble guidance text
- secondary mini chat for follow-up detail
- safe-navigation examples
Use host-style variables with fallbacks.
```

---

## Phase 3 — Support UI

```text
Read backend/agents/docs/COMPANION_OVERLAY_UX_SPEC.md and docs/07_LOCAL_CURSOR_AND_COMPANION.md.
Implement the minimal support UI with:
- auth/setup states
- blocked/degraded status
- confirmation area
- transcript/history fallback if needed
Do not let the support UI become the primary product surface.
```

---

## Phase 4 — Local state presets

```text
Implement local UI presets for:
- Live
- Degraded
- Blocked
- Thinking
- Speaking
- Mini chat open
- Confirm required
Drive the UI from a small state model rather than one-off DOM patches.
```

---

## Verification prompt

```text
Read frontend/agents/docs/IMPLEMENTATION_STEPS.md.
List completed phases, explain how frontend/ now differs from landingpage/, and verify the local prototype renders and switches between session states.
```
