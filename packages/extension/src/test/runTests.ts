import { runTests } from '@vscode/test-electron';
import * as path from 'path';

async function main(): Promise<void> {
  // extensionDevelopmentPath: the folder containing this extension's package.json
  const extensionDevelopmentPath = path.resolve(__dirname, '../../');
  // extensionTestsPath: compiled suite index (without .js — VS Code test runner appends it)
  const extensionTestsPath = path.resolve(__dirname, './suite/index');

  // When running inside VS Code's own process (e.g. via the extension host or the `code` CLI
  // wrapper), ELECTRON_RUN_AS_NODE=1 is set in the environment. If that variable is inherited by
  // the child VS Code process spawned by @vscode/test-electron, the Electron binary treats itself
  // as a bare Node.js runtime and ignores all VS Code flags, so the tests never execute.
  // Clearing it here ensures the spawned VS Code runs as a proper Electron app.
  await runTests({
    extensionDevelopmentPath,
    extensionTestsPath,
    extensionTestsEnv: { ELECTRON_RUN_AS_NODE: '' },
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
