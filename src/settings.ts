import { App, Notice, PluginSettingTab, Setting, setIcon } from "obsidian";
import type ArticleReaderPlugin from "./main";
import { FolderSuggest } from "./folder-suggest";
import {
  ArticleShelf,
  DEFAULT_PROPERTIES,
  FrontmatterPropertyConfig
} from "./types";

export class ArticleReaderSettingTab extends PluginSettingTab {
  plugin: ArticleReaderPlugin;
  private activeTab: "general" | "properties" | "defaults" = "general";
  private draggedIndex: number | null = null;

  constructor(app: App, plugin: ArticleReaderPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl("h2", { text: "Article Reader Settings" });

    // Sub-tab Navigation
    const navBar = containerEl.createDiv({ cls: "ar-settings-nav-bar" });

    const tabs: { id: "general" | "properties" | "defaults"; label: string; icon: string }[] = [
      { id: "general", label: "General", icon: "settings" },
      { id: "properties", label: "Properties", icon: "tags" },
      { id: "defaults", label: "Defaults", icon: "sliders" }
    ];

    for (const tab of tabs) {
      const btn = navBar.createEl("button", {
        cls: `ar-settings-tab-btn ${this.activeTab === tab.id ? "is-active" : ""}`
      });
      const iconSpan = btn.createSpan({ cls: "ar-settings-tab-icon" });
      setIcon(iconSpan, tab.icon);
      btn.createSpan({ text: tab.label });

      btn.addEventListener("click", () => {
        this.activeTab = tab.id;
        this.display();
      });
    }

    const tabContent = containerEl.createDiv({ cls: "ar-settings-tab-content" });

    if (this.activeTab === "general") {
      this.renderGeneralTab(tabContent);
    } else if (this.activeTab === "properties") {
      this.renderPropertiesTab(tabContent);
    } else {
      this.renderDefaultsTab(tabContent);
    }
  }

