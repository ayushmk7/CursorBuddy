import * as vscode from 'vscode';

export interface WorkspaceState {
  vscode_version: string;
  workspace_folders: Array<{ name: string; uri: string }>;
  git?: {
    repositories: Array<{
      root: string;
      head_branch: string;
      head_sha: string;
      modified_files: string[];
      staged_files: string[];
    }>;
  };
  active_editor?: {
    uri: string;
    language_id: string;
    line_count: number;
    selection: { start: { line: number; character: number }; end: { line: number; character: number } };
    file_body?: string;
  };
}

export async function probeWorkspaceState(input: {
  include_git?: boolean;
  include_active_editor?: boolean;
  include_file_body?: boolean;
}): Promise<WorkspaceState> {
  const state: WorkspaceState = {
    vscode_version: vscode.version,
    workspace_folders: (vscode.workspace.workspaceFolders ?? []).map(f => ({
      name: f.name,
      uri: f.uri.toString(),
    })),
  };

  if (input.include_git) {
    try {
      const gitExtension = vscode.extensions.getExtension('vscode.git')?.exports;
      const git = gitExtension?.getAPI(1);
      if (git) {
        state.git = {
          repositories: await Promise.all(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            git.repositories.map(async (repo: any) => ({
              root: repo.rootUri.fsPath,
              head_branch: repo.state.HEAD?.name ?? 'detached',
              head_sha: repo.state.HEAD?.commit ?? '',
              modified_files: repo.state.workingTreeChanges.map((c: any) => c.uri.fsPath),
              staged_files: repo.state.indexChanges.map((c: any) => c.uri.fsPath),
            }))
          ),
        };
      }
    } catch {
      // Git extension unavailable — omit
    }
  }

  if (input.include_active_editor) {
    const editor = vscode.window.activeTextEditor;
    if (editor) {
      const editorState: WorkspaceState['active_editor'] = {
        uri: editor.document.uri.toString(),
        language_id: editor.document.languageId,
        line_count: editor.document.lineCount,
        selection: {
          start: { line: editor.selection.start.line, character: editor.selection.start.character },
          end:   { line: editor.selection.end.line,   character: editor.selection.end.character },
        },
      };
      if (input.include_file_body) {
        editorState.file_body = editor.document.getText();
      }
      state.active_editor = editorState;
    }
  }

  return state;
}
