/**
 * Export aggregates to data directory
 */

import type { Database, Logger } from "@starter/leaderboard-api";
import {
  globalAggregateQueries,
  organizerAggregateDefinitionQueries,
  organizerAggregateQueries,
} from "@starter/leaderboard-api";
import { mkdir, writeFile } from "fs/promises";
import { join } from "path";

/**
 * Export global aggregates to aggregates/global.json
 */
export async function exportGlobalAggregates(
  db: Database,
  dataDir: string,
  logger: Logger,
): Promise<void> {
  const aggregatesDir = join(dataDir, "aggregates");
  await mkdir(aggregatesDir, { recursive: true });

  const aggregates = await globalAggregateQueries.getAll(db);
  const content = JSON.stringify(aggregates, null, 2);

  await writeFile(join(aggregatesDir, "global.json"), content, "utf-8");
  logger.info(`Exported ${aggregates.length} global aggregates`);
}

/**
 * Export organizer aggregate definitions to aggregates/definitions.json
 */
export async function exportOrganizerAggregateDefinitions(
  db: Database,
  dataDir: string,
  logger: Logger,
): Promise<void> {
  const aggregatesDir = join(dataDir, "aggregates");
  await mkdir(aggregatesDir, { recursive: true });

  const definitions = await organizerAggregateDefinitionQueries.getAll(db);
  const content = JSON.stringify(definitions, null, 2);

  await writeFile(join(aggregatesDir, "definitions.json"), content, "utf-8");
  logger.info(`Exported ${definitions.length} organizer aggregate definitions`);
}

/**
 * Export organizer aggregates to aggregates/organizers/*.jsonl
 */
export async function exportOrganizerAggregates(
  db: Database,
  dataDir: string,
  logger: Logger,
): Promise<void> {
  const organizersDir = join(dataDir, "aggregates", "organizers");
  await mkdir(organizersDir, { recursive: true });

  const aggregates = await organizerAggregateQueries.getAll(db);

  // Group by organizer
  const byOrganizer = new Map<string, typeof aggregates>();
  for (const aggregate of aggregates) {
    if (!byOrganizer.has(aggregate.organizer)) {
      byOrganizer.set(aggregate.organizer, []);
    }
    byOrganizer.get(aggregate.organizer)!.push(aggregate);
  }

  // Write one file per organizer
  for (const [username, organizerAggregates] of byOrganizer) {
    const lines = organizerAggregates.map((a) => JSON.stringify(a)).join("\n");
    await writeFile(
      join(organizersDir, `${username}.jsonl`),
      lines + "\n",
      "utf-8",
    );
  }

  logger.info(
    `Exported ${aggregates.length} organizer aggregates for ${byOrganizer.size} organizers`,
  );
}

/**
 * Export all aggregates
 */
export async function exportAggregates(
  db: Database,
  dataDir: string,
  logger: Logger,
): Promise<void> {
  logger.info("Exporting aggregates");
  await exportGlobalAggregates(db, dataDir, logger);
  await exportOrganizerAggregateDefinitions(db, dataDir, logger);
  await exportOrganizerAggregates(db, dataDir, logger);
}
