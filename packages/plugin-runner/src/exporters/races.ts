/**
 * Export races to sharded JSONL files
 */

import type { Database, Logger } from "@starter/leaderboard-api";
import { organizerQueries, raceQueries } from "@starter/leaderboard-api";
import { mkdir, writeFile } from "fs/promises";
import { join } from "path";

/**
 * Export all races to sharded JSONL files (one per organizer)
 */
export async function exportRaces(
  db: Database,
  dataDir: string,
  logger: Logger,
): Promise<number> {
  const racesDir = join(dataDir, "races", "organizers");
  await mkdir(racesDir, { recursive: true });

  const organizers = await organizerQueries.getAll(db);
  logger.info(`Exporting races for ${organizers.length} organizers`);

  let totalExported = 0;

  for (const organizer of organizers) {
    const races = await raceQueries.getRawByOrganizer(db, organizer.username);

    if (races.length === 0) {
      logger.debug(`No races for ${organizer.username}, skipping`);
      continue;
    }

    const content = races.map((a) => JSON.stringify(a)).join("\n") + "\n";
    const filePath = join(racesDir, `${organizer.username}.jsonl`);
    await writeFile(filePath, content, "utf-8");

    logger.debug(`Exported ${races.length} races for ${organizer.username}`);
    totalExported += races.length;
  }

  logger.info(`Exported ${totalExported} races`);
  return totalExported;
}
