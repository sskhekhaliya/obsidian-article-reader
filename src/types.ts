export type ArticleShelf = "to-read" | "currently-reading" | "read";

export interface ArticleReaderSettings {
  folderPath: string;
  createFolderIfMissing: boolean;
  titleFormat: string;
  defaultShelf: ArticleShelf;
  includeFrontmatter: boolean;
  frontmatterTags: string;
  includeExcerpt: boolean;
  openAfterSave: boolean;
}

export const DEFAULT_SETTINGS: ArticleReaderSettings = {
  folderPath: "Articles",
  createFolderIfMissing: true,
  titleFormat: "{{title}}",
  defaultShelf: "to-read",
  includeFrontmatter: true,
  frontmatterTags: "reading/article",
  includeExcerpt: false,
  openAfterSave: true
};

export interface ArticleData {
  title: string;
  byline?: string;
  excerpt?: string;
  siteName?: string;
  url: string;
  publishedTime?: string;
  contentMarkdown: string;
  readingTimeMinutes: number;
  wordCount: number;
  clippedAt: string;
  shelf?: ArticleShelf;
}
