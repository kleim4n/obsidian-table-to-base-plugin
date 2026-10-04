import { getLanguage } from 'obsidian';
import en from './locales/en.json';
import pt from './locales/pt.json';

type TranslationKey = keyof typeof en;
const locales: Record<'en' | 'pt', Record<TranslationKey, string>> = { en, pt };
type TranslationValues = Record<string, string | number>;

export function translate(
	language: string,
	key: TranslationKey,
	values: TranslationValues = {},
): string {
	const locale = resolveLanguage(language);
	const template = locales[locale][key];
	return template.replace(/\{\{(\w+)\}\}/g, (match, name: string) =>
		Object.prototype.hasOwnProperty.call(values, name)
			? String(values[name])
			: match,
	);
}

export function getLocaleCode(language: string): 'en' | 'pt' {
	const selectedLanguage = language || getLanguage();
	return selectedLanguage.toLowerCase().startsWith('pt') ? 'pt' : 'en';
}

function resolveLanguage(language: string): 'en' | 'pt' {
	return getLocaleCode(language);
}
