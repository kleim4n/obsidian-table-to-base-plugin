export type SerializedCell =
	| { ok: true; yaml: string }
	| {
		ok: false;
		reason: 'unsupported-type' | 'invalid-value';
		type: string;
		value: string;
	};

export function mapTypeColumns(
	headers: string[],
): { columns: Map<string, number>; orphanColumn?: string } {
	const columns = new Map<string, number>();
	for (const [index, header] of headers.entries()) {
		if (!header.toLowerCase().endsWith('_type')) {
			continue;
		}
		const propertyName = header.slice(0, -'_type'.length);
		if (!headers.includes(propertyName)) {
			return { columns, orphanColumn: header };
		}
		columns.set(propertyName, index);
	}
	return { columns };
}

export function formatDatePatterns(
	value: string,
	formatDate: (pattern: string) => string,
): string {
	return value.replace(/\{\{date:([^{}]+)\}\}/g, (_match, pattern: string) =>
		formatDate(pattern),
	);
}

export function serializeTypedCell(
	value: string,
	declaredType: string,
): SerializedCell {
	const type = declaredType
		.trim()
		.toLowerCase()
		.replace(/[\s_&-]/g, '');
	const normalizedValue = value.trim();

	if (type === 'text') {
		return { ok: true, yaml: JSON.stringify(value) };
	}
	if (type === 'list' || type === 'tags') {
		let list: (string | number)[] = [];
		if (normalizedValue.startsWith('[')) {
			try {
				const parsed: unknown = JSON.parse(normalizedValue);
				if (
					Array.isArray(parsed) &&
					parsed.every((item): item is string | number =>
						typeof item === 'string' || (type === 'list' && typeof item === 'number'),
					) &&
					(type === 'list' || parsed.every((item) => typeof item === 'string'))
				) {
					list = parsed;
				} else {
					return {
						ok: false,
						reason: 'invalid-value',
						type: declaredType,
						value,
					};
				}
			} catch {
				return {
					ok: false,
					reason: 'invalid-value',
					type: declaredType,
					value,
				};
			}
		} else if (normalizedValue) {
			list = normalizedValue.split(',').map((item) => item.trim());
		}
		return { ok: true, yaml: JSON.stringify(list) };
	}
	if (type === 'number') {
		if (!normalizedValue || normalizedValue.toLowerCase() === 'null') {
			return { ok: true, yaml: 'null' };
		}
		return /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:e[+-]?\d+)?$/i.test(normalizedValue) &&
				Number.isFinite(Number(normalizedValue))
			? { ok: true, yaml: normalizedValue }
			: { ok: false, reason: 'invalid-value', type: declaredType, value };
	}
	if (type === 'bool' || type === 'boolean' || type === 'checkbox') {
		const booleanValue = normalizedValue.toLowerCase();
		if (!booleanValue || booleanValue === 'null') {
			return { ok: true, yaml: 'null' };
		}
		if (booleanValue === 'true' || booleanValue === 'false') {
			return { ok: true, yaml: booleanValue };
		}
		return { ok: false, reason: 'invalid-value', type: declaredType, value };
	}
	if (type === 'date') {
		if (!normalizedValue || normalizedValue.toLowerCase() === 'null') {
			return { ok: true, yaml: 'null' };
		}
		const date = new Date(`${normalizedValue}T00:00:00Z`);
		return /^\d{4}-\d{2}-\d{2}$/.test(normalizedValue) &&
				!Number.isNaN(date.valueOf()) &&
				date.toISOString().slice(0, 10) === normalizedValue
			? { ok: true, yaml: JSON.stringify(normalizedValue) }
			: { ok: false, reason: 'invalid-value', type: declaredType, value };
	}
	if (type === 'datetime') {
		if (!normalizedValue || normalizedValue.toLowerCase() === 'null') {
			return { ok: true, yaml: 'null' };
		}
		const date = new Date(`${normalizedValue.slice(0, 10)}T00:00:00Z`);
		return /^\d{4}-\d{2}-\d{2}t\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:z|[+-]\d{2}:\d{2})?$/i.test(normalizedValue) &&
				!Number.isNaN(Date.parse(normalizedValue)) &&
				!Number.isNaN(date.valueOf()) &&
				date.toISOString().slice(0, 10) === normalizedValue.slice(0, 10)
			? { ok: true, yaml: JSON.stringify(normalizedValue) }
			: { ok: false, reason: 'invalid-value', type: declaredType, value };
	}

	return { ok: false, reason: 'unsupported-type', type: declaredType, value };
}
