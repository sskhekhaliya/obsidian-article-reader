# Article Reader for Obsidian

Turn any web article into a clean, distraction-free markdown note in your Obsidian vault with browser-grade reader mode.

Powered by Mozilla's Readability engine (the same algorithm behind Firefox Reader View) and Turndown, **Article Reader** extracts the core text, images, code snippets, and structure of online articles—stripping away advertisements, popups, cookie banners, navigation menus, and sidebars.

---

## ✨ Features

- 📖 **Browser Reader Mode**: Automatically strips clutter, ads, navigation bars, and sponsors to isolate the core article content.
- 📚 **Reading Shelf Tracking**: Assigns reading status (`to-read`, `currently-reading`, `read`) in properties, selectable directly during fetching.
- 📂 **Target Folder Selection**: Choose or create a specific folder in your vault to store clipped articles (with real-time folder autocomplete).
- ⏱️ **Reading Time & Word Count**: Automatically estimates reading time and word count, stored cleanly in note properties.
- 🕒 **Obsidian Date & Time Types**: `published` and `clipped` are formatted in ISO 8601 so Obsidian natively recognizes them as date-time properties.
- 🏷️ **Native Properties**: Clean YAML frontmatter (`title`, `source`, `author`, `site`, `published`, `clipped`, `shelf`, `reading_time`, `tags: [reading/article]`).
- 📋 **Clipboard Auto-detection**: Automatically prefills web URLs from your clipboard or lets you clip instantly with a single shortcut.
- 🖼️ **Image & Link Resolution**: Resolves relative links and lazy-loaded images to absolute URLs so your notes render cleanly offline.
- 💻 **Syntax-Highlighted Code Blocks & Tables**: Converts code blocks with language detection and renders HTML tables as markdown tables.
- 🛡️ **Duplicate Prevention**: Intelligently increments file names (`Article (1).md`) to protect existing vault notes from being overwritten.
- 🎨 **Obsidian-Native UI**: Styled seamlessly for light and dark themes using Obsidian design tokens.

---

## 📝 Example Generated Note

```markdown
---
title: "Why Great Habits Compound"
source: "https://example.com/habits"
author: "Alex Morgan"
site: "Example Blog"
published: 2026-05-12T10:00:00
clipped: 2026-10-11T20:15:00
shelf: to-read
reading_time: "~6 min (1114 words)"
tags:
  - reading/article
---
Habits are the compound interest of self-improvement...
```

---

## 🚀 How to Use

### 1. Clip via Modal
1. Click the **book-open** icon on the left ribbon, or press `Ctrl/Cmd + P` and search for:
   `Article Reader: Clip article from URL`
2. Enter or paste the website link.
3. (Optional) Choose a destination folder, select a reading shelf (`to-read`, `currently-reading`, `read`), or edit the note title.
4. Click **Fetch & Save** (or press `Enter`).

### 2. Fast Clip from Clipboard
1. Copy any article link in your browser.
2. In Obsidian, run the command:
   `Article Reader: Clip article from clipboard URL`
3. The plugin will fetch and save the article in the background and open the note immediately!

---

## ⚙️ Settings

Go to **Settings** → **Article Reader**:

| Setting | Description | Default |
|---|---|---|
| **Article Folder** | The folder in your vault where articles are saved (with folder autocomplete) | `Articles` |
| **Create folder if missing** | Automatically creates vault directories if they don't already exist | `true` |
| **Default Shelf** | Default reading status assigned to properties (`to-read`, `currently-reading`, `read`) | `to-read` |
| **Note title format** | Pattern for note naming (`{{title}}`, `{{date}}`) | `{{title}}` |
| **Include YAML properties** | Adds frontmatter properties (title, source, author, site, published, clipped, shelf, reading_time, tags) | `true` |
| **Default tags** | Comma-separated tags added to properties | `reading/article` |
| **Include article summary** | Includes the excerpt or summary if detected by the reader mode | `false` |
| **Open note after saving** | Automatically opens the newly created note in an editor leaf | `true` |

---

## 📦 Development & Building

```bash
# Install dependencies
npm install

# Build production bundle
npm run build

# Type check
npm run check
```

---

## 📚 Support

If you find **Article Reader** helpful for your reading and note-taking workflow, consider buying me a book:

[![Buy Me a Book](https://img.shields.io/badge/Buy%20Me%20a%20Book-ffdd00?style=for-the-badge&logo=buy-me-a-coffee&logoColor=black)](https://buymeacoffee.com/sskhekhaliya)

---

## 📄 License & Credits

- **Author**: [SSKhekhaliya](https://www.sskhekhaliya.in/)
- **Support**: [buymeacoffee.com/sskhekhaliya](https://buymeacoffee.com/sskhekhaliya)
- **Engine**: Powered by [Mozilla Readability](https://github.com/mozilla/readability) and [Turndown](https://github.com/mixmark-io/turndown)
- Built with ❤️ for the [Obsidian](https://obsidian.md) community.
