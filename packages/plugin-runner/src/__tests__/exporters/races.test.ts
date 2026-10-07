/**
 * Race exporter tests
 */

import type { Database } from "@starter/leaderboard-api";
import {
  createDatabase,
  initializeSchema,
  organizerQueries,
  raceDefinitionQueries,
  raceQueries,
} from "@starter/leaderboard-api";
import { mkdir, readFile, rm } from "fs/promises";
import { join } from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { exportRaces } from "../../exporters/races";
import { createLogger } from "../../logger";

const TEST_DATA_DIR = "./test-data-export-races";
const logger = createLogger(false);

describe("Race Exporter", () => {
  let db: Database;

  beforeEach(async () => {
    db = createDatabase(":memory:");
    await initializeSchema(db);
    await mkdir(TEST_DATA_DIR, { recursive: true });

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

  it("should export races to sharded JSONL files", async () => {
    await raceQueries.upsert(db, {
      slug: "alice-pr-1",
      organizer: "alice",
      race_definition: "pr_merged",
      title: "Fix bug",
      occurred_at: "2024-01-01T10:00:00Z",
      link: "https://github.com/org/repo/pull/1",
      text: null,
      points: 10,
      meta: null,
    });

    await raceQueries.upsert(db, {
      slug: "alice-pr-2",
      organizer: "alice",
      race_definition: "pr_merged",
      title: "Add feature",
      occurred_at: "2024-01-02T10:00:00Z",
      link: "https://github.com/org/repo/pull/2",
      text: null,
      points: 10,
      meta: null,
    });

    const count = await exportRaces(db, TEST_DATA_DIR, logger);
    expect(count).toBe(2);

    const content = await readFile(
      join(TEST_DATA_DIR, "races", "organizers", "alice.jsonl"),
      "utf-8",
    );
    const lines = content.trim().split("\n");

    expect(lines).toHaveLength(2);

    const races = lines.map((line) => JSON.parse(line));
    const slugs = races.map((a) => a.slug).sort();
    expect(slugs).toContain("alice-pr-1");
    expect(slugs).toContain("alice-pr-2");
  });

  it("should create separate files for each organizer", async () => {
    await organizerQueries.upsert(db, {
      username: "bob",
      name: "Bob",
      title: null,
      avatar_url: null,
      bio: null,
      joining_date: null,
      meta: null,
    });

    await raceQueries.upsert(db, {
      slug: "alice-pr-1",
      organizer: "alice",
      race_definition: "pr_merged",
      title: "Race 1",
      occurred_at: "2024-01-01T10:00:00Z",
      link: null,
      text: null,
      points: 10,
      meta: null,
    });

    await raceQueries.upsert(db, {
      slug: "bob-pr-1",
      organizer: "bob",
      race_definition: "pr_merged",
      title: "Race 2",
      occurred_at: "2024-01-01T10:00:00Z",
      link: null,
      text: null,
      points: 10,
      meta: null,
    });

    const count = await exportRaces(db, TEST_DATA_DIR, logger);
    expect(count).toBe(2);

    // Check both files exist
    const aliceContent = await readFile(
      join(TEST_DATA_DIR, "races", "organizers", "alice.jsonl"),
      "utf-8",
    );
    const bobContent = await readFile(
      join(TEST_DATA_DIR, "races", "organizers", "bob.jsonl"),
      "utf-8",
    );

    expect(aliceContent).toBeTruthy();
    expect(bobContent).toBeTruthy();
  });

  it("should skip organizers with no races", async () => {
    await organizerQueries.upsert(db, {
      username: "bob",
      name: "Bob",
      title: null,
      avatar_url: null,
      bio: null,
      joining_date: null,
      meta: null,
    });

    // Only add race for alice
    await raceQueries.upsert(db, {
      slug: "alice-pr-1",
      organizer: "alice",
      race_definition: "pr_merged",
      title: "Race",
      occurred_at: "2024-01-01T10:00:00Z",
      link: null,
      text: null,
      points: 10,
      meta: null,
    });

    const count = await exportRaces(db, TEST_DATA_DIR, logger);
    expect(count).toBe(1);

    // Check that only alice's file exists
    const aliceContent = await readFile(
      join(TEST_DATA_DIR, "races", "organizers", "alice.jsonl"),
      "utf-8",
    );
    expect(aliceContent).toBeTruthy();

    // Bob's file should not exist
    try {
      await readFile(
        join(TEST_DATA_DIR, "races", "organizers", "bob.jsonl"),
        "utf-8",
      );
      expect.fail("Bob's file should not exist");
    } catch (error) {
      expect((error as NodeJS.ErrnoException).code).toBe("ENOENT");
    }
  });
});
