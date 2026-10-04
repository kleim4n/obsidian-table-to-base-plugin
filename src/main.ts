import { Editor, Notice, Plugin, TFile } from 'obsidian';
import { convertTableToBase } from './conversion';
import { DEFAULT_SETTINGS, PluginSettings } from './settings';
import { PluginSettingTab } from './settingsTab';
import { translate } from './i18n';

export default class MarkdownTableToBasePlugin extends Plugin {
	settings: PluginSettings = DEFAULT_SETTINGS;

	async onload() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			(await this.loadData()) as Partial<PluginSettings>,
		);
		this.addSettingTab(new PluginSettingTab(this.app, this));
		this.addCommand({
			id: 'convert-table',
			name: translate(this.settings.language, 'command.paletteConvert'),
			callback: async () => {
				const activeEditor = this.app.workspace.activeEditor;
				if (!activeEditor?.editor || !activeEditor.file) {
					new Notice(
						translate(this.settings.language, 'notice.missingFile'),
					);
					return;
				}

				const tables = findTables(activeEditor.editor.getValue().split('\n'));
				if (tables.length === 0) {
					new Notice(translate(this.settings.language, 'notice.noTable'));
					return;
				}
				if (tables.length > 1) {
					new Notice(
						translate(this.settings.language, 'notice.multipleTables', {
							count: tables.length,
						}),
					);
					return;
				}

				await this.convertAndReplaceTable(
					activeEditor.editor,
					activeEditor.file,
					tables[0]!,
				);
			},
		});
		this.registerEvent(
			this.app.workspace.on('editor-menu', (menu, editor, info) => {
				const table = findTables(editor.getValue().split('\n')).find(
					(candidate) =>
						editor.getCursor().line >= candidate.startLine &&
						editor.getCursor().line <= candidate.endLine,
				);
				if (!table) {
					return;
				}

				menu.addItem((item) =>
					item
						.setTitle(translate(this.settings.language, 'command.convert'))
						.setIcon('database')
						.onClick(() =>
							info.file
								? this.convertAndReplaceTable(editor, info.file, table)
								: new Notice(
									translate(this.settings.language, 'notice.missingFile'),
								),
						),
				);
			}),
		);
	}

	private async convertAndReplaceTable(
		editor: Editor,
		file: TFile,
		table: MarkdownTable,
	): Promise<void> {
		try {
			const embed = await convertTableToBase(
				this.app,
				table,
				this.app.fileManager,
				file.basename,
				file.parent?.path ?? '',
				this.settings,
				this.settings.language,
			);
			editor.replaceRange(
				embed,
				{ line: table.startLine, ch: 0 },
				{
					line: table.endLine,
					ch: editor.getLine(table.endLine).length,
				},
			);
			new Notice(translate(this.settings.language, 'notice.success'));
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			new Notice(
				translate(this.settings.language, 'notice.failure', {
					error: message,
				}),
			);
		}
	}
}

function findTables(lines: string[]): MarkdownTable[] {
	const tables: MarkdownTable[] = [];
	for (let headerLine = 0; headerLine < lines.length - 1; headerLine++) {
		const headerText = lines[headerLine];
		const delimiterText = lines[headerLine + 1];
		if (headerText === undefined || delimiterText === undefined) {
			continue;
		}
		const headers = splitTableRow(headerText);
		const delimiters = splitTableRow(delimiterText);
		if (
			!headers ||
			!delimiters ||
			headers.length !== delimiters.length ||
			!delimiters.every((cell) => /^:?-{3,}:?$/.test(cell.trim()))
		) {
			continue;
		}

		let endLine = headerLine + 1;
		while (endLine + 1 < lines.length) {
			const nextLine = lines[endLine + 1];
			if (nextLine === undefined || !splitTableRow(nextLine)) {
				break;
			}
			endLine++;
		}
		const rows: string[][] = [];
		for (let rowLine = headerLine + 2; rowLine <= endLine; rowLine++) {
			const rowText = lines[rowLine];
			const row = rowText === undefined ? null : splitTableRow(rowText);
			if (!row) {
				rows.length = 0;
				break;
			}
			rows.push(row);
		}
		if (rows.length === endLine - headerLine - 1) {
			tables.push({ startLine: headerLine, endLine, headers, rows });
			headerLine = endLine;
		}
	}
	return tables;
}

function splitTableRow(line: string): string[] | null {
	const trimmed = line.trim();
	if (!trimmed.includes('|')) {
		return null;
	}

	const cells: string[] = [];
	const delimiters: number[] = [];
	let cellStart = 0;
	for (let index = 0; index < trimmed.length; index++) {
		if (trimmed.charAt(index) !== '|') {
			continue;
		}

		let backslashes = 0;
		for (
			let previous = index - 1;
			previous >= 0 && trimmed.charAt(previous) === '\\';
			previous--
		) {
			backslashes++;
		}
		if (backslashes % 2 === 1) {
			continue;
		}

		delimiters.push(index);
		cells.push(trimmed.slice(cellStart, index).trim());
		cellStart = index + 1;
	}
	cells.push(trimmed.slice(cellStart).trim());

	if (delimiters.length > 0 && delimiters[0] === 0) {
		cells.shift();
	}
	if (
		delimiters.length > 0 &&
		delimiters[delimiters.length - 1] === trimmed.length - 1
	) {
		cells.pop();
	}
	return cells.map((cell) => cell.replace(/\\\|/g, '|'));
}

interface MarkdownTable {
	startLine: number;
	endLine: number;
	headers: string[];
	rows: string[][];
}
