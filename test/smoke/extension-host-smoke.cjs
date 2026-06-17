const assert = require('node:assert/strict');
const vscode = require('vscode');

exports.run = async function run() {
	const extension =
		vscode.extensions.getExtension('cuilian.cllms-for-copilot') ??
		vscode.extensions.getExtension('CuiLiAn.cllms-for-copilot');
	assert.ok(extension, 'CLLMs extension should be installed in the extension host');

	await extension.activate();

	const commands = await vscode.commands.getCommands(true);
	for (const command of [
		'cllms.setupProvider',
		'cllms.setApiKey',
		'cllms.testConnection',
		'cllms.copyDiagnosticReport',
		'cllms.providers.refresh',
	]) {
		assert.ok(commands.includes(command), `${command} should be registered`);
	}

	assert.equal(extension.isActive, true);
};
