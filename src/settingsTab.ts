import { App, PluginSettingTab as ObsidianPluginSettingTab, Setting } from 'obsidian';
import type MarkdownTableToBasePlugin from './main';
import { translate } from './i18n';

export class PluginSettingTab extends ObsidianPluginSettingTab {
	constructor(app: App, private plugin: MarkdownTableToBasePlugin) {
		super(app, plugin);
	}

	display(): void {
		const { containerEl } = this;
		const language = this.plugin.settings.language;
		const t = (key: Parameters<typeof translate>[1]) =>
			translate(language, key);
		containerEl.empty();
		containerEl.createEl('h2', { text: t('settings.title') });

		new Setting(containerEl)
			.setName(t('settings.language.name'))
			.setDesc(t('settings.language.desc'))
			.addDropdown((dropdown) =>
				dropdown
					.addOption('', t('settings.language.auto'))
					.addOption('en', t('settings.language.en'))
					.addOption('pt', t('settings.language.pt'))
					.setValue(language === 'en' || language === 'pt' ? language : '')
					.onChange(async (value) => {
						this.plugin.settings.language = value;
						await this.plugin.saveData(this.plugin.settings);
						this.display();
					}),
			);

		new Setting(containerEl)
			.setName(t('settings.outputFolder.name'))
			.setDesc(t('settings.outputFolder.desc'))
			.addText((text) =>
				text
					.setValue(this.plugin.settings.outputFolder)
					.onChange(async (value) => {
						this.plugin.settings.outputFolder = value;
						await this.plugin.saveData(this.plugin.settings);
					}),
			);

		new Setting(containerEl)
			.setName(t('settings.fileNameColumn.name'))
			.setDesc(t('settings.fileNameColumn.desc'))
			.addText((text) =>
				text
					.setValue(this.plugin.settings.fileNameColumn)
					.onChange(async (value) => {
						this.plugin.settings.fileNameColumn = value;
						await this.plugin.saveData(this.plugin.settings);
					}),
			);

		new Setting(containerEl)
			.setName(t('settings.baseTag.name'))
			.setDesc(t('settings.baseTag.desc'))
			.addText((text) =>
				text
					.setPlaceholder(t('settings.baseTag.placeholder'))
					.setValue(this.plugin.settings.baseTag)
					.onChange(async (value) => {
						this.plugin.settings.baseTag = value;
						await this.plugin.saveData(this.plugin.settings);
					}),
			);

		new Setting(containerEl)
			.setName(t('settings.allowEmptyColumns.name'))
			.setDesc(t('settings.allowEmptyColumns.desc'))
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.allowEmptyColumns)
					.onChange(async (value) => {
						this.plugin.settings.allowEmptyColumns = value;
						await this.plugin.saveData(this.plugin.settings);
					}),
			);
	}
}
