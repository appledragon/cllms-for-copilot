import { build } from 'esbuild';

await build({
	entryPoints: ['src/extension.ts'],
	outfile: 'out/extension.js',
	bundle: true,
	platform: 'node',
	format: 'cjs',
	target: 'node24',
	external: ['vscode'],
	sourcemap: false,
	logLevel: 'info',
});
