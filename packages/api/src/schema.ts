/**
 * Database schema definitions and initialization
 */

import type { Database } from "./types";

/**
 * SQL schema for the leaderboard database
 */
export const SCHEMA = `
-- Organizers table
CREATE TABLE IF NOT EXISTS organizer (
    username                VARCHAR PRIMARY KEY COLLATE NOCASE,
    name                    VARCHAR,
    title                   VARCHAR,
    avatar_url              VARCHAR,
    bio                     TEXT,
    joining_date            DATE,
    meta                    JSON
);

-- Race definitions table (populated by plugins)
CREATE TABLE IF NOT EXISTS race_definition (
    slug                    VARCHAR PRIMARY KEY,
    name                    VARCHAR NOT NULL,
    description             TEXT NOT NULL,
    points                  SMALLINT,
    icon                    VARCHAR
);

-- Races table
CREATE TABLE IF NOT EXISTS race (
    slug                    VARCHAR PRIMARY KEY,
    organizer             VARCHAR REFERENCES organizer(username) NOT NULL,
    race_definition     VARCHAR REFERENCES race_definition(slug) NOT NULL,
    title                   VARCHAR,
    occurred_at              TIMESTAMP NOT NULL,
    link                    VARCHAR,
    text                    TEXT,
    points                  SMALLINT,
    meta                    JSON
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_race_occurred_at ON race(occurred_at);
CREATE INDEX IF NOT EXISTS idx_race_organizer ON race(organizer);
CREATE INDEX IF NOT EXISTS idx_race_definition ON race(race_definition);

-- Global aggregates table (org-level metrics)
CREATE TABLE IF NOT EXISTS global_aggregate (
    slug                    VARCHAR PRIMARY KEY,
    name                    VARCHAR NOT NULL,
    description             TEXT,
    value                   JSON NOT NULL,
    hidden                  BOOLEAN DEFAULT FALSE,
    meta                    JSON
);

-- Organizer aggregate definitions table
CREATE TABLE IF NOT EXISTS organizer_aggregate_definition (
    slug                    VARCHAR PRIMARY KEY,
    name                    VARCHAR NOT NULL,
    description             TEXT,
    hidden                  BOOLEAN DEFAULT FALSE
);

-- Organizer aggregates table (per-organizer metrics)
CREATE TABLE IF NOT EXISTS organizer_aggregate (
    aggregate               VARCHAR REFERENCES organizer_aggregate_definition(slug) NOT NULL,
    organizer             VARCHAR REFERENCES organizer(username) NOT NULL,
    value                   JSON NOT NULL,
    meta                    JSON,
    PRIMARY KEY (aggregate, organizer)
);

CREATE INDEX IF NOT EXISTS idx_organizer_aggregate_organizer ON organizer_aggregate(organizer);
CREATE INDEX IF NOT EXISTS idx_organizer_aggregate_aggregate ON organizer_aggregate(aggregate);

-- Badge definitions table
CREATE TABLE IF NOT EXISTS badge_definition (
    slug                    VARCHAR PRIMARY KEY,
    name                    VARCHAR NOT NULL,
    description             TEXT NOT NULL,
    variants                JSON NOT NULL
);

-- Organizer badges table (achievements earned by organizers)
CREATE TABLE IF NOT EXISTS organizer_badge (
    slug                    VARCHAR PRIMARY KEY,
    badge                   VARCHAR REFERENCES badge_definition(slug) NOT NULL,
    organizer             VARCHAR REFERENCES organizer(username) NOT NULL,
    variant                 VARCHAR NOT NULL,
    achieved_on             DATE NOT NULL,
    meta                    JSON
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_organizer_badge_unique ON organizer_badge(badge, organizer, variant);
CREATE INDEX IF NOT EXISTS idx_organizer_badge_organizer ON organizer_badge(organizer);
CREATE INDEX IF NOT EXISTS idx_organizer_badge_badge ON organizer_badge(badge);
CREATE INDEX IF NOT EXISTS idx_organizer_badge_achieved_on ON organizer_badge(achieved_on);
`;

/**
 * Initialize database with schema
 */
export async function initializeSchema(db: Database): Promise<void> {
  // Split schema into individual statements and execute
  const statements = SCHEMA.split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  for (const statement of statements) {
    await db.execute(statement + ";");
  }
}

/**
 * Clear all data from tables (useful for testing)
 */
export async function clearAllData(db: Database): Promise<void> {
  await db.execute("DELETE FROM organizer_badge");
  await db.execute("DELETE FROM badge_definition");
  await db.execute("DELETE FROM organizer_aggregate");
  await db.execute("DELETE FROM organizer_aggregate_definition");
  await db.execute("DELETE FROM global_aggregate");
  await db.execute("DELETE FROM race");
  await db.execute("DELETE FROM organizer");
  await db.execute("DELETE FROM race_definition");
}

/**
 * Drop all tables (useful for testing)
 */
export async function dropAllTables(db: Database): Promise<void> {
  await db.execute("DROP TABLE IF EXISTS organizer_badge");
  await db.execute("DROP TABLE IF EXISTS badge_definition");
  await db.execute("DROP TABLE IF EXISTS organizer_aggregate");
  await db.execute("DROP TABLE IF EXISTS organizer_aggregate_definition");
  await db.execute("DROP TABLE IF EXISTS global_aggregate");
  await db.execute("DROP TABLE IF EXISTS race");
  await db.execute("DROP TABLE IF EXISTS race_definition");
  await db.execute("DROP TABLE IF EXISTS organizer");
}
