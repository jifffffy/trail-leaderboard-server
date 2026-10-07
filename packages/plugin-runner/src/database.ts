/**
 * Database initialization for plugin runner
 */

import type { Database } from "@starter/leaderboard-api";
import {
  createDatabase,
  getDatabaseUrl,
  initializeSchema,
} from "@starter/leaderboard-api";

/**
 * Initialize database with schema
 */
export async function initDatabase(dataDir: string): Promise<Database> {
  const dbUrl = getDatabaseUrl(dataDir);
  const db = createDatabase(dbUrl);

  // Initialize schema
  await initializeSchema(db);

  return db;
}
