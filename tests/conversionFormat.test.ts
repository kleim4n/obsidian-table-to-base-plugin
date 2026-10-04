import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
	formatDatePatterns,
	mapTypeColumns,
	serializeTypedCell,
} from '../src/conversionFormat';

describe('mapTypeColumns', () => {
	it('maps type declarations to their properties', () => {
		assert.deepEqual(
			mapTypeColumns(['name', 'feito', 'feito_type', 'content']),
			{ columns: new Map([['feito', 2]]) },
		);
	});

	it('reports declarations without a matching property', () => {
		assert.deepEqual(mapTypeColumns(['name', 'feito_type', 'content']), {
			columns: new Map(),
			orphanColumn: 'feito_type',
		});
	});
});

describe('formatDatePatterns', () => {
	it('formats one or more current-date tokens', () => {
		assert.equal(
			formatDatePatterns(
				'{{date:YYYY}}/{{date:MM}}/Activity {{date:DD}}',
				(pattern) =>
					({
						YYYY: '2026',
						MM: '10',
						DD: '04',
					})[pattern] ?? pattern,
			),
			'2026/10/Activity 04',
		);
	});

	it('leaves incomplete tokens unchanged', () => {
		assert.equal(
			formatDatePatterns('{{date:YYYY', () => '2026'),
			'{{date:YYYY',
		);
	});
});

describe('serializeTypedCell', () => {
	for (const type of ['bool', 'boolean', 'checkbox', 'check box']) {
		it(`serializes ${type} values as checkbox YAML`, () => {
			assert.deepEqual(serializeTypedCell('false', type), {
				ok: true,
				yaml: 'false',
			});
		});
	}

	it('preserves null as a YAML null for checkbox properties', () => {
		assert.deepEqual(serializeTypedCell('null', 'bool'), {
			ok: true,
			yaml: 'null',
		});
	});

	it('serializes numbers as numeric YAML values', () => {
		assert.deepEqual(serializeTypedCell('12.5', 'number'), {
			ok: true,
			yaml: '12.5',
		});
	});

	it('serializes comma-separated list values as a YAML list', () => {
		assert.deepEqual(serializeTypedCell('red, blue', 'list'), {
			ok: true,
			yaml: '["red","blue"]',
		});
	});

	it('preserves mixed strings and numbers in JSON list values', () => {
		assert.deepEqual(serializeTypedCell('["red", 4]', 'list'), {
			ok: true,
			yaml: '["red",4]',
		});
	});

	it('serializes ISO dates as text scalars recognized as Obsidian dates', () => {
		assert.deepEqual(serializeTypedCell('2026-10-04', 'date'), {
			ok: true,
			yaml: '"2026-10-04"',
		});
	});

	it('accepts the Obsidian date-and-time property type', () => {
		assert.deepEqual(serializeTypedCell('2026-10-04T09:30:00', 'date & time'), {
			ok: true,
			yaml: '"2026-10-04T09:30:00"',
		});
	});

	it('rejects impossible calendar dates', () => {
		assert.deepEqual(serializeTypedCell('2026-02-31', 'date'), {
			ok: false,
			reason: 'invalid-value',
			type: 'date',
			value: '2026-02-31',
		});
	});

	it('rejects values that do not match the declared type', () => {
		assert.deepEqual(serializeTypedCell('maybe', 'checkbox'), {
			ok: false,
			reason: 'invalid-value',
			type: 'checkbox',
			value: 'maybe',
		});
	});

	it('rejects unsupported types', () => {
		assert.deepEqual(serializeTypedCell('value', 'currency'), {
			ok: false,
			reason: 'unsupported-type',
			type: 'currency',
			value: 'value',
		});
	});
});
