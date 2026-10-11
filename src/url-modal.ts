import { App, Modal, Notice } from "obsidian";
import type ArticleReaderPlugin from "./main";
import { FolderSuggest } from "./folder-suggest";
import { ArticleData, ArticleShelf } from "./types";
import { fetchAndParseArticle } from "./parser";

export class ArticleUrlModal extends Modal {
  plugin: ArticleReaderPlugin;
  urlInputEl!: HTMLInputElement;
  folderInputEl!: HTMLInputElement;
  shelfSelectEl!: HTMLSelectElement;
  customTitleInputEl?: HTMLInputElement;
  previewContainerEl!: HTMLElement;
  statusEl!: HTMLElement;
  actionButtonsEl!: HTMLElement;
  fetchedArticle: ArticleData | null = null;
  isLoading = false;

  constructor(app: App, plugin: ArticleReaderPlugin) {
    super(app);
    this.plugin = plugin;
  }

  async onOpen(): Promise<void> {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass("article-reader-modal");

    // Modal Header
    contentEl.createEl("h2", {
      text: "Clip Article to Vault",
      cls: "article-reader-modal-title"
    });
    contentEl.createEl("p", {
      text: "Enter a web article link to parse it in reading mode and save it as a clean markdown note.",
      cls: "article-reader-modal-desc"
    });

    // Form Container
    const formEl = contentEl.createDiv({ cls: "article-reader-form" });

    // URL Field
    const urlGroup = formEl.createDiv({ cls: "article-reader-field-group" });
    urlGroup.createEl("label", { text: "Website Link / Article URL" });
    const urlInputWrap = urlGroup.createDiv({ cls: "article-reader-input-wrap" });

    this.urlInputEl = urlInputWrap.createEl("input", {
      type: "url",
      placeholder: "https://example.com/blog/article-name",
      cls: "article-reader-input"
    });

    const pasteBtn = urlInputWrap.createEl("button", {
      text: "Paste",
      cls: "article-reader-btn-secondary"
    });
    pasteBtn.addEventListener("click", async () => {
      try {
        const clipText = await navigator.clipboard.readText();
        if (clipText) {
          this.urlInputEl.value = clipText.trim();
          this.urlInputEl.focus();
        }
      } catch {
        new Notice("Unable to read from clipboard.");
      }
    });

    // Folder and Shelf in a 2-column or aligned row
    const rowEl = formEl.createDiv({ cls: "article-reader-form-row" });

    // Folder Field
    const folderGroup = rowEl.createDiv({ cls: "article-reader-field-group", attr: { style: "flex: 2;" } });
    folderGroup.createEl("label", { text: "Save in Folder" });
    const folderInputWrap = folderGroup.createDiv({ cls: "article-reader-input-wrap" });

    this.folderInputEl = folderInputWrap.createEl("input", {
      type: "text",
      placeholder: "Articles (or leave empty for vault root)",
      cls: "article-reader-input"
    });
    this.folderInputEl.value = this.plugin.settings.folderPath;
    new FolderSuggest(this.app, this.folderInputEl);

    // Shelf Field
    const shelfGroup = rowEl.createDiv({ cls: "article-reader-field-group", attr: { style: "flex: 1;" } });
    shelfGroup.createEl("label", { text: "Reading Shelf" });
    this.shelfSelectEl = shelfGroup.createEl("select", { cls: "article-reader-select" });

    const shelfOptions: { value: ArticleShelf; label: string }[] = [
      { value: "to-read", label: "To Read" },
      { value: "currently-reading", label: "Currently Reading" },
      { value: "read", label: "Read" }
    ];

    shelfOptions.forEach((opt) => {
      const optionEl = this.shelfSelectEl.createEl("option", {
        value: opt.value,
        text: opt.label
      });
      if (opt.value === this.plugin.settings.defaultShelf) {
        optionEl.selected = true;
      }
    });

    // Status Message / Spinner
    this.statusEl = contentEl.createDiv({ cls: "article-reader-status" });

    // Preview Container (Initially hidden)
    this.previewContainerEl = contentEl.createDiv({
      cls: "article-reader-preview-container"
    });
    this.previewContainerEl.style.display = "none";

    // Action Buttons
    this.actionButtonsEl = contentEl.createDiv({ cls: "article-reader-actions" });

    const cancelBtn = this.actionButtonsEl.createEl("button", {
      text: "Cancel",
      cls: "article-reader-btn-secondary"
    });
    cancelBtn.addEventListener("click", () => this.close());

    const fetchBtn = this.actionButtonsEl.createEl("button", {
      text: "Fetch & Save",
      cls: "mod-cta article-reader-btn-primary"
    });
    fetchBtn.addEventListener("click", () => this.handleFetchAndSave());

    // Allow Enter key to submit
    this.urlInputEl.addEventListener("keydown", (e: KeyboardEvent) => {
      if (e.key === "Enter" && !this.isLoading) {
        e.preventDefault();
        this.handleFetchAndSave();
      }
    });

    // Check if clipboard already contains a URL to prefill
    try {
      const clip = await navigator.clipboard.readText();
      const trimmed = clip ? clip.trim() : "";
      if (/^https?:\/\//i.test(trimmed)) {
        this.urlInputEl.value = trimmed;
      }
    } catch {
      // Ignore clipboard permission errors
    }

    // Auto-focus input
    setTimeout(() => {
      this.urlInputEl.focus();
      this.urlInputEl.select();
    }, 50);
  }

