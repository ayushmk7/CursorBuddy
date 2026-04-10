# Tool: vscode_probe_state

**Purpose:** Returns a structured JSON snapshot of the VS Code workspace and Git state.
Called by the WaveClick agent when it needs editor context. Never returns file bodies
by default — only metadata.

## Input schema

```json
{
  "include_git": true,
  "include_active_editor": true,
  "include_file_body": false
}
```

## Output schema

```json
{
  "vscode_version": "1.99.0",
  "workspace_folders": [
    { "name": "app", "uri": "file:///workspace/app" }
  ],
  "git": {
    "repositories": [
      {
        "root": "file:///workspace/app",
        "head": "refs/heads/feature/waveclick",
        "working_tree_changes": 3,
        "index_changes": 1,
        "remotes": ["origin"]
      }
    ]
  },
  "active_editor": {
    "uri": "file:///workspace/app/src/main.ts",
    "languageId": "typescript",
    "selection": {
      "start": { "line": 10, "character": 0 },
      "end": { "line": 10, "character": 0 }
    }
  }
}
```

## Security constraints

- `include_file_body: true` requires explicit user consent granted in the session.
- URIs returned are workspace-relative resolvable; absolute paths must not be logged.
- Git remote URLs must not be logged in telemetry (may contain credentials).

## Handler location

Implement the handler in the VS Code extension (`packages/extension/src/adapters/WorkspaceAdapter.ts`
+ `GitAdapter.ts`). The sidecar exposes it as an RPC method; OpenClaw calls via sidecar transport.
