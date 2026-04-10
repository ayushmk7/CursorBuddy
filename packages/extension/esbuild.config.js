const esbuild = require('esbuild');

const watch = process.argv.includes('--watch');

const extensionBuild = {
  entryPoints: ['src/extension.ts'],
  bundle: true,
  platform: 'node',
  format: 'cjs',
  outfile: 'dist/extension.js',
  external: ['vscode'],   // PROVIDED by VS Code runtime — must never be bundled
  sourcemap: true,
};

const webviewBuild = {
  entryPoints: ['src/webview/main.ts'],
  bundle: true,
  platform: 'browser',
  format: 'iife',
  outfile: 'dist/webview.js',
  sourcemap: true,
};

if (watch) {
  Promise.all([
    esbuild.context(extensionBuild).then(ctx => ctx.watch()),
    esbuild.context(webviewBuild).then(ctx => ctx.watch()),
  ]).then(() => console.log('Watching...'));
} else {
  Promise.all([
    esbuild.build(extensionBuild),
    esbuild.build(webviewBuild),
  ]).then(() => console.log('Build complete')).catch(() => process.exit(1));
}
