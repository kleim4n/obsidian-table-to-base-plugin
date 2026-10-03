import { Notice, Plugin } from 'obsidian';
import { convertTableToBase } from './conversion';

export default class MarkdownTableToBasePlugin extends Plugin {
	async onload() {
		this.registerEvent(
			this.app.workspace.on('editor-menu', (menu, editor, info) => {
				const table = findTableAtLine(
					editor.getValue().split('\n'),
					editor.getCursor().line,
				);
				if (!table) {
					return;
				}

				menu.addItem((item) =>
					item
						.setTitle('Converter em Base+Notas')
						.setIcon('database')
						.onClick(async () => {
							const file = info.file;
							if (!file) {
								new Notice('Não foi possível identificar a nota atual.');
								return;
							}

							try {
								const embed = await convertTableToBase(
									this.app,
									table,
									file.basename,
								);
								editor.replaceRange(
									embed,
									{ line: table.startLine, ch: 0 },
									{
										line: table.endLine,
										ch: editor.getLine(table.endLine).length,
									},
								);
								new Notice('Tabela convertida em Base+Notas.');
							} catch (error) {
								const message =
									error instanceof Error
										? error.message
										: String(error);
								new Notice(`Falha ao converter a tabela: ${message}`);
							}
						}),
				);
			}),
		);
	}
}

function findTableAtLine(lines: string[], line: number): MarkdownTable | null {
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
		if (line < headerLine || line > endLine) {
			continue;
		}

		const rows: string[][] = [];
		for (let rowLine = headerLine + 2; rowLine <= endLine; rowLine++) {
			const rowText = lines[rowLine];
			const row = rowText === undefined ? null : splitTableRow(rowText);
			if (!row) {
				return null;
			}
			rows.push(row);
		}

		return { startLine: headerLine, endLine, headers, rows };
	}
	return null;
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
