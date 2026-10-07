/**
 * Load and validate race article files from the data repo.
 *
 * Convention: one file per event under `<dataDir>/<articlesDir>/`, either
 * `.md`, `.markdown`, or `.txt`. All data live in YAML frontmatter (see
 * `schema.ts`); the body is free-form article text kept as provenance.
 */

import { getDataDir } from "@starter/leaderboard-api";
import { access, readdir, readFile } from "fs/promises";
import matter from "gray-matter";
import yaml from "js-yaml";
import path from "path";
import { RaceArticleSchema, type RaceArticle } from "./schema";

const ARTICLE_EXTENSIONS = new Set([".md", ".markdown", ".txt"]);

/**
 * Parse frontmatter with JSON_SCHEMA so unquoted dates like `2026-11-08` stay
 * strings instead of being coerced into Date objects.
 */
const parseYaml = (source: string): Record<string, unknown> =>
  yaml.load(source, { schema: yaml.JSON_SCHEMA }) as Record<string, unknown>;

export interface LoadedArticle {
  filePath: string;
  article: RaceArticle;
  /** Raw article body, used as race provenance text. */
  body: string;
}

export interface ArticleLoadError {
  filePath: string;
  message: string;
}

export interface LoadArticlesResult {
  articles: LoadedArticle[];
  errors: ArticleLoadError[];
  /**
   * Whether the article directory exists. When it does not, the plugin leaves
   * its existing data untouched (a missing dir is treated as misconfiguration,
   * not as an empty corpus).
   */
  found: boolean;
}

/**
 * Resolve the article directory: absolute paths are used as-is, relative paths
 * resolve against the data dir.
 */
export function resolveArticlesDir(articlesDir: string): string {
  return path.isAbsolute(articlesDir)
    ? articlesDir
    : path.join(getDataDir(), articlesDir);
}

/**
 * Recursively load and validate all article files under `dir`. Returns an empty
 * result when the directory does not exist, so a missing corpus is a no-op
 * rather than an error.
 */
export async function loadArticles(dir: string): Promise<LoadArticlesResult> {
  if (!(await directoryExists(dir))) {
    return { articles: [], errors: [], found: false };
  }

  const files = await listArticleFiles(dir);
  const articles: LoadedArticle[] = [];
  const errors: ArticleLoadError[] = [];

  for (const filePath of files) {
    try {
      const content = await readFile(filePath, "utf8");
      const { data, content: body } = matter(content, {
        engines: { yaml: parseYaml },
      });
      const parsed = RaceArticleSchema.safeParse(data);

      if (!parsed.success) {
        errors.push({
          filePath,
          message: parsed.error.issues
            .map(
              (issue) => `${issue.path.join(".") || "root"}: ${issue.message}`,
            )
            .join("; "),
        });
        continue;
      }

      articles.push({ filePath, article: parsed.data, body: body.trim() });
    } catch (error) {
      errors.push({ filePath, message: (error as Error).message });
    }
  }

  return { articles, errors, found: true };
}

async function directoryExists(dir: string): Promise<boolean> {
  try {
    await access(dir);
    return true;
  } catch {
    return false;
  }
}

async function listArticleFiles(dir: string): Promise<string[]> {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }

  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listArticleFiles(fullPath)));
    } else if (ARTICLE_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
      files.push(fullPath);
    }
  }
  return files.sort();
}
