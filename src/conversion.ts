import { App, TFile, TFolder } from 'obsidian';

const NOTES_FOLDER = 'base_notes';

export async function convertTableToBase(
	app: App,
	table: MarkdownTable,
	sourceBasename: string,
): Promise<string> {
	const headers = table.headers.map((header) => header.trim());
	const fileNameColumn = headers.indexOf('file_name');
	const contentColumn = headers.indexOf('file_content');

	if (fileNameColumn === -1 || contentColumn === -1) {
		throw new Error('A tabela precisa ter as colunas file_name e file_content.');
	}
	if (headers.some((header) => !header)) {
		throw new Error('Todos os cabeçalhos da tabela precisam ter um nome.');
	}
	if (new Set(headers).size !== headers.length) {
		throw new Error('A tabela não pode ter cabeçalhos duplicados.');
	}
	if (table.rows.some((row) => row.length !== headers.length)) {
		throw new Error('Todas as linhas da tabela precisam ter o mesmo número de colunas.');
	}

	const basePath = `${sourceBasename}_base.base`;
	const loadedFiles = app.vault.getAllLoadedFiles();
	const existingPaths = new Set(
		loadedFiles.map((file) => file.path.toLowerCase()),
	);
	if (existingPaths.has(basePath.toLowerCase())) {
		throw new Error(`O arquivo ${basePath} já existe.`);
	}

	const folderEntry = loadedFiles.find(
		(file) => file.path.toLowerCase() === NOTES_FOLDER.toLowerCase(),
	);
	if (folderEntry && !(folderEntry instanceof TFolder)) {
		throw new Error(`Já existe um arquivo chamado ${NOTES_FOLDER}.`);
	}
	if (folderEntry && folderEntry.path !== NOTES_FOLDER) {
		throw new Error(`Já existe uma pasta chamada ${folderEntry.path}.`);
	}

	const fileNames = new Set<string>();
	const generatedNotes = table.rows.map((row) => {
		const requestedName = sanitizeFileName(
			getCell(row, fileNameColumn, 'file_name'),
		);
		if (!requestedName) {
			throw new Error('A coluna file_name não pode conter valores vazios.');
		}

		const content = getCell(row, contentColumn, 'file_content');
		const frontmatter = headers
			.map((header, index) => ({ header, index }))
			.filter(
				({ header }) =>
					header !== 'file_name' && header !== 'file_content',
			)
			.map(
				({ header, index }) =>
					`${JSON.stringify(header)}: ${JSON.stringify(
						getCell(row, index, header),
					)}`,
			);
		const filename = getUniqueFileName(
			requestedName,
			fileNames,
			existingPaths,
		);
		const noteContent = frontmatter.length
			? `---\n${frontmatter.join('\n')}\n---\n${content}`
			: content;

		return {
			path: `${NOTES_FOLDER}/${filename}.md`,
			filename,
			content: noteContent,
		};
	});

	const baseContent = createBaseContent(
		headers,
		generatedNotes.map((note) => note.filename),
	);
	const createdFiles: TFile[] = [];
	let createdFolder = false;
	try {
		if (!folderEntry) {
			await app.vault.createFolder(NOTES_FOLDER);
			createdFolder = true;
		}
		for (const note of generatedNotes) {
			createdFiles.push(await app.vault.create(note.path, note.content));
		}
		createdFiles.push(await app.vault.create(basePath, baseContent));
	} catch (error) {
		const cleanupErrors: unknown[] = [];
		for (const file of createdFiles.reverse()) {
			try {
				await app.vault.delete(file);
			} catch (cleanupError) {
				cleanupErrors.push(cleanupError);
			}
		}
		if (createdFolder) {
			const folder = app.vault.getAbstractFileByPath(NOTES_FOLDER);
			if (folder instanceof TFolder && folder.children.length === 0) {
				try {
					await app.vault.delete(folder);
				} catch (cleanupError) {
					cleanupErrors.push(cleanupError);
				}
			}
		}
		if (cleanupErrors.length > 0) {
			throw new Error(
				`${getErrorMessage(error)} A limpeza dos arquivos parcialmente criados também falhou: ${cleanupErrors
					.map(getErrorMessage)
					.join('; ')}`,
			);
		}
		throw error;
	}

	return `![[${basePath}]]`;
}

function getCell(row: string[], index: number, columnName: string): string {
	const value = row[index];
	if (value === undefined) {
		throw new Error(`A linha não contém a coluna ${columnName}.`);
	}
	return value;
}

function getUniqueFileName(
	name: string,
	reservedNames: Set<string>,
	existingPaths: Set<string>,
): string {
	let candidate = name;
	let suffix = 2;
	while (
		reservedNames.has(candidate.toLowerCase()) ||
		existingPaths.has(`${NOTES_FOLDER}/${candidate}.md`.toLowerCase())
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

function getErrorMessage(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}

function createBaseContent(headers: string[], noteNames: string[]): string {
	const columns = [
		'file.name',
		...headers.filter(
			(header) => header !== 'file_name' && header !== 'file_content',
		),
	];
	const noteFilters = noteNames.length
		? noteNames.map((name) => {
				const path = `${NOTES_FOLDER}/${name}.md`;
				const expression = `file.path == ${JSON.stringify(path)}`;
				return `        - ${JSON.stringify(expression)}`;
			})
		: [`        - ${JSON.stringify('file.path == ""')}`];
	return [
		'filters:',
		'  and:',
		`    - file.inFolder(${JSON.stringify(NOTES_FOLDER)})`,
		'    - file.ext == "md"',
		'    - or:',
		...noteFilters,
		'views:',
		'  - type: table',
		'    name: Table',
		'    order:',
		...columns.map((column) => `      - ${JSON.stringify(column)}`),
		'',
	].join('\n');
}

interface MarkdownTable {
	headers: string[];
	rows: string[][];
}
