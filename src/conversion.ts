import { App, FileManager, moment, TFile, TFolder } from 'obsidian';
import type { Moment } from 'moment';
import { PluginSettings } from './settings';
import { translate } from './i18n';
import {
	formatDatePatterns,
	mapTypeColumns,
	serializeTypedCell,
} from './conversionFormat';

export async function convertTableToBase(
	app: App,
	table: MarkdownTable,
	fileManager: FileManager,
	sourceBasename: string,
	sourceFolderPath: string,
	settings: PluginSettings,
	language: string,
): Promise<string> {
	const headers = table.headers.map((header) => header.trim());
	const fileNameColumn = headers.indexOf(settings.fileNameColumn.trim());
	const contentColumn = headers.indexOf('content');

	if (
		!settings.fileNameColumn.trim() ||
		settings.fileNameColumn.trim() === 'content' ||
		fileNameColumn === -1 ||
		contentColumn === -1
	) {
		throw new Error(
			translate(language, 'error.tableRequired', {
				fileNameColumn: settings.fileNameColumn || 'name',
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

	const conversionTime: Moment = moment();
	const expandedFolder = formatDatePatterns(
		settings.outputFolder
			.trim()
			.replace(/\\/g, '/')
			.replaceAll('{{currentFolder}}', sourceFolderPath),
		(pattern) => conversionTime.format(pattern),
	);
	const folderPath = expandedFolder.replace(/^\/+|\/+$/g, '');
	if (
		folderPath &&
		folderPath.split('/').some((segment) => segment === '' || segment === '.' || segment === '..')
	) {
		throw new Error(translate(language, 'error.invalidFolder'));
	}
	const basePath = `${sourceBasename}_base.base`;
	const baseEntry = app.vault.getAbstractFileByPath(basePath);
	if (baseEntry && !(baseEntry instanceof TFile)) {
		throw new Error(
			translate(language, 'error.baseFolderConflict', { path: basePath }),
		);
	}

	const folderEntries: string[] = [];
	let currentPath = '';
	for (const segment of folderPath.split('/').filter(Boolean)) {
		currentPath = currentPath ? `${currentPath}/${segment}` : segment;
		const existing = app.vault.getAbstractFileByPath(currentPath);
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
			folderEntries.push(currentPath);
		}
	}
	const baseTag = (settings.baseTag.trim() || sourceBasename)
		.trim()
		.replace(/^#+/, '')
		.replace(/\s+/g, '-');
	if (!baseTag) {
		throw new Error(translate(language, 'error.invalidTag'));
	}

	const typeColumnMapping = mapTypeColumns(headers);
	if (typeColumnMapping.orphanColumn) {
		throw new Error(
			translate(language, 'error.orphanTypeColumn', {
				column: typeColumnMapping.orphanColumn,
			}),
		);
	}
	const typeColumnIndexes = typeColumnMapping.columns;
	const declaredPropertyTypes = new Map<string, string>();
	const reservedNames = new Set<string>();
	const generatedNotes = table.rows.map((row, rowIndex) => {
		const requestedName = formatDatePatterns(
			getCell(row, fileNameColumn, settings.fileNameColumn, language),
			(pattern) => conversionTime.format(pattern),
		)
			.trim()
			.replace(/\.md$/i, '')
			.replace(/[\\/:*?"<>|]/g, '-');
		const sanitizedName = Array.from(
			requestedName,
			(character) => (character.charCodeAt(0) <= 0x1f ? '-' : character),
		)
			.join('')
			.replace(/[. ]+$/g, '')
			.trim()
			.replace(/^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i, '_$1');
		if (!sanitizedName) {
			throw new Error(
				translate(language, 'error.emptyFileName', {
					column: settings.fileNameColumn,
				}),
			);
		}

		const content = getCell(row, contentColumn, 'content', language);
		const tagsColumn = headers.findIndex((header) => header.toLowerCase() === 'tags');
		let rowTags: string[] = [];
		if (tagsColumn !== -1) {
			const tagsValue = getCell(row, tagsColumn, 'tags', language).trim();
			if (tagsValue.startsWith('[')) {
				try {
					const parsed: unknown = JSON.parse(tagsValue);
					rowTags =
						Array.isArray(parsed) && parsed.every((tag) => typeof tag === 'string')
							? parsed
							: tagsValue.split(',');
				} catch {
					rowTags = tagsValue.split(',');
				}
			} else {
				rowTags = tagsValue.split(',');
			}
		}
		const tags = [
			...new Set([
				...rowTags
					.map((tag) => tag.trim().replace(/^#+/, '').replace(/\s+/g, '-'))
					.filter(Boolean),
				baseTag,
			]),
		];
		const properties = headers
			.map((header, index) => ({ header, index }))
			.filter(
				({ header }) =>
					header !== settings.fileNameColumn.trim() &&
					header !== 'content' &&
					!header.toLowerCase().endsWith('_type'),
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
				let serializedValue = JSON.stringify(value);
				if (header.toLowerCase() === 'tags') {
					serializedValue = JSON.stringify(tags);
				} else if (typeColumnIndexes.has(header)) {
					const typeColumnIndex = typeColumnIndexes.get(header);
					if (typeColumnIndex === undefined) {
						throw new Error(
							translate(language, 'error.orphanTypeColumn', {
								column: `${header}_type`,
							}),
						);
					}
					const declaredType = getCell(
						row,
						typeColumnIndex,
						`${header}_type`,
						language,
					);
					const normalizedType = declaredType
						.trim()
						.toLowerCase()
						.replace(/[\s_&-]/g, '');
					const existingType = declaredPropertyTypes.get(header);
					if (
						declaredPropertyTypes.has(header) &&
						existingType !== normalizedType
					) {
						throw new Error(
							translate(language, 'error.inconsistentPropertyType', {
								column: header,
							}),
						);
					}
					declaredPropertyTypes.set(header, normalizedType);
					const result = serializeTypedCell(value, declaredType);
					if (!result.ok) {
						const translationKey =
							result.reason === 'unsupported-type'
								? 'error.unsupportedPropertyType'
								: 'error.invalidTypedValue';
						throw new Error(
							translate(language, translationKey, {
								column: header,
								type: result.type,
								value: result.value,
							}),
						);
					}
					serializedValue = result.yaml;
				}
				const propertyName =
					header.toLowerCase() === 'tags' ? 'tags' : header;
				return `${JSON.stringify(propertyName)}: ${serializedValue}`;
			});
		if (tagsColumn === -1) {
			properties.push(`"tags": ${JSON.stringify(tags)}`);
		}

		let filename = sanitizedName;
		let suffix = 2;
		while (
			reservedNames.has(filename.toLowerCase()) ||
			app.vault.getAbstractFileByPath(
				`${folderPath ? `${folderPath}/` : ''}${filename}.md`,
			) !== null
		) {
			filename = `${sanitizedName}_${suffix}`;
			suffix++;
		}
		reservedNames.add(filename.toLowerCase());
		const noteContent = properties.length
			? `---\n${properties.join('\n')}\n---\n${content}`
			: content;

		return {
			path: `${folderPath ? `${folderPath}/` : ''}${filename}.md`,
			filename,
			content: noteContent,
		};
	});

	const columns = [
		'file.name',
		...headers.filter(
			(header) =>
				header !== settings.fileNameColumn.trim() &&
				header !== 'content' &&
				!header.toLowerCase().endsWith('_type'),
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
	const baseContent = [
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
		if (baseEntry instanceof TFile) {
			const existingBaseContent = await app.vault.read(baseEntry);
			const existingViewsStart = existingBaseContent.indexOf('\nviews:');
			const generatedViewsStart = baseContent.indexOf('\nviews:');
			if (existingViewsStart === -1 || generatedViewsStart === -1) {
				throw new Error(translate(language, 'error.baseUpdateUnsupported'));
			}
			await app.vault.modify(
				baseEntry,
				`${baseContent.slice(0, generatedViewsStart)}\n${existingBaseContent.slice(existingViewsStart + 1)}`,
			);
		} else {
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

function getErrorMessage(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}

interface MarkdownTable {
	headers: string[];
	rows: string[][];
}
