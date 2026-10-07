/**
 * Export badges to data directory
 */

import type { Database, Logger } from "@starter/leaderboard-api";
import {
  badgeDefinitionQueries,
  organizerBadgeQueries,
} from "@starter/leaderboard-api";
import { mkdir, writeFile } from "fs/promises";
import { join } from "path";

/**
 * Export badge definitions to badges/definitions.json
 */
export async function exportBadgeDefinitions(
  db: Database,
  dataDir: string,
  logger: Logger,
): Promise<void> {
  const badgesDir = join(dataDir, "badges");
  await mkdir(badgesDir, { recursive: true });

  const definitions = await badgeDefinitionQueries.getAll(db);
  const content = JSON.stringify(definitions, null, 2);

  await writeFile(join(badgesDir, "definitions.json"), content, "utf-8");
  logger.info(`Exported ${definitions.length} badge definitions`);
}

/**
 * Export organizer badges to badges/organizers/*.jsonl
 */
export async function exportOrganizerBadges(
  db: Database,
  dataDir: string,
  logger: Logger,
): Promise<void> {
  const organizersDir = join(dataDir, "badges", "organizers");
  await mkdir(organizersDir, { recursive: true });

  const badges = await organizerBadgeQueries.getAll(db);

  // Group by organizer
  const byOrganizer = new Map<string, typeof badges>();
  for (const badge of badges) {
    if (!byOrganizer.has(badge.organizer)) {
      byOrganizer.set(badge.organizer, []);
    }
    byOrganizer.get(badge.organizer)!.push(badge);
  }

  // Write one file per organizer
  for (const [username, organizerBadges] of byOrganizer) {
    const lines = organizerBadges.map((b) => JSON.stringify(b)).join("\n");
    await writeFile(
      join(organizersDir, `${username}.jsonl`),
      lines + "\n",
      "utf-8",
    );
  }

  logger.info(
    `Exported ${badges.length} organizer badges for ${byOrganizer.size} organizers`,
  );
}

/**
 * Export all badges
 */
export async function exportBadges(
  db: Database,
  dataDir: string,
  logger: Logger,
): Promise<void> {
  logger.info("Exporting badges");
  await exportBadgeDefinitions(db, dataDir, logger);
  await exportOrganizerBadges(db, dataDir, logger);
}
