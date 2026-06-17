import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
	downloadAndUnzipVSCode,
	resolveCliArgsFromVSCodeExecutablePath,
} from '@vscode/test-electron';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = resolve(root, 'dist');

if (!existsSync(dist)) {
	throw new Error('dist/ does not exist. Run `npm run package` before VSIX smoke testing.');
}

const vsix = readdirSync(dist)
	.filter((file) => file.endsWith('.vsix'))
	.sort()
	.at(-1);

if (!vsix) {
	throw new Error('No VSIX found in dist/. Run `npm run package` first.');
}

const vscodeExecutablePath = await downloadAndUnzipVSCode('stable');
const [cli, ...cliArgs] = resolveCliArgsFromVSCodeExecutablePath(vscodeExecutablePath);
const installRoot = mkdtempSync(join(tmpdir(), 'cllms-vsix-smoke-'));
const vsixPath = resolve(dist, vsix);

const result = spawnSync(
	cli,
	[
		...cliArgs,
		'--extensions-dir',
		join(installRoot, 'extensions'),
		'--user-data-dir',
		join(installRoot, 'user-data'),
		'--install-extension',
		vsixPath,
		'--force',
	],
	{
		encoding: 'utf8',
		stdio: 'pipe',
		shell: process.platform === 'win32',
	},
);

if (result.status !== 0) {
	throw new Error(
		`VSIX install smoke failed (${result.status}).\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`,
	);
}

console.log(`Installed ${vsixPath} into isolated VS Code extension dir.`);
