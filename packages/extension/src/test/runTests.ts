import { runTests } from '@vscode/test-electron';
import * as path from 'path';

async function main(): Promise<void> {
  // extensionDevelopmentPath: the folder containing this extension's package.json
  const extensionDevelopmentPath = path.resolve(__dirname, '../../');
  // extensionTestsPath: compiled suite index (without .js — VS Code test runner appends it)
  const extensionTestsPath = path.resolve(__dirname, './suite/index');
  await runTests({ extensionDevelopmentPath, extensionTestsPath });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
