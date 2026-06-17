import * as path from 'node:path';
import vscode from 'vscode';
import { t } from '../i18n';
import { logger } from '../logger';
import { IMAGE_DESCRIPTION_PREFIX, IMAGE_DESCRIPTION_SUFFIX } from '../provider/vision/consts';
import { getVisionPrompt } from '../provider/vision/sources/vscode';
import type { VisionDescriber } from '../provider/vision/types';

/**
 * Input schema for the `cllms_readImage` language model tool.
 */
export interface ImageReadToolInput {
	/** Path to the image file, relative to the workspace root. */
	filePath: string;
	/** Optional specific question or prompt about the image. */
	prompt?: string;
}

/**
 * Factory that creates a VS Code LanguageModelTool for reading and describing
 * image files from the workspace using the configured vision proxy.
 */
export function createImageReadTool(
	getVisionDescriber: () => Promise<VisionDescriber | undefined>,
): vscode.LanguageModelTool<ImageReadToolInput> {
	return {
		async invoke(
			options: vscode.LanguageModelToolInvocationOptions<ImageReadToolInput>,
			token: vscode.CancellationToken,
		): Promise<vscode.LanguageModelToolResult> {
			const { filePath, prompt } = options.input;

			// ---- validate input ----
			if (!filePath || typeof filePath !== 'string' || filePath.trim().length === 0) {
				return new vscode.LanguageModelToolResult([
					new vscode.LanguageModelTextPart(t('tool.readImage.error.missingPath')),
				]);
			}

			// ---- resolve file path and read ----
			const resolved = await resolveAndReadImageFile(filePath.trim());
			if (!resolved) {
				return new vscode.LanguageModelToolResult([
					new vscode.LanguageModelTextPart(t('tool.readImage.error.notFound', filePath)),
				]);
			}

			const { imageData, resolvedPath } = resolved;

			if (imageData.byteLength === 0) {
				return new vscode.LanguageModelToolResult([
					new vscode.LanguageModelTextPart(t('tool.readImage.error.emptyFile', filePath)),
				]);
			}

			// ---- detect MIME type from extension ----
			const mimeType = detectImageMimeType(resolvedPath.fsPath);
			if (!mimeType) {
				return new vscode.LanguageModelToolResult([
					new vscode.LanguageModelTextPart(t('tool.readImage.error.unsupportedFormat', filePath)),
				]);
			}

			// ---- check for cancellation ----
			if (token.isCancellationRequested) {
				return new vscode.LanguageModelToolResult([
					new vscode.LanguageModelTextPart(t('tool.readImage.cancelled')),
				]);
			}

			// ---- get vision describer ----
			const describer = await getVisionDescriber();
			if (!describer || token.isCancellationRequested) {
				return new vscode.LanguageModelToolResult([
					new vscode.LanguageModelTextPart(t('tool.readImage.error.noVisionProxy')),
				]);
			}

			// ---- describe the image ----
			try {
				const description = await describer.describe({
					prompt: prompt?.trim() || getVisionPrompt(),
					images: [{ mimeType, data: imageData }],
					token,
				});

				if (!description || description.trim().length === 0) {
					return new vscode.LanguageModelToolResult([
						new vscode.LanguageModelTextPart(t('tool.readImage.error.emptyResponse', filePath)),
					]);
				}

				const formattedDescription = `${IMAGE_DESCRIPTION_PREFIX}${description}${IMAGE_DESCRIPTION_SUFFIX}`;
				logger.info(
					`Image read tool: described ${path.basename(filePath)} (${(imageData.byteLength / 1024).toFixed(1)} KB)`,
				);

				return new vscode.LanguageModelToolResult([
					new vscode.LanguageModelTextPart(formattedDescription),
				]);
			} catch (error) {
				logger.error(`Image read tool: vision proxy failed for ${filePath}`, error);
				return new vscode.LanguageModelToolResult([
					new vscode.LanguageModelTextPart(
						t('tool.readImage.error.describeFailed', filePath, formatError(error)),
					),
				]);
			}
		},
	};
}

// ---- helpers ----

const IMAGE_EXTENSIONS: ReadonlyMap<string, string> = new Map([
	['.png', 'image/png'],
	['.jpg', 'image/jpeg'],
	['.jpeg', 'image/jpeg'],
	['.gif', 'image/gif'],
	['.webp', 'image/webp'],
	['.bmp', 'image/bmp'],
	['.svg', 'image/svg+xml'],
	['.tiff', 'image/tiff'],
	['.tif', 'image/tiff'],
	['.ico', 'image/x-icon'],
]);

interface ResolvedImageFile {
	imageData: Uint8Array;
	resolvedPath: vscode.Uri;
}

/**
 * Resolve the given file path against workspace folders and read the file.
 * Tries absolute paths first, then each workspace folder for relative paths.
 */
async function resolveAndReadImageFile(filePath: string): Promise<ResolvedImageFile | undefined> {
	const candidates = getCandidateUris(filePath);
	if (candidates.length === 0) {
		return undefined;
	}

	for (const candidate of candidates) {
		try {
			const imageData = await vscode.workspace.fs.readFile(candidate);
			return { imageData, resolvedPath: candidate };
		} catch {
			// Try the next candidate
		}
	}

	return undefined;
}

function getCandidateUris(filePath: string): vscode.Uri[] {
	// Absolute path: try directly
	if (path.isAbsolute(filePath)) {
		return [vscode.Uri.file(filePath)];
	}

	const workspaceFolders = vscode.workspace.workspaceFolders;
	if (!workspaceFolders || workspaceFolders.length === 0) {
		return [];
	}

	// Relative path: try each workspace folder
	return workspaceFolders.map((folder) => vscode.Uri.joinPath(folder.uri, filePath));
}

function detectImageMimeType(filePath: string): string | undefined {
	const ext = path.extname(filePath).toLowerCase();
	return IMAGE_EXTENSIONS.get(ext);
}

function formatError(error: unknown): string {
	if (error instanceof Error) {
		return error.message;
	}
	return String(error);
}
