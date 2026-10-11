import { App, PluginSettingTab, Setting } from "obsidian";
import type ArticleReaderPlugin from "./main";
import { FolderSuggest } from "./folder-suggest";
import { ArticleShelf } from "./types";

export class ArticleReaderSettingTab extends PluginSettingTab {
  plugin: ArticleReaderPlugin;

  constructor(app: App, plugin: ArticleReaderPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl("h2", { text: "Article Reader Settings" });

    // Target Folder Setting
    new Setting(containerEl)
      .setName("Article Folder")
      .setDesc("The vault folder where clipped articles will be saved. Start typing to see folder suggestions.")
      .addText((text) => {
        text
          .setPlaceholder("Articles")
          .setValue(this.plugin.settings.folderPath)
          .onChange(async (value) => {
            this.plugin.settings.folderPath = value.trim();
            await this.plugin.saveSettings();
          });
        new FolderSuggest(this.app, text.inputEl);
      });

    // Auto-create folder toggle
    new Setting(containerEl)
      .setName("Create folder if missing")
      .setDesc("Automatically create the folder in your vault if it doesn't already exist.")
      .addToggle((toggle) => {
        toggle
          .setValue(this.plugin.settings.createFolderIfMissing)
          .onChange(async (value) => {
            this.plugin.settings.createFolderIfMissing = value;
            await this.plugin.saveSettings();
          });
      });

    containerEl.createEl("h3", { text: "Reading Properties & Metadata" });

    // Default Shelf
    new Setting(containerEl)
      .setName("Default Shelf")
      .setDesc("Default reading status assigned to clipped articles in properties.")
      .addDropdown((dropdown) => {
        dropdown
          .addOption("to-read", "To Read")
          .addOption("currently-reading", "Currently Reading")
          .addOption("read", "Read")
          .setValue(this.plugin.settings.defaultShelf)
          .onChange(async (value) => {
            this.plugin.settings.defaultShelf = value as ArticleShelf;
            await this.plugin.saveSettings();
          });
      });

    // Title format
    new Setting(containerEl)
      .setName("Note title format")
      .setDesc("Pattern for the note title. Use {{title}} for the article title and {{date}} for YYYY-MM-DD.")
      .addText((text) => {
        text
          .setPlaceholder("{{title}}")
          .setValue(this.plugin.settings.titleFormat)
          .onChange(async (value) => {
            this.plugin.settings.titleFormat = value.trim() || "{{title}}";
            await this.plugin.saveSettings();
          });
      });

    // Include Frontmatter
    new Setting(containerEl)
      .setName("Include YAML properties (frontmatter)")
      .setDesc("Add properties (title, source, author, site, published, clipped, shelf, reading_time, tags) to the note.")
      .addToggle((toggle) => {
        toggle
          .setValue(this.plugin.settings.includeFrontmatter)
          .onChange(async (value) => {
            this.plugin.settings.includeFrontmatter = value;
            await this.plugin.saveSettings();
          });
      });

    // Frontmatter tags
    new Setting(containerEl)
      .setName("Default tags")
      .setDesc("Comma-separated list of tags to add to properties (e.g. reading/article).")
      .addText((text) => {
        text
          .setPlaceholder("reading/article")
          .setValue(this.plugin.settings.frontmatterTags)
          .onChange(async (value) => {
            this.plugin.settings.frontmatterTags = value;
            await this.plugin.saveSettings();
          });
      });

    // Include Excerpt/Summary
    new Setting(containerEl)
      .setName("Include article summary")
      .setDesc("Include an excerpt callout at the top of the body if detected by reader mode.")
      .addToggle((toggle) => {
        toggle
          .setValue(this.plugin.settings.includeExcerpt)
          .onChange(async (value) => {
            this.plugin.settings.includeExcerpt = value;
            await this.plugin.saveSettings();
          });
      });

    containerEl.createEl("h3", { text: "Behavior" });

    // Open note after save
    new Setting(containerEl)
      .setName("Open note after saving")
      .setDesc("Automatically open the newly created note in Obsidian after clipping.")
      .addToggle((toggle) => {
        toggle
          .setValue(this.plugin.settings.openAfterSave)
          .onChange(async (value) => {
            this.plugin.settings.openAfterSave = value;
            await this.plugin.saveSettings();
          });
      });
  }
}
