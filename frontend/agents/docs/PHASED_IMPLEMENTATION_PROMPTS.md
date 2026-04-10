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
- sidebar webview shell
- pointer-adjacent overlay capsule
- transcript, steps, and safety footer
Use local HTML/CSS/JS assets and keep them CSP-friendly.
```

---

## Phase 2 — Sidebar UI

```text
Read docs/07_LOCAL_CURSOR_AND_COMPANION.md §3 and docs/design/autoapply-design-tokens.md Part B.
Implement the sidebar with:
- header
- OpenClaw status pill
- push-to-talk region
- transcript
- numbered steps
- high-risk confirmation area
Use host-style variables with fallbacks.
```

---

## Phase 3 — Overlay capsule

```text
Read backend/agents/docs/COMPANION_OVERLAY_UX_SPEC.md.
Implement the pointer-follow overlay with:
- offset and edge flipping
- streaming caption area
- subtle waveform
- reduced-motion fallback
Do not imply OS-wide automation.
```

---

## Phase 4 — Local state presets

```text
Implement local UI presets for:
- Live
- Degraded
- Blocked
- Listening
- Confirm required
Drive the UI from a small state model rather than one-off DOM patches.
```

---

## Verification prompt

```text
Read frontend/agents/docs/IMPLEMENTATION_STEPS.md.
List completed phases, explain how frontend/ now differs from landingpage/, and verify the local prototype renders and switches between session states.
```
