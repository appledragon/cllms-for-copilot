import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runTests } from '@vscode/test-electron';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

await runTests({
	extensionDevelopmentPath: root,
	extensionTestsPath: resolve(root, 'test/smoke/extension-host-smoke.cjs'),
	launchArgs: ['--disable-workspace-trust'],
});
