export interface PluginSettings {
	outputFolder: string;
	fileNameColumn: string;
	baseTag: string;
	allowEmptyColumns: boolean;
	language: string;
}

export const DEFAULT_SETTINGS: PluginSettings = {
	outputFolder: 'base_notes',
	fileNameColumn: 'name',
	baseTag: '',
	allowEmptyColumns: true,
	language: '',
};
