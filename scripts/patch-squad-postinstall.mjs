import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();

function patchJsonRpcExports() {
  const pkgPath = join(root, 'node_modules', 'vscode-jsonrpc', 'package.json');
  if (!existsSync(pkgPath)) return;

  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
  if (pkg.exports?.['./node']) return;

  pkg.exports = {
    '.': { types: './lib/common/api.d.ts', default: './lib/node/main.js' },
    './node': { node: './lib/node/main.js', types: './lib/node/main.d.ts' },
    './node.js': { node: './lib/node/main.js', types: './lib/node/main.d.ts' },
    './browser': { types: './lib/browser/main.d.ts', browser: './lib/browser/main.js' },
  };

  writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`, 'utf8');
}

function patchCopilotSdkSession() {
  const sessionPath = join(root, 'node_modules', '@github', 'copilot-sdk', 'dist', 'session.js');
  if (!existsSync(sessionPath)) return;

  const before = readFileSync(sessionPath, 'utf8');
  const after = before.replace(
    /from\s+["']vscode-jsonrpc\/node["']/g,
    'from "vscode-jsonrpc/node.js"',
  );

  if (after !== before) {
    writeFileSync(sessionPath, after, 'utf8');
  }
}

patchJsonRpcExports();
patchCopilotSdkSession();
