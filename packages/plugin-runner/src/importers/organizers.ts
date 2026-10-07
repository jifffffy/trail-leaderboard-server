/**
 * Import organizers from markdown files
 */

import type { Database, Logger } from "@starter/leaderboard-api";
import { organizerQueries } from "@starter/leaderboard-api";
import { readdir, readFile } from "fs/promises";
import matter from "gray-matter";
import { join } from "path";

/**
 * Import all organizers from markdown files
 */
export async function importOrganizers(
  db: Database,
  dataDir: string,
  logger: Logger,
): Promise<number> {
  const organizersDir = join(dataDir, "organizers");

  try {
    const files = await readdir(organizersDir);
    const markdownFiles = files.filter((f) => f.endsWith(".md"));

    logger.info(`Found ${markdownFiles.length} organizer files`);

    let imported = 0;

    for (const file of markdownFiles) {
      try {
        const filePath = join(organizersDir, file);
        const content = await readFile(filePath, "utf-8");
        const organizer = {
          username: file.replace(".md", ""),
          ...parseOrganizerMarkdown(content),
        };

        await organizerQueries.upsert(db, organizer);
        imported++;
        logger.debug(`Imported organizer: ${organizer.username}`);
      } catch (error) {
        logger.warn(`Failed to import organizer from ${file}`, {
          error: (error as Error).message,
        });
      }
    }

    logger.info(`Imported ${imported} organizers`);
    return imported;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      logger.warn("Organizers directory not found, skipping import");
      return 0;
    }
    throw error;
  }
}

/**
 * Parse organizer markdown file with frontmatter
 */
function parseOrganizerMarkdown(content: string) {
  const { data, content: bio } = matter(content);

  return {
    name: data.name || null,
    title: data.title || null,
    avatar_url: data.avatar_url || null,
    bio: bio.trim() || null,
    joining_date: data.joining_date || null,
    meta: data.meta || null,
  };
}
