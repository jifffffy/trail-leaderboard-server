/**
 * Export organizers to markdown files
 */

import type { Database, Logger } from "@starter/leaderboard-api";
import { organizerQueries } from "@starter/leaderboard-api";
import { format } from "date-fns";
import { mkdir, writeFile } from "fs/promises";
import matter from "gray-matter";
import { join } from "path";

/**
 * Export all organizers to markdown files
 */
export async function exportOrganizers(
  db: Database,
  dataDir: string,
  logger: Logger,
): Promise<number> {
  const organizersDir = join(dataDir, "organizers");
  await mkdir(organizersDir, { recursive: true });

  const organizers = await organizerQueries.getAll(db);
  logger.info(`Exporting ${organizers.length} organizers`);

  for (const organizer of organizers) {
    const content = serializeOrganizerToMarkdown(organizer);
    const filePath = join(organizersDir, `${organizer.username}.md`);
    await writeFile(filePath, content, "utf-8");
    logger.debug(`Exported organizer: ${organizer.username}`);
  }

  logger.info(`Exported ${organizers.length} organizers`);
  return organizers.length;
}

/**
 * Serialize organizer to markdown with frontmatter
 */
function serializeOrganizerToMarkdown(organizer: any): string {
  const { username, bio, ...frontmatter } = organizer;

  // Remove null values from frontmatter
  const cleanFrontmatter: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(frontmatter)) {
    if (value !== null) {
      cleanFrontmatter[key] = value;
    }
    if (key === "joining_date" && value) {
      cleanFrontmatter[key] = format(value as string, "yyyy-MM-dd");
    }
  }

  return matter.stringify(bio || "", cleanFrontmatter);
}
