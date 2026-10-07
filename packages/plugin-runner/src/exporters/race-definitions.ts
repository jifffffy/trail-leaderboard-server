/**
 * Export race definitions to data directory
 */

import type { Database, Logger } from "@starter/leaderboard-api";
import { raceDefinitionQueries } from "@starter/leaderboard-api";
import { mkdir, writeFile } from "fs/promises";
import { join } from "path";

/**
 * Export race definitions to races/definitions.json
 */
export async function exportRaceDefinitions(
  db: Database,
  dataDir: string,
  logger: Logger,
): Promise<void> {
  const racesDir = join(dataDir, "races");
  await mkdir(racesDir, { recursive: true });

  const definitions = await raceDefinitionQueries.getAll(db);
  const content = JSON.stringify(definitions, null, 2);

  await writeFile(join(racesDir, "definitions.json"), content, "utf-8");
  logger.info(`Exported ${definitions.length} race definitions`);
}
