import vscode from 'vscode';
import { getBaseUrl, getDebugMode } from '../config';
import { MODELS, PROVIDERS, REQUEST_DUMP_WARNING_SHOWN_KEY } from '../consts';
import { t } from '../i18n';
import { logger } from '../logger';
import { ensureRequestDumpRoot } from '../provider/debug';

export function registerCommands(context: vscode.ExtensionContext): void {
	context.subscriptions.push(
		vscode.commands.registerCommand('cllms.showLogs', () => logger.show()),
		vscode.commands.registerCommand('cllms.openRequestDumpsFolder', () =>
			openRequestDumpsFolder(context),
		),
		vscode.commands.registerCommand('cllms.copyDiagnosticReport', () =>
			copyDiagnosticReport(context),
		),
		vscode.commands.registerCommand('cllms.getApiKey', () => openApiKeyPage()),
		vscode.commands.registerCommand('cllms.configureUtilityModel', () => configureUtilityModel()),
		vscode.commands.registerCommand('cllms.openSettings', () =>
			vscode.commands.executeCommand('workbench.action.openSettings', 'cllms'),
		),
	);
}

const CHAT_UTILITY_MODEL_SETTING = 'utilityModel';
const CHAT_UTILITY_SMALL_MODEL_SETTING = 'utilitySmallModel';

interface UtilityModelPick extends vscode.QuickPickItem {
	modelId?: string;
	action?: 'open-settings';
}

/**
 * Guide the user into VS Code's native `chat.utilityModel` /
 * `chat.utilitySmallModel` routing so lightweight Copilot helper requests use a
 * cheaper model. Preferred over CLLMs' own silent downgrade because the routing
 * is visible and managed by the host.
 */
async function configureUtilityModel(): Promise<void> {
	const picks: UtilityModelPick[] = [
		...MODELS.map((model) => ({
			label: model.name,
			description: model.id,
			modelId: model.id,
		})),
		{ label: '', kind: vscode.QuickPickItemKind.Separator },
		{ label: t('utilityModel.openSettings'), action: 'open-settings' },
	];

	const choice = await vscode.window.showQuickPick(picks, {
		title: t('utilityModel.title'),
		placeHolder: t('utilityModel.placeholder'),
	});
	if (!choice) {
		return;
	}
	if (choice.action === 'open-settings' || !choice.modelId) {
		await openChatUtilityModelSettings();
		return;
	}

	try {
		const config = vscode.workspace.getConfiguration('chat');
		await config.update(
			CHAT_UTILITY_MODEL_SETTING,
			choice.modelId,
			vscode.ConfigurationTarget.Global,
		);
		await config.update(
			CHAT_UTILITY_SMALL_MODEL_SETTING,
			choice.modelId,
			vscode.ConfigurationTarget.Global,
		);
		logger.info(`Configured chat.utilityModel / chat.utilitySmallModel = ${choice.modelId}`);
		const openSettings = t('utilityModel.openSettingsAction');
		const selection = await vscode.window.showInformationMessage(
			t('utilityModel.configured', choice.modelId),
			openSettings,
		);
		if (selection === openSettings) {
			await openChatUtilityModelSettings();
		}
	} catch (error) {
		// Older VS Code builds may not contribute these settings yet; fall back to
		// the Settings UI so the user can adjust them manually.
		logger.warn('Failed to write chat.utilityModel settings', error);
		await vscode.window.showWarningMessage(t('utilityModel.writeFailed'));
		await openChatUtilityModelSettings();
	}
}

function openChatUtilityModelSettings(): Thenable<unknown> {
	return vscode.commands.executeCommand('workbench.action.openSettings', 'chat.utilityModel');
}

async function openApiKeyPage(): Promise<void> {
	const providers = Object.values(PROVIDERS);
	const provider =
		providers.length === 1
			? providers[0]
			: (
					await vscode.window.showQuickPick(
						providers.map((p) => ({ label: `$(link-external) ${p.name}`, provider: p })),
						{
							title: t('auth.selectProviderSet'),
							placeHolder: t('auth.selectProviderPlaceholder'),
						},
					)
				)?.provider;
	if (provider) {
		await vscode.env.openExternal(vscode.Uri.parse(provider.externalUrls.apiKeys));
	}
}

async function openRequestDumpsFolder(context: vscode.ExtensionContext): Promise<void> {
	try {
		await showRequestDumpWarningIfNeeded(context);
		const root = await ensureRequestDumpRoot(context.globalStorageUri);
		logger.info(`Opening request dumps folder: ${root.toString(true)}`);
		await vscode.commands.executeCommand('revealFileInOS', root);
	} catch (error) {
		logger.warn('Failed to open request dumps folder', error);
		void vscode.window.showErrorMessage(t('extension.openRequestDumpsFolderFailed'));
	}
}

async function showRequestDumpWarningIfNeeded(context: vscode.ExtensionContext): Promise<void> {
	if (context.globalState.get<boolean>(REQUEST_DUMP_WARNING_SHOWN_KEY)) {
		return;
	}

	await vscode.window.showWarningMessage(t('debug.dumpPrivacyWarning'));
	await context.globalState.update(REQUEST_DUMP_WARNING_SHOWN_KEY, true);
}

async function copyDiagnosticReport(context: vscode.ExtensionContext): Promise<void> {
	const report = createDiagnosticReport(context);
	await vscode.env.clipboard.writeText(report);
	void vscode.window.showInformationMessage(t('diagnosticReport.copied'));
}

function createDiagnosticReport(context: vscode.ExtensionContext): string {
	const providerLines = Object.values(PROVIDERS).map((provider) => {
		const baseUrlHost = getUrlHost(getBaseUrl(provider));
		return `- ${provider.id}: ${provider.name}, host=${baseUrlHost}, baseUrlSetting=${provider.baseUrlSetting}, modelIdOverridesSetting=${provider.modelIdOverridesSetting}`;
	});

	return [
		'CLLMs Diagnostic Report',
		`Extension version: ${String(context.extension.packageJSON.version ?? 'unknown')}`,
		`VS Code version: ${vscode.version}`,
		`Language: ${vscode.env.language}`,
		`Remote: ${vscode.env.remoteName ?? 'local'}`,
		`Debug mode: ${getDebugMode()}`,
		'Providers:',
		...providerLines,
		'Notes: secrets, prompts, request bodies, custom header values, and full URLs are intentionally excluded.',
	].join('\n');
}

function getUrlHost(value: string): string {
	try {
		return new URL(value).host;
	} catch {
		return 'invalid-url';
	}
}
