import { App, FileManager, TAbstractFile, TFile, TFolder } from 'obsidian';
import { PluginSettings } from './settings';
import { translate } from './i18n';

export async function convertTableToBase(
	app: App,
	table: MarkdownTable,
	fileManager: FileManager,
	sourceBasename: string,
	settings: PluginSettings,
	language: string,
): Promise<string> {
	const headers = table.headers.map((header) => header.trim());
	const fileNameColumn = headers.indexOf(settings.fileNameColumn.trim());
	const contentColumn = headers.indexOf('file_content');

	if (
		!settings.fileNameColumn.trim() ||
		settings.fileNameColumn.trim() === 'file_content' ||
		fileNameColumn === -1 ||
		contentColumn === -1
	) {
		throw new Error(
			translate(language, 'error.tableRequired', {
				fileNameColumn: settings.fileNameColumn || 'file_name',
			}),
		);
	}
	if (headers.some((header) => !header)) {
		throw new Error(translate(language, 'error.emptyHeaders'));
	}
	if (new Set(headers).size !== headers.length) {
		throw new Error(translate(language, 'error.duplicateHeaders'));
	}
	if (table.rows.some((row) => row.length !== headers.length)) {
		throw new Error(translate(language, 'error.rowLength'));
	}

	const folderPath = normalizeFolderPath(settings.outputFolder, language);
	const basePath = `${sourceBasename}_base.base`;
	const loadedFiles = app.vault.getAllLoadedFiles();
	const existingPaths = new Set(loadedFiles.map((file) => file.path.toLowerCase()));
	const baseEntry = loadedFiles.find(
		(file) => file.path.toLowerCase() === basePath.toLowerCase(),
	);
	if (baseEntry && !(baseEntry instanceof TFile)) {
		throw new Error(
			translate(language, 'error.baseFolderConflict', { path: basePath }),
		);
	}

	const folderEntries = ensureFolderPathEntries(folderPath, loadedFiles, language);
	const baseTag = normalizeTag(settings.baseTag.trim() || sourceBasename);
	if (!baseTag) {
		throw new Error(translate(language, 'error.invalidTag'));
	}

	const fileNames = new Set<string>();
	const generatedNotes = table.rows.map((row, rowIndex) => {
		const requestedName = sanitizeFileName(
			getCell(row, fileNameColumn, settings.fileNameColumn, language),
		);
		if (!requestedName) {
			throw new Error(
				translate(language, 'error.emptyFileName', {
					column: settings.fileNameColumn,
				}),
			);
		}

		const content = getCell(row, contentColumn, 'file_content', language);
		const tagsColumn = headers.findIndex((header) => header.toLowerCase() === 'tags');
		const tags = tagsColumn === -1
			? [baseTag]
			: [
				...new Set([
					...parseTags(getCell(row, tagsColumn, 'tags', language)),
					baseTag,
				]),
			];
		const properties = headers
			.map((header, index) => ({ header, index }))
			.filter(
				({ header }) =>
					header !== settings.fileNameColumn.trim() && header !== 'file_content',
			)
			.map(({ header, index }) => {
				const value = getCell(row, index, header, language);
				if (!settings.allowEmptyColumns && value.trim() === '') {
					throw new Error(
						translate(language, 'error.emptyProperty', {
							column: header,
							row: rowIndex + 1,
						}),
					);
				}
				return [
					`${JSON.stringify(header.toLowerCase() === 'tags' ? 'tags' : header)}:`,
					header.toLowerCase() === 'tags'
						? JSON.stringify(tags)
						: JSON.stringify(value),
				].join(' ');
			});
		if (tagsColumn === -1) {
			properties.push(`"tags": ${JSON.stringify(tags)}`);
		}

		const filename = getUniqueFileName(
			requestedName,
			folderPath,
			fileNames,
			existingPaths,
		);
		const noteContent = properties.length
			? `---\n${properties.join('\n')}\n---\n${content}`
			: content;

		return {
			path: `${folderPath ? `${folderPath}/` : ''}${filename}.md`,
			filename,
			content: noteContent,
		};
	});

	const baseContent = createBaseContent(
		headers,
		folderPath,
		baseTag,
		settings.fileNameColumn,
		language,
	);
	const createdFiles: TFile[] = [];
	const createdFolders: TFolder[] = [];
	try {
		for (const folderEntry of folderEntries) {
			const folder = await app.vault.createFolder(folderEntry);
			createdFolders.push(folder);
		}
		for (const note of generatedNotes) {
			createdFiles.push(await app.vault.create(note.path, note.content));
		}
		if (!baseEntry) {
			createdFiles.push(await app.vault.create(basePath, baseContent));
		}
	} catch (error) {
		const cleanupErrors: unknown[] = [];
		for (const file of createdFiles.reverse()) {
			try {
				await fileManager.trashFile(file);
			} catch (cleanupError) {
				cleanupErrors.push(cleanupError);
			}
		}
		for (const folder of createdFolders.reverse()) {
			if (folder.children.length === 0) {
				try {
					await fileManager.trashFile(folder);
				} catch (cleanupError) {
					cleanupErrors.push(cleanupError);
				}
			}
		}
		if (cleanupErrors.length > 0) {
			throw new Error(
				translate(language, 'error.cleanupFailed', {
					error: getErrorMessage(error),
					cleanupErrors: cleanupErrors.map(getErrorMessage).join('; '),
				}),
			);
		}
		throw error;
	}

	return `![[${basePath}]]`;
}

