import { requestUrl } from "obsidian";
import { Readability } from "@mozilla/readability";
import TurndownService from "turndown";
import { ArticleData, ArticleReaderSettings } from "./types";

export function formatToIsoDateTime(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
}

export function parseToIsoDateTime(rawDateStr?: string | null): string | undefined {
  if (!rawDateStr) return undefined;
  const parsed = new Date(rawDateStr);
  if (!isNaN(parsed.getTime())) {
    return formatToIsoDateTime(parsed);
  }
  return rawDateStr;
}

export function normalizeUrl(rawUrl: string): string {
  let trimmed = rawUrl.trim();
  if (!trimmed) {
    throw new Error("URL cannot be empty.");
  }
  if (!/^https?:\/\//i.test(trimmed)) {
    trimmed = "https://" + trimmed;
  }
  try {
    const parsed = new URL(trimmed);
    return parsed.href;
  } catch {
    throw new Error(`Invalid URL format: "${rawUrl}"`);
  }
}

export function sanitizeFileName(name: string): string {
  // Disallowed characters in file systems and Obsidian: : / \ * ? " < > | # ^ [ ]
  let clean = name.replace(/[\\/:*?"<>|#^[\]]/g, "-");
  // Replace multiple dashes or spaces
  clean = clean.replace(/[\s\t\n]+/g, " ").replace(/-+/g, "-").trim();
  // Limit length to avoid path length limits
  if (clean.length > 120) {
    clean = clean.substring(0, 120).trim();
  }
  return clean || "Untitled Article";
}

function resolveRelativeUrls(doc: Document, baseUrl: string): void {
  // Handle <a> links
  const links = doc.querySelectorAll("a[href]");
  links.forEach((link) => {
    try {
      const raw = link.getAttribute("href");
      if (raw && !raw.startsWith("javascript:") && !raw.startsWith("mailto:")) {
        link.setAttribute("href", new URL(raw, baseUrl).href);
      }
    } catch {
      // Ignore invalid URL resolution
    }
  });

  // Handle <img> sources (including lazy-loaded data-src/data-original)
  const images = doc.querySelectorAll("img");
  images.forEach((img) => {
    try {
      const dataSrc =
        img.getAttribute("data-src") ||
        img.getAttribute("data-original") ||
        img.getAttribute("data-url");
      let src = img.getAttribute("src");
      if ((!src || src.startsWith("data:") || src.length < 10) && dataSrc) {
        src = dataSrc;
        img.setAttribute("src", dataSrc);
      }
      if (src && !src.startsWith("data:")) {
        img.setAttribute("src", new URL(src, baseUrl).href);
      }
    } catch {
      // Ignore
    }
  });
}

function createTurndownService(): TurndownService {
  const turndown = new TurndownService({
    headingStyle: "atx",
    hr: "---",
    bulletListMarker: "-",
    codeBlockStyle: "fenced",
    emDelimiter: "*"
  });

  // Keep code blocks with their detected language
  turndown.addRule("fencedCodeBlock", {
    filter: (node) => {
      return (
        node.nodeName === "PRE" &&
        (node.querySelector("code") !== null || node.children.length === 1)
      );
    },
    replacement: (_content, node) => {
      const el = node as HTMLElement;
      const codeEl = el.querySelector("code") || el;
      const className = codeEl.className || el.className || "";
      const langMatch = className.match(/(?:language-|lang-)([a-zA-Z0-9_-]+)/i);
      const lang = langMatch ? langMatch[1] : "";
      const text = codeEl.textContent || el.textContent || "";
      return `\n\n\`\`\`${lang}\n${text.replace(/\r\n/g, "\n").trim()}\n\`\`\`\n\n`;
    }
  });

  // Convert HTML tables into readable Markdown tables
  turndown.addRule("tableSupport", {
    filter: "table",
    replacement: (_content, node) => {
      const table = node as HTMLTableElement;
      const rows = Array.from(table.querySelectorAll("tr"));
      if (rows.length === 0) return "";

      const tableData: string[][] = [];
      let maxCols = 0;

      rows.forEach((row) => {
        const cells = Array.from(row.querySelectorAll("th, td"));
        const rowData = cells.map((cell) =>
          (cell.textContent || "").replace(/[\r\n\t]+/g, " ").replace(/\|/g, "\\|").trim()
        );
        if (rowData.length > maxCols) {
          maxCols = rowData.length;
        }
        tableData.push(rowData);
      });

      if (maxCols === 0 || tableData.length === 0) return "";

      tableData.forEach((row) => {
        while (row.length < maxCols) {
          row.push("");
        }
      });

      let md = "\n\n";
      // Header row
      const headerRow = tableData[0];
      md += `| ${headerRow.join(" | ")} |\n`;
      // Separator row
      md += `| ${headerRow.map(() => "---").join(" | ")} |\n`;

      // Body rows
      for (let i = 1; i < tableData.length; i++) {
        md += `| ${tableData[i].join(" | ")} |\n`;
      }
      md += "\n";
      return md;
    }
  });

  return turndown;
}

export async function fetchAndParseArticle(rawUrl: string): Promise<ArticleData> {
  const url = normalizeUrl(rawUrl);

  const response = await requestUrl({
    url,
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
      "Accept":
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9"
    }
  });

  if (response.status >= 400) {
    throw new Error(`Failed to fetch article: HTTP status ${response.status}`);
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(response.text, "text/html");

  // Resolve relative URLs to absolute
  resolveRelativeUrls(doc, url);

  // Extract metadata from meta tags if available
  const metaSiteName =
    doc.querySelector('meta[property="og:site_name"]')?.getAttribute("content") ||
    doc.querySelector('meta[name="application-name"]')?.getAttribute("content") ||
    new URL(url).hostname.replace(/^www\./, "");

  const metaAuthor =
    doc.querySelector('meta[name="author"]')?.getAttribute("content") ||
    doc.querySelector('meta[property="article:author"]')?.getAttribute("content");

  const metaPublishedTime =
    doc.querySelector('meta[property="article:published_time"]')?.getAttribute("content") ||
    doc.querySelector('meta[name="publication_date"]')?.getAttribute("content") ||
    doc.querySelector("time[datetime]")?.getAttribute("datetime");

  // Use Readability
  const reader = new Readability(doc);

  // Prevent Readability from erroneously deleting legitimate section headings (like H2/H3)
  // that happen to have words in common with the article title.
  // By default, Readability's _headerDuplicatesTitle checks H1 and H2 with a one-way token subset
  // comparison, marking any heading whose words appear in the title as 100% duplicate.
  const readerAny = reader as unknown as {
    _headerDuplicatesTitle: (node: Element) => boolean;
    _articleTitle?: string;
  };
  readerAny._headerDuplicatesTitle = function (node: Element): boolean {
    if (node.tagName !== "H1") {
      return false;
    }
    const heading = (node.textContent || "").trim().toLowerCase();
    const title = (this._articleTitle || "").trim().toLowerCase();
    if (!heading || !title) return false;
    if (heading === title) return true;
    const lengthRatio =
      Math.min(heading.length, title.length) / Math.max(heading.length, title.length);
    return lengthRatio > 0.8 && (heading.includes(title) || title.includes(heading));
  };

  const parsedArticle = reader.parse();

  let title = "";
  let byline = metaAuthor || undefined;
  let excerpt: string | undefined = undefined;
  let siteName = metaSiteName;
  let contentHtml = "";
  let textContent = "";

  if (parsedArticle && parsedArticle.content) {
    title = parsedArticle.title || doc.title || "Untitled Article";
    byline = parsedArticle.byline || metaAuthor || undefined;
    excerpt = parsedArticle.excerpt || undefined;
    siteName = parsedArticle.siteName || metaSiteName;
    contentHtml = parsedArticle.content;
    textContent = parsedArticle.textContent || "";
  } else {
    // Fallback: extract from <article>, <main>, or <body>
    title = doc.title || "Untitled Article";
    const bodyClone = (doc.querySelector("article") ||
      doc.querySelector("main") ||
      doc.body) as HTMLElement;

    if (!bodyClone) {
      throw new Error("Could not find any readable content on this page.");
    }

    bodyClone
      .querySelectorAll("script, style, noscript, nav, footer, header, aside, form, svg")
      .forEach((el) => el.remove());

    contentHtml = bodyClone.innerHTML;
    textContent = bodyClone.textContent || "";
  }

  // Convert HTML to Markdown
  const turndown = createTurndownService();
  let contentMarkdown = turndown.turndown(contentHtml).trim();

  // Clean excessive blank lines
  contentMarkdown = contentMarkdown.replace(/\n{3,}/g, "\n\n");

  const words = textContent.trim().split(/\s+/).filter(Boolean).length;
  const readingTimeMinutes = Math.max(1, Math.round(words / 200));

  const clippedAt = formatToIsoDateTime(new Date());
  const publishedTime = parseToIsoDateTime(metaPublishedTime);

  return {
    title: title.trim(),
    byline: byline?.trim(),
    excerpt: excerpt?.trim(),
    siteName: siteName?.trim(),
    url,
    publishedTime,
    contentMarkdown,
    readingTimeMinutes,
    wordCount: words,
    clippedAt
  };
}

export function formatArticleNote(
  article: ArticleData,
  settings: ArticleReaderSettings
): string {
  const parts: string[] = [];

  // Frontmatter Properties
  if (settings.includeFrontmatter) {
    parts.push("---");
    parts.push(`title: "${article.title.replace(/"/g, '\\"')}"`);
    parts.push(`source: "${article.url}"`);
    if (article.byline) {
      parts.push(`author: "${article.byline.replace(/"/g, '\\"')}"`);
    }
    if (article.siteName) {
      parts.push(`site: "${article.siteName.replace(/"/g, '\\"')}"`);
    }
    if (article.publishedTime) {
      parts.push(`published: ${article.publishedTime}`);
    }
    parts.push(`clipped: ${article.clippedAt}`);
    parts.push(`shelf: ${article.shelf || settings.defaultShelf}`);
    parts.push(
      `reading_time: "~${article.readingTimeMinutes} min (${article.wordCount} words)"`
    );

    if (settings.frontmatterTags && settings.frontmatterTags.trim()) {
      const tags = settings.frontmatterTags
        .split(",")
        .map((t) => t.trim().replace(/^#/, ""))
        .filter(Boolean)
        .map((t) => (t === "article" ? "reading/article" : t));
      
      const uniqueTags = Array.from(new Set(tags));
      if (uniqueTags.length > 0) {
        parts.push("tags:");
        uniqueTags.forEach((tag) => parts.push(`  - ${tag}`));
      }
    }
    parts.push("---");
  }

  // Optional Excerpt/Summary if configured
  if (settings.includeExcerpt && article.excerpt) {
    parts.push("> [!summary]");
    parts.push(`> ${article.excerpt}\n`);
  }

  // Main Article Body (No duplicate title heading in the body)
  const trimmedBody = (article.contentMarkdown || "").trim();
  if (trimmedBody) {
    parts.push(trimmedBody);
  }

  return parts.join("\n");
}

