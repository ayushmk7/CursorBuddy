# Host compatibility — VS Code vs Cursor

**Stance:** Implement and test primarily against **VS Code extension APIs** ([Compatibility](https://code.visualstudio.com/api/references/extension-guidelines)). Treat **Cursor** as a supported host where product requirements apply: validate each release on Cursor if you ship a Cursor‑branded distribution.

Both hosts expose the **`@types/vscode`** surface for extensions. Differences are mostly **marketplace ID**, packaging, and **behavioral edge cases**, not a second extension codebase.

## Matrix

| Area | VS Code | Cursor | Agent guidance |
|------|---------|--------|----------------|
| **Extension manifest** | `package.json` engines: `vscode` version range | Same family; set `engines.vscode` to minimum API you require | One manifest; pin minimum version after testing on both. |
| **Activation** | `onCommand`, `onStartupFinished`, etc. | Same | Prefer narrow `activationEvents` per [`docs/02_TECHNICAL_PRD.md`](../../docs/02_TECHNICAL_PRD.md) §2.1. |
| **Webview / sidebar** | `WebviewViewProvider`, CSP, `asWebviewUri` | Same API | Keep CSP strict; no remote scripts unless allowlisted. |
| **`vscode.commands.executeCommand`** | Core + extensions | Same; command IDs for built‑in UI are shared | Maintain **versioned command map**; Cursor may bundle slightly different built‑in versions—run matrix tests. |
| **Secrets** | `ExtensionContext.secrets` | Same API | Store OpenClaw token per PRD; never provider keys in extension. |
| **Git integration** | `vscode.git` extension API | Same pattern | Abstract behind `GitAdapter` per Technical PRD §2.3. |
| **Publishing** | VS Code Marketplace | Cursor may use Open VSX or internal gallery | Document **install from VSIX** for internal builds; separate marketplace listing if required. |
| **Product name / branding** | “WaveClick” in UI | Same extension; may reference Cursor in copy | Keep code host‑agnostic; strings can use `${productName}` if needed later. |
| **AI features inside host** | Copilot Chat (optional) | Cursor Agent / chat | **Do not** rely on host AI for WaveClick orchestration; OpenClaw remains mandatory per PRD. |

## Testing checklist (both hosts)

1. Start/stop session; blocked state when OpenClaw unreachable.
2. Webview transcript + mic level; sidebar updates under load.
3. Executor: at least one `execute_command` alias and one `reveal_uri` on a multi‑root workspace.
4. Keybinding chord does not conflict with host defaults (document overrides).
5. Optional: overlay/sidecar smoke test on **macOS** first (where pointer‑follow is specified).

## When APIs differ

If a host regression or missing command appears on Cursor only:

1. File a **command‑ID fallback** in the version matrix ([`docs/06_BACKEND_IMPLEMENTATION_STEPS.md`](../../docs/06_BACKEND_IMPLEMENTATION_STEPS.md) Phase 0.3).
2. Prefer **degraded UX** (message + manual step) over **unsafe** execution.

## Related

- [`docs/02_TECHNICAL_PRD.md`](../../docs/02_TECHNICAL_PRD.md) §2
- [`COMPANION_OVERLAY_UX_SPEC.md`](COMPANION_OVERLAY_UX_SPEC.md) (shortcut behavior)
