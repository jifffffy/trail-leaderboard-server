/**
 * Race importer tests
 */

import type { Database } from "@starter/leaderboard-api";
import {
  createDatabase,
  initializeSchema,
  organizerQueries,
  raceDefinitionQueries,
  raceQueries,
} from "@starter/leaderboard-api";
import { mkdir, rm, writeFile } from "fs/promises";
import { join } from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { importRaces } from "../../importers/races";
import { createLogger } from "../../logger";

const TEST_DATA_DIR = "./test-data-races";
const logger = createLogger(false);

describe("Race Importer", () => {
  let db: Database;

  beforeEach(async () => {
    db = createDatabase(":memory:");
    await initializeSchema(db);
    await mkdir(join(TEST_DATA_DIR, "races", "organizers"), {
      recursive: true,
    });

    // Set up test data
    await organizerQueries.upsert(db, {
      username: "alice",
      name: "Alice",
      title: null,
      avatar_url: null,
      bio: null,
      joining_date: null,
      meta: null,
    });

    await raceDefinitionQueries.insertOrIgnore(db, {
      slug: "pr_merged",
      name: "PR Merged",
      description: "PR merged",
      points: 10,
      icon: null,
    });
  });

  afterEach(async () => {
    await db.close();
    await rm(TEST_DATA_DIR, { recursive: true, force: true });
  });

  it("should import races from JSONL file", async () => {
    const races = [
      JSON.stringify({
        slug: "alice-pr-1",
        organizer: "alice",
        race_definition: "pr_merged",
        title: "Fix bug",
        occurred_at: "2024-01-01T10:00:00Z",
        link: "https://github.com/org/repo/pull/1",
        text: null,
        points: 10,
        meta: null,
      }),
      JSON.stringify({
        slug: "alice-pr-2",
        organizer: "alice",
        race_definition: "pr_merged",
        title: "Add feature",
        occurred_at: "2024-01-02T10:00:00Z",
        link: "https://github.com/org/repo/pull/2",
        text: null,
        points: 10,
        meta: null,
      }),
    ].join("\n");

    await writeFile(
      join(TEST_DATA_DIR, "races", "organizers", "alice.jsonl"),
      races + "\n",
      "utf-8",
    );

    const count = await importRaces(db, TEST_DATA_DIR, logger);
    expect(count).toBe(2);

    const imported = await raceQueries.getByOrganizer(db, "alice");
    expect(imported).toHaveLength(2);
    expect(imported[0].title).toBe("Add feature"); // Should be ordered by date DESC
  });

  it("should handle multiple JSONL files", async () => {
    await organizerQueries.upsert(db, {
      username: "bob",
      name: "Bob",
      title: null,
      avatar_url: null,
      bio: null,
      joining_date: null,
      meta: null,
    });

    const aliceRaces = [
      JSON.stringify({
        slug: "alice-pr-1",
        organizer: "alice",
        race_definition: "pr_merged",
        title: "Race 1",
        occurred_at: "2024-01-01T10:00:00Z",
        link: null,
        text: null,
        points: 10,
        meta: null,
      }),
    ].join("\n");

    const bobRaces = [
      JSON.stringify({
        slug: "bob-pr-1",
        organizer: "bob",
        race_definition: "pr_merged",
        title: "Race 2",
        occurred_at: "2024-01-01T10:00:00Z",
        link: null,
        text: null,
        points: 10,
        meta: null,
      }),
    ].join("\n");

    await writeFile(
      join(TEST_DATA_DIR, "races", "organizers", "alice.jsonl"),
      aliceRaces + "\n",
      "utf-8",
    );
    await writeFile(
      join(TEST_DATA_DIR, "races", "organizers", "bob.jsonl"),
      bobRaces + "\n",
      "utf-8",
    );

    const count = await importRaces(db, TEST_DATA_DIR, logger);
    expect(count).toBe(2);

    const allRaces = await raceQueries.getAll(db);
    expect(allRaces).toHaveLength(2);
  });

  it("should handle missing races directory", async () => {
    const emptyDir = "./test-data-empty";
    await mkdir(emptyDir, { recursive: true });

    const count = await importRaces(db, emptyDir, logger);
    expect(count).toBe(0);

    await rm(emptyDir, { recursive: true, force: true });
  });

  it("should skip files with invalid JSON lines", async () => {
    const content = [
      JSON.stringify({
        slug: "alice-pr-1",
        organizer: "alice",
        race_definition: "pr_merged",
        title: "Valid",
        occurred_at: "2024-01-01T10:00:00Z",
        link: null,
        text: null,
        points: 10,
        meta: null,
      }),
      "invalid json line",
      JSON.stringify({
        slug: "alice-pr-2",
        organizer: "alice",
        race_definition: "pr_merged",
        title: "Also valid",
        occurred_at: "2024-01-02T10:00:00Z",
        link: null,
        text: null,
        points: 10,
        meta: null,
      }),
    ].join("\n");

    await writeFile(
      join(TEST_DATA_DIR, "races", "organizers", "alice.jsonl"),
      content + "\n",
      "utf-8",
    );

    const count = await importRaces(db, TEST_DATA_DIR, logger);
    expect(count).toBe(0); // Entire file skipped due to invalid JSON
  });
});