function getCell(
	row: string[],
	index: number,
	columnName: string,
	language: string,
): string {
	const value = row[index];
	if (value === undefined) {
		throw new Error(translate(language, 'error.missingCell', { column: columnName }));
	}
	return value;
}

function getUniqueFileName(
	name: string,
	folderPath: string,
	reservedNames: Set<string>,
	existingPaths: Set<string>,
): string {
	let candidate = name;
	let suffix = 2;
	while (
		reservedNames.has(candidate.toLowerCase()) ||
		existingPaths.has(
			`${folderPath ? `${folderPath}/` : ''}${candidate}.md`.toLowerCase(),
		)
	) {
		candidate = `${name}_${suffix}`;
		suffix++;
	}
	reservedNames.add(candidate.toLowerCase());
	return candidate;
}

function sanitizeFileName(name: string): string {
	const sanitized = Array.from(
		name.trim().replace(/\.md$/i, '').replace(/[\\/:*?"<>|]/g, '-'),
		(character) => (character.charCodeAt(0) <= 0x1f ? '-' : character),
	)
		.join('')
		.replace(/[. ]+$/g, '')
		.trim();
	return /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i.test(sanitized)
		? `_${sanitized}`
		: sanitized;
}

function normalizeFolderPath(path: string, language: string): string {
	const normalized = path.trim().replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
	if (
		normalized.split('/').some((segment) =>
			segment === '' || segment === '.' || segment === '..',
		)
	) {
		if (normalized) {
			throw new Error(translate(language, 'error.invalidFolder'));
		}
	}
	return normalized;
}

function ensureFolderPathEntries(
	folderPath: string,
	loadedFiles: TAbstractFile[],
	language: string,
): string[] {
	const entries: string[] = [];
	let currentPath = '';
	for (const segment of folderPath.split('/').filter(Boolean)) {
		currentPath = currentPath ? `${currentPath}/${segment}` : segment;
		const existing = loadedFiles.find(
			(file) => file.path.toLowerCase() === currentPath.toLowerCase(),
		);
		if (existing && !(existing instanceof TFolder)) {
			throw new Error(
				translate(language, 'error.fileConflict', { path: currentPath }),
			);
		}
		if (existing && existing.path !== currentPath) {
			throw new Error(
				translate(language, 'error.folderConflict', { path: existing.path }),
			);
		}
		if (!existing) {
			entries.push(currentPath);
		}
	}
	return entries;
}

function normalizeTag(tag: string): string {
	return tag.trim().replace(/^#+/, '').replace(/\s+/g, '-');
}

function parseTags(value: string): string[] {
	const trimmed = value.trim();
	let values: string[];
	if (trimmed.startsWith('[')) {
		try {
			const parsed: unknown = JSON.parse(trimmed);
			values =
				Array.isArray(parsed) && parsed.every((tag) => typeof tag === 'string')
					? parsed
					: trimmed.split(',');
		} catch {
			values = trimmed.split(',');
		}
	} else {
		values = trimmed.split(',');
	}
	return values
		.map(normalizeTag)
		.filter(Boolean);
}

function getErrorMessage(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}

function createBaseContent(
	headers: string[],
	folderPath: string,
	baseTag: string,
	fileNameColumn: string,
	language: string,
): string {
	const columns = [
		'file.name',
		...headers.filter(
			(header) => header !== fileNameColumn && header !== 'file_content',
		).map((header) => header.toLowerCase() === 'tags' ? 'tags' : header),
	];
	if (!columns.some((column) => column.toLowerCase() === 'tags')) {
		columns.push('tags');
	}
	const filters = [
		...(folderPath
			? [`    - file.inFolder(${JSON.stringify(folderPath)})`]
			: []),
		'    - file.ext == "md"',
		`    - file.hasTag(${JSON.stringify(baseTag)})`,
	];
	return [
		'filters:',
		'  and:',
		...filters,
		'views:',
		'  - type: table',
		`    name: ${translate(language, 'base.viewName')}`,
		'    order:',
		...columns.map((column) => `      - ${JSON.stringify(column)}`),
		'',
	].join('\n');
}

interface MarkdownTable {
	headers: string[];
	rows: string[][];
}