  // ================= GENERAL TAB =================
  private renderGeneralTab(container: HTMLElement): void {
    container.createEl("h3", { text: "Storage & Vault Locations" });

    // Target Folder Setting
    new Setting(container)
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
    new Setting(container)
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

    container.createEl("h3", { text: "Note Templates & Formatting" });

    // Title format
    new Setting(container)
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

    // Include Frontmatter toggle
    new Setting(container)
      .setName("Include YAML properties (frontmatter)")
      .setDesc("Enable frontmatter properties on clipped notes. Manage which properties are enabled and their order in the Properties tab.")
      .addToggle((toggle) => {
        toggle
          .setValue(this.plugin.settings.includeFrontmatter)
          .onChange(async (value) => {
            this.plugin.settings.includeFrontmatter = value;
            await this.plugin.saveSettings();
          });
      });

    // Include Excerpt/Summary
    new Setting(container)
      .setName("Include article summary")
      .setDesc("Include an excerpt callout ([!summary]) at the top of the body if detected by reader mode.")
      .addToggle((toggle) => {
        toggle
          .setValue(this.plugin.settings.includeExcerpt)
          .onChange(async (value) => {
            this.plugin.settings.includeExcerpt = value;
            await this.plugin.saveSettings();
          });
      });

    container.createEl("h3", { text: "Editor Behavior" });

    // Open note after save
    new Setting(container)
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

  // ================= PROPERTIES TAB =================
  private renderPropertiesTab(container: HTMLElement): void {
    container.createEl("h3", { text: "Frontmatter Properties Manager" });
    const desc = container.createEl("p", { cls: "setting-item-description" });
    desc.setText(
      "Decide which frontmatter properties are included in your notes, what their YAML keys are, and what order they appear in. Drag rows to reorder them (whichever is placed first or last will be saved in that exact order). Default values for non-extracted properties can be customized in the Defaults tab."
    );

    if (!this.plugin.settings.properties) {
      this.plugin.settings.properties = JSON.parse(
        JSON.stringify(DEFAULT_PROPERTIES)
      );
    }

    const propList = container.createDiv({ cls: "ar-properties-list" });

    const fieldLabels: Record<string, string> = {
      title: "Article Title",
      source: "Article Source URL",
      author: "Author Name",
      site: "Site Name / Hostname",
      published: "Publication Date",
      clipped: "Clipped Date Time",
      shelf: "Reading Shelf",
      reading_time: "Reading Time (~X min)",
      type: "Type (Optional List entered during clipping)",
      tags: "Tags List",
      custom: "Custom Static Text"
    };

    // Render each property row
    this.plugin.settings.properties.forEach((prop, index) => {
      const row = propList.createDiv({ cls: "ar-prop-row" });
      row.setAttribute("draggable", "true");
      row.dataset.index = String(index);

      // Drag Handle
      const dragHandle = row.createSpan({
        cls: "ar-prop-drag-handle",
        title: "Drag to reorder"
      });
      setIcon(dragHandle, "grip-vertical");

      // Drag & Drop events
      row.addEventListener("dragstart", (e: DragEvent) => {
        this.draggedIndex = index;
        row.addClass("is-dragging");
        if (e.dataTransfer) {
          e.dataTransfer.effectAllowed = "move";
          e.dataTransfer.setData("text/plain", String(index));
        }
      });

      row.addEventListener("dragend", () => {
        this.draggedIndex = null;
        row.removeClass("is-dragging");
        propList.querySelectorAll(".ar-prop-row").forEach((el) => {
          el.removeClass("drag-over-top");
          el.removeClass("drag-over-bottom");
        });
      });

      row.addEventListener("dragover", (e: DragEvent) => {
        e.preventDefault();
        if (this.draggedIndex === null || this.draggedIndex === index) {
          return;
        }
        if (e.dataTransfer) {
          e.dataTransfer.dropEffect = "move";
        }
        const rect = row.getBoundingClientRect();
        const mid = rect.top + rect.height / 2;
        if (e.clientY < mid) {
          row.addClass("drag-over-top");
          row.removeClass("drag-over-bottom");
        } else {
          row.addClass("drag-over-bottom");
          row.removeClass("drag-over-top");
        }
      });

      row.addEventListener("dragleave", () => {
        row.removeClass("drag-over-top");
        row.removeClass("drag-over-bottom");
      });

      row.addEventListener("drop", async (e: DragEvent) => {
        e.preventDefault();
        row.removeClass("drag-over-top");
        row.removeClass("drag-over-bottom");

        if (this.draggedIndex === null || this.draggedIndex === index) {
          return;
        }

        const rect = row.getBoundingClientRect();
        const mid = rect.top + rect.height / 2;
        let targetIndex = e.clientY < mid ? index : index + 1;

        const fromIndex = this.draggedIndex;
        const [movedProp] = this.plugin.settings.properties.splice(fromIndex, 1);
        if (fromIndex < targetIndex) {
          targetIndex--;
        }
        this.plugin.settings.properties.splice(targetIndex, 0, movedProp);
        this.draggedIndex = null;
        await this.plugin.saveSettings();
        this.display();
      });

      // Enable/Disable toggle
      const toggle = row.createEl("input", {
        type: "checkbox",
        cls: "ar-prop-checkbox"
      });
      toggle.checked = prop.enabled;
      toggle.title = prop.enabled ? "Enabled" : "Disabled";
      toggle.addEventListener("change", async () => {
        prop.enabled = toggle.checked;
        await this.plugin.saveSettings();
      });

      // Key name input
      const keyInput = row.createEl("input", {
        type: "text",
        cls: "ar-prop-key-input",
        value: prop.key
      });
      keyInput.placeholder = "Property Key (e.g. type)";
      keyInput.addEventListener("change", async () => {
        prop.key = keyInput.value.trim() || prop.field;
        await this.plugin.saveSettings();
      });

      // Source field badge
      const fieldBadge = row.createSpan({ cls: "ar-prop-field-badge" });
      fieldBadge.setText(fieldLabels[prop.field] || prop.field);

      // Delete button
      const delBtn = row.createEl("button", {
        cls: "ar-prop-del-btn",
        title: "Delete property"
      });
      setIcon(delBtn, "trash-2");
      delBtn.addEventListener("click", async () => {
        this.plugin.settings.properties.splice(index, 1);
        await this.plugin.saveSettings();
        this.display();
      });
    });

    // Add New Property Card
    const addCard = container.createDiv({ cls: "ar-add-prop-card" });
    addCard.createEl("h4", { text: "Add Property" });

    const addControls = addCard.createDiv({ cls: "ar-add-prop-controls" });

    // Select Field
    const selectField = addControls.createEl("select", { cls: "ar-select" });
    const availableFields = [
      { id: "type", label: "Type (Optional List entered during clipping)" },
      { id: "shelf", label: "Reading Shelf" },
      { id: "title", label: "Article Title" },
      { id: "source", label: "Article Source URL" },
      { id: "author", label: "Author Name" },
      { id: "site", label: "Site Name / Hostname" },
      { id: "published", label: "Publication Date" },
      { id: "clipped", label: "Clipped Date Time" },
      { id: "reading_time", label: "Reading Time (~X min)" },
      { id: "tags", label: "Tags List" },
      { id: "custom", label: "Custom Static Text" }
    ];

    for (const af of availableFields) {
      selectField.createEl("option", { value: af.id, text: af.label });
    }

    const newKeyInput = addControls.createEl("input", {
      type: "text",
      placeholder: "Property key (e.g. type, category, label)",
      value: "type"
    });

    selectField.addEventListener("change", () => {
      newKeyInput.value = selectField.value;
    });

    const addBtn = addControls.createEl("button", {
      text: "Add Property",
      cls: "mod-cta"
    });

    addBtn.addEventListener("click", async () => {
      const field = selectField.value;
      const key = newKeyInput.value.trim() || field;

      const newProp: FrontmatterPropertyConfig = {
        id: `prop-${Date.now()}`,
        key,
        field,
        enabled: true,
        customValue: field === "custom" ? "article" : undefined
      };

      this.plugin.settings.properties.push(newProp);
      await this.plugin.saveSettings();
      new Notice(`Added property "${key}"`);
      this.display();
    });

    // Reset Defaults Button
    const resetRow = container.createDiv({ cls: "ar-prop-reset-row" });
    const resetBtn = resetRow.createEl("button", {
      text: "Reset Properties to Defaults",
      cls: "ar-reset-btn"
    });
    resetBtn.addEventListener("click", async () => {
      const ok = window.confirm(
        "Reset all frontmatter properties back to standard default fields?"
      );
      if (ok) {
        this.plugin.settings.properties = JSON.parse(
          JSON.stringify(DEFAULT_PROPERTIES)
        );
        await this.plugin.saveSettings();
        new Notice("Properties reset to defaults");
        this.display();
      }
    });
  }

  // ================= DEFAULTS TAB =================
  private renderDefaultsTab(container: HTMLElement): void {
    container.createEl("h3", { text: "Default Property Values" });
    const desc = container.createEl("p", { cls: "setting-item-description" });
    desc.setText(
      "Configure default values for properties that are not extracted automatically from the web page (such as reading shelf, type, tags, or custom text). If an enabled property is left empty during clipping, it will still appear in your note's frontmatter as an empty field."
    );

    // Default Shelf
    new Setting(container)
      .setName("Default Shelf")
      .setDesc("Default reading status assigned in properties when clipping an article.")
      .addDropdown((dropdown) => {
        dropdown
          .addOption("to-read", "To Read")
          .addOption("currently-reading", "Currently Reading")
          .addOption("read", "Read")
          .addOption("", "None (Empty)")
          .setValue(this.plugin.settings.defaultShelf)
          .onChange(async (value) => {
            this.plugin.settings.defaultShelf = value as ArticleShelf | "";
            await this.plugin.saveSettings();
          });
      });

    // Default Type / Label
    const typeProp = this.plugin.settings.properties?.find((p) => p.field === "type");
    const typeLabel = (typeProp?.key || "type").charAt(0).toUpperCase() + (typeProp?.key || "type").slice(1);

    new Setting(container)
      .setName(`Default ${typeLabel}`)
      .setDesc(`Default value for the ${typeLabel} property (comma-separated, e.g. article, guide). Leave empty for no default.`)
      .addText((text) => {
        text
          .setPlaceholder("e.g. article")
          .setValue(this.plugin.settings.defaultType || "")
          .onChange(async (value) => {
            this.plugin.settings.defaultType = value.trim();
            await this.plugin.saveSettings();
          });
      });

    // Default Tags
    new Setting(container)
      .setName("Default Tags")
      .setDesc("Base tags added to properties (without #, comma-separated, e.g. reading/article). Leave empty for no default tags.")
      .addText((text) => {
        text
          .setPlaceholder("reading/article")
          .setValue(this.plugin.settings.frontmatterTags)
          .onChange(async (value) => {
            this.plugin.settings.frontmatterTags = value;
            await this.plugin.saveSettings();
          });
      });

    // Custom Properties Defaults
    const customProps = this.plugin.settings.properties?.filter((p) => p.field === "custom") || [];
    if (customProps.length > 0) {
      container.createEl("h4", { text: "Custom Properties Defaults" });
      customProps.forEach((cp) => {
        new Setting(container)
          .setName(`Default Value: ${cp.key}`)
          .setDesc(`Static default value for custom property "${cp.key}".`)
          .addText((text) => {
            text
              .setPlaceholder("Value (e.g. article)")
              .setValue(cp.customValue || "")
              .onChange(async (val) => {
                cp.customValue = val;
                await this.plugin.saveSettings();
              });
          });
      });
    }
  }
}
