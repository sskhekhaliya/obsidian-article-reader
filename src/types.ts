export type ArticleShelf = "to-read" | "currently-reading" | "read";

export interface FrontmatterPropertyConfig {
  id: string;
  key: string;
  field: string;
  enabled: boolean;
  customValue?: string;
}

export const DEFAULT_PROPERTIES: FrontmatterPropertyConfig[] = [
  { id: "prop-title", key: "title", field: "title", enabled: true },
  { id: "prop-source", key: "source", field: "source", enabled: true },
  { id: "prop-author", key: "author", field: "author", enabled: true },
  { id: "prop-site", key: "site", field: "site", enabled: true },
  { id: "prop-published", key: "published", field: "published", enabled: true },
  { id: "prop-clipped", key: "clipped", field: "clipped", enabled: true },
  { id: "prop-shelf", key: "shelf", field: "shelf", enabled: true },
  { id: "prop-reading_time", key: "reading_time", field: "reading_time", enabled: true },
  { id: "prop-type", key: "type", field: "type", enabled: true },
  { id: "prop-tags", key: "tags", field: "tags", enabled: true }
];

export interface ArticleReaderSettings {
  folderPath: string;
  createFolderIfMissing: boolean;
  titleFormat: string;
  defaultShelf: ArticleShelf | "";
  defaultType: string;
  frontmatterTags: string;
  includeExcerpt: boolean;
  includeFrontmatter: boolean;
  openAfterSave: boolean;
  properties: FrontmatterPropertyConfig[];
}

export const DEFAULT_SETTINGS: ArticleReaderSettings = {
  folderPath: "Articles",
  createFolderIfMissing: true,
  titleFormat: "{{title}}",
  defaultShelf: "to-read",
  defaultType: "",
  frontmatterTags: "reading/article",
  includeExcerpt: false,
  includeFrontmatter: true,
  openAfterSave: true,
  properties: DEFAULT_PROPERTIES
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
  shelf?: ArticleShelf | "";
  types?: string[];
  tags?: string[];
}
