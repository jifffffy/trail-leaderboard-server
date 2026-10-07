/**
 * Import races from sharded JSONL files
 */

import type { Database, Logger, Race } from "@starter/leaderboard-api";
import { raceQueries } from "@starter/leaderboard-api";
import { readdir, readFile } from "fs/promises";
import { join } from "path";

/**
 * Import all races from JSONL files
 */
export async function importRaces(
  db: Database,
  dataDir: string,
  logger: Logger,
): Promise<number> {
  const racesDir = join(dataDir, "races", "organizers");

  try {
    const files = await readdir(racesDir);
    const jsonlFiles = files.filter((f) => f.endsWith(".jsonl"));

    logger.info(`Found ${jsonlFiles.length} race files`);

    let imported = 0;

    for (const file of jsonlFiles) {
      try {
        const filePath = join(racesDir, file);
        const races = await importRacesFromFile(filePath);
        await raceQueries.upsertMany(db, races);
        imported += races.length;
      } catch (error) {
        logger.warn(`Failed to import races from ${file}`, {
          error: (error as Error).message,
        });
      }
    }

    logger.info(`Imported ${imported} races`);
    return imported;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      logger.warn("Races organizers directory not found, skipping import");
      return 0;
    }
    throw error;
  }
}

/**
 * Get races from a single JSONL file
 */
async function importRacesFromFile(filePath: string): Promise<Race[]> {
  const content = await readFile(filePath, "utf-8");
  const races = content
    .split("\n")
    .filter((line) => line.trim())
    .map((line) => JSON.parse(line) as Race);
  return races;
}