  private setStatus(text: string, isError = false): void {
    this.statusEl.empty();
    if (!text) return;

    if (isError) {
      this.statusEl.createEl("span", {
        text,
        cls: "article-reader-status-error"
      });
    } else {
      this.statusEl.createSpan({ cls: "article-reader-spinner" });
      this.statusEl.createSpan({ text: ` ${text}`, cls: "article-reader-status-info" });
    }
  }

  private async handleFetchAndSave(): Promise<void> {
    const rawUrl = this.urlInputEl.value.trim();
    if (!rawUrl) {
      this.setStatus("Please enter a website link.", true);
      this.urlInputEl.focus();
      return;
    }

    this.isLoading = true;
    this.setStatus("Fetching article in reader mode...");

    try {
      const article = await fetchAndParseArticle(rawUrl);
      this.fetchedArticle = article;
      this.renderPreview(article);

      const targetFolder = this.folderInputEl.value.trim();
      const selectedShelf = this.shelfSelectEl.value as ArticleShelf;
      const customTitle = this.customTitleInputEl?.value?.trim() || article.title;

      this.setStatus("Saving note to vault...");
      const savedFile = await this.plugin.saveArticleToVault(
        article,
        targetFolder,
        customTitle,
        selectedShelf
      );

      this.close();
      new Notice(`Article saved: ${savedFile.basename}`);
    } catch (err: unknown) {
      this.isLoading = false;
      const message = err instanceof Error ? err.message : String(err);
      this.setStatus(`Error: ${message}`, true);
    }
  }

  private renderPreview(article: ArticleData): void {
    this.previewContainerEl.empty();
    this.previewContainerEl.style.display = "block";

    const card = this.previewContainerEl.createDiv({ cls: "article-reader-card" });

    // Header info
    const metaRow = card.createDiv({ cls: "article-reader-card-meta" });
    if (article.siteName) {
      metaRow.createSpan({ text: article.siteName, cls: "article-reader-badge" });
    }
    metaRow.createSpan({
      text: `${article.readingTimeMinutes} min read (${article.wordCount} words)`,
      cls: "article-reader-badge-subtle"
    });
    if (article.byline) {
      metaRow.createSpan({
        text: `by ${article.byline}`,
        cls: "article-reader-badge-subtle"
      });
    }

    // Editable Title
    const titleGroup = card.createDiv({ cls: "article-reader-field-group" });
    titleGroup.createEl("label", { text: "Note Title" });
    this.customTitleInputEl = titleGroup.createEl("input", {
      type: "text",
      value: article.title,
      cls: "article-reader-input"
    });

    // Excerpt
    if (article.excerpt) {
      const excerptEl = card.createDiv({ cls: "article-reader-card-excerpt" });
      excerptEl.createEl("p", { text: article.excerpt });
    }
  }

  onClose(): void {
    const { contentEl } = this;
    contentEl.empty();
  }
}
