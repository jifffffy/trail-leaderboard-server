/**
 * Import aggregates from data directory
 */

import type { Database, Logger } from "@starter/leaderboard-api";
import {
  globalAggregateQueries,
  organizerAggregateDefinitionQueries,
  organizerAggregateQueries,
} from "@starter/leaderboard-api";
import { readFile, readdir } from "fs/promises";
import { join } from "path";

/**
 * Import global aggregates from aggregates/global.json
 */
export async function importGlobalAggregates(
  db: Database,
  dataDir: string,
  logger: Logger,
): Promise<void> {
  const globalPath = join(dataDir, "aggregates", "global.json");

  try {
    const content = await readFile(globalPath, "utf-8");
    const aggregates = JSON.parse(content);

    if (!Array.isArray(aggregates)) {
      logger.warn("Global aggregates file is not an array");
      return;
    }

    for (const aggregate of aggregates) {
      await globalAggregateQueries.upsert(db, aggregate);
    }

    logger.info(`Imported ${aggregates.length} global aggregates`);
  } catch (error: any) {
    if (error.code === "ENOENT") {
      logger.debug("No global aggregates file found, skipping");
    } else {
      logger.error("Failed to import global aggregates", error);
    }
  }
}

/**
 * Import organizer aggregate definitions from aggregates/definitions.json
 */
export async function importOrganizerAggregateDefinitions(
  db: Database,
  dataDir: string,
  logger: Logger,
): Promise<void> {
  const definitionsPath = join(dataDir, "aggregates", "definitions.json");

  try {
    const content = await readFile(definitionsPath, "utf-8");
    const definitions = JSON.parse(content);

    if (!Array.isArray(definitions)) {
      logger.warn("Organizer aggregate definitions file is not an array");
      return;
    }

    for (const definition of definitions) {
      await organizerAggregateDefinitionQueries.upsert(db, definition);
    }

    logger.info(
      `Imported ${definitions.length} organizer aggregate definitions`,
    );
  } catch (error: any) {
    if (error.code === "ENOENT") {
      logger.debug("No organizer aggregate definitions file found, skipping");
    } else {
      logger.error("Failed to import organizer aggregate definitions", error);
    }
  }
}

/**
 * Import organizer aggregates from aggregates/organizers/*.jsonl
 */
export async function importOrganizerAggregates(
  db: Database,
  dataDir: string,
  logger: Logger,
): Promise<void> {
  const organizersDir = join(dataDir, "aggregates", "organizers");

  try {
    const files = await readdir(organizersDir);
    const jsonlFiles = files.filter((f) => f.endsWith(".jsonl"));

    let totalImported = 0;

    for (const file of jsonlFiles) {
      const filePath = join(organizersDir, file);
      const content = await readFile(filePath, "utf-8");
      const lines = content.trim().split("\n").filter(Boolean);

      for (const line of lines) {
        try {
          const aggregate = JSON.parse(line);
          await organizerAggregateQueries.upsert(db, aggregate);
          totalImported++;
        } catch (error) {
          logger.error(
            `Failed to import organizer aggregate from ${file}`,
            error as Error,
          );
        }
      }
    }

    logger.info(
      `Imported ${totalImported} organizer aggregates from ${jsonlFiles.length} files`,
    );
  } catch (error: any) {
    if (error.code === "ENOENT") {
      logger.debug("No organizer aggregates directory found, skipping");
    } else {
      logger.error("Failed to import organizer aggregates", error);
    }
  }
}

/**
 * Import all aggregates
 */
export async function importAggregates(
  db: Database,
  dataDir: string,
  logger: Logger,
): Promise<void> {
  logger.info("Importing aggregates");
  await importGlobalAggregates(db, dataDir, logger);
  await importOrganizerAggregateDefinitions(db, dataDir, logger);
  await importOrganizerAggregates(db, dataDir, logger);
}
