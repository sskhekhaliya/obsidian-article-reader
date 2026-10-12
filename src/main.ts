import { Notice, Plugin, TFile, TFolder, normalizePath } from "obsidian";
import { ArticleData, ArticleReaderSettings, ArticleShelf, DEFAULT_PROPERTIES, DEFAULT_SETTINGS } from "./types";
import { ArticleReaderSettingTab } from "./settings";
import { ArticleUrlModal } from "./url-modal";
import { fetchAndParseArticle, formatArticleNote, sanitizeFileName } from "./parser";

export default class ArticleReaderPlugin extends Plugin {
  settings: ArticleReaderSettings = DEFAULT_SETTINGS;

  async onload(): Promise<void> {
    await this.loadSettings();

    // Ribbon icon to clip an article
    this.addRibbonIcon("book-open", "Clip article from URL", () => {
      new ArticleUrlModal(this.app, this).open();
    });

    // Command: Open modal to enter URL
    this.addCommand({
      id: "clip-article-url",
      name: "Clip article from URL",
      callback: () => {
        new ArticleUrlModal(this.app, this).open();
      }
    });

    // Command: Fast clip directly from clipboard URL
    this.addCommand({
      id: "clip-article-from-clipboard",
      name: "Clip article from clipboard URL",
      callback: async () => {
        await this.clipFromClipboard();
      }
    });

    // Settings tab
    this.addSettingTab(new ArticleReaderSettingTab(this.app, this));
  }

  async loadSettings(): Promise<void> {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());

    if (!this.settings.properties || !Array.isArray(this.settings.properties) || this.settings.properties.length === 0) {
      this.settings.properties = JSON.parse(JSON.stringify(DEFAULT_PROPERTIES));
    } else {
      const existingFieldIds = new Set(this.settings.properties.map((p) => p.field));
      for (const defProp of DEFAULT_PROPERTIES) {
        if (!existingFieldIds.has(defProp.field)) {
          this.settings.properties.push({ ...defProp });
        }
      }
    }

    if (this.settings.defaultType === undefined) {
      this.settings.defaultType = "";
    }

    if (this.settings.frontmatterTags) {
      const tagList = this.settings.frontmatterTags
        .split(",")
        .map((t) => t.trim())
        .map((t) => (t === "article" ? "reading/article" : t));
      this.settings.frontmatterTags = Array.from(new Set(tagList)).join(", ");
    }
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }

  /**
   * Clips an article directly using the URL currently in clipboard.
   */
  async clipFromClipboard(): Promise<void> {
    let clipText = "";
    try {
      clipText = await navigator.clipboard.readText();
    } catch {
      new Notice("Unable to read URL from clipboard.");
      return;
    }

    const trimmed = (clipText || "").trim();
    if (!trimmed || !/^https?:\/\//i.test(trimmed)) {
      new Notice("Clipboard does not contain a valid web URL.");
      return;
    }

    const notice = new Notice(`Fetching article from clipboard URL...`, 0);
    try {
      const article = await fetchAndParseArticle(trimmed);
      article.shelf = this.settings.defaultShelf;
      notice.setMessage(`Saving "${article.title}" to vault...`);
      const file = await this.saveArticleToVault(article);
      notice.hide();
      new Notice(`Article saved: ${file.basename}`);
    } catch (err: unknown) {
      notice.hide();
      const message = err instanceof Error ? err.message : String(err);
      new Notice(`Article Reader Error: ${message}`, 5000);
    }
  }

  /**
   * Ensures the folder path exists in vault, creating missing directories if allowed.
   */
  async ensureFolderExists(folderPath: string): Promise<string> {
    const cleanPath = normalizePath(folderPath.trim());
    if (!cleanPath || cleanPath === "/" || cleanPath === ".") {
      return "";
    }

    const existingItem = this.app.vault.getAbstractFileByPath(cleanPath);
    if (existingItem instanceof TFolder) {
      return cleanPath;
    }

    if (!this.settings.createFolderIfMissing && !existingItem) {
      throw new Error(`Target folder "${cleanPath}" does not exist in vault.`);
    }

    // Recursively create folder segments if necessary
    const parts = cleanPath.split("/").filter(Boolean);
    let current = "";
    for (const part of parts) {
      current = current ? `${current}/${part}` : part;
      const file = this.app.vault.getAbstractFileByPath(current);
      if (!file) {
        await this.app.vault.createFolder(current);
      }
    }

    return cleanPath;
  }

  /**
   * Generates a unique markdown file path in the vault to prevent overwriting existing files.
   */
  getUniqueFilePath(folderPath: string, rawTitle: string): string {
    const cleanTitle = sanitizeFileName(rawTitle);
    const basePath = folderPath ? `${folderPath}/${cleanTitle}` : cleanTitle;
    let finalPath = `${basePath}.md`;

    let counter = 1;
    while (this.app.vault.getAbstractFileByPath(finalPath)) {
      finalPath = `${basePath} (${counter}).md`;
      counter++;
    }

    return finalPath;
  }

  /**
   * Saves a parsed article into vault as a markdown note.
   */
  async saveArticleToVault(
    article: ArticleData,
    folderOverride?: string,
    customTitle?: string,
    shelfOverride?: ArticleShelf | "",
    typesOverride?: string[],
    tagsOverride?: string[]
  ): Promise<TFile> {
    article.shelf =
      shelfOverride !== undefined
        ? shelfOverride
        : article.shelf !== undefined
          ? article.shelf
          : this.settings.defaultShelf;
    if (typesOverride !== undefined) {
      article.types = typesOverride;
    }
    if (tagsOverride !== undefined) {
      article.tags = tagsOverride;
    }

    const targetFolder =
      typeof folderOverride === "string" ? folderOverride : this.settings.folderPath;
    const folderPath = await this.ensureFolderExists(targetFolder);

    // Apply title template formatting
    const nowStr = new Date().toISOString().substring(0, 10);
    let resolvedTitle = customTitle || article.title;
    if (!customTitle && this.settings.titleFormat) {
      resolvedTitle = this.settings.titleFormat
        .replace(/\{\{title\}\}/gi, article.title)
        .replace(/\{\{date\}\}/gi, nowStr);
    }

    const uniquePath = this.getUniqueFilePath(folderPath, resolvedTitle);
    const noteContent = formatArticleNote(article, this.settings);

    // Create the note
    const createdFile = await this.app.vault.create(uniquePath, noteContent);

    // Open note in workspace leaf if configured
    if (this.settings.openAfterSave) {
      const leaf = this.app.workspace.getLeaf(false);
      await leaf.openFile(createdFile);
    }

    return createdFile;
  }
}
