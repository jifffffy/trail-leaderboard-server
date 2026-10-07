/**
 * Import race definitions from data directory
 */

import type { Database, Logger } from "@starter/leaderboard-api";
import { raceDefinitionQueries } from "@starter/leaderboard-api";
import { readFile } from "fs/promises";
import { join } from "path";

/**
 * Import race definitions from races/definitions.json
 */
export async function importRaceDefinitions(
  db: Database,
  dataDir: string,
  logger: Logger,
): Promise<void> {
  const definitionsPath = join(dataDir, "races", "definitions.json");

  try {
    const content = await readFile(definitionsPath, "utf-8");
    const definitions = JSON.parse(content);

    if (!Array.isArray(definitions)) {
      logger.warn("Race definitions file is not an array");
      return;
    }

    for (const definition of definitions) {
      await raceDefinitionQueries.upsert(db, definition);
    }

    logger.info(`Imported ${definitions.length} race definitions`);
  } catch (error: any) {
    if (error.code === "ENOENT") {
      logger.debug("No race definitions file found, skipping");
    } else {
      logger.error("Failed to import race definitions", error);
    }
  }
}
