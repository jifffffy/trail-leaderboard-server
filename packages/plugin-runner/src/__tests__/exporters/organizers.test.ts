/**
 * Organizer exporter tests
 */

import type { Database } from "@starter/leaderboard-api";
import {
  createDatabase,
  initializeSchema,
  organizerQueries,
} from "@starter/leaderboard-api";
import { mkdir, readFile, rm } from "fs/promises";
import matter from "gray-matter";
import { join } from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { exportOrganizers } from "../../exporters/organizers";
import { createLogger } from "../../logger";

const TEST_DATA_DIR = "./test-data-export-organizers";
const logger = createLogger(false);

describe("Organizer Exporter", () => {
  let db: Database;

  beforeEach(async () => {
    db = createDatabase(":memory:");
    await initializeSchema(db);
    await mkdir(TEST_DATA_DIR, { recursive: true });
  });

  afterEach(async () => {
    await db.close();
    await rm(TEST_DATA_DIR, { recursive: true, force: true });
  });

  it("should export organizers to markdown files", async () => {
    await organizerQueries.upsert(db, {
      username: "alice",
      name: "Alice Smith",
      title: "Engineer",
      avatar_url: "https://example.com/alice.png",
      bio: "Alice is a software engineer.",
      joining_date: "2020-01-01",
      meta: { team: "backend" },
    });

    const count = await exportOrganizers(db, TEST_DATA_DIR, logger);
    expect(count).toBe(1);

    const content = await readFile(
      join(TEST_DATA_DIR, "organizers", "alice.md"),
      "utf-8",
    );
    const parsed = matter(content);

    expect(parsed.data.name).toBe("Alice Smith");
    expect(parsed.content.trim()).toBe("Alice is a software engineer.");
  });

  it("should export multiple organizers", async () => {
    await organizerQueries.upsert(db, {
      username: "alice",
      name: "Alice",
      title: null,
      avatar_url: null,
      bio: "Alice's bio",
      joining_date: null,
      meta: null,
    });

    await organizerQueries.upsert(db, {
      username: "bob",
      name: "Bob",
      title: null,
      avatar_url: null,
      bio: "Bob's bio",
      joining_date: null,
      meta: null,
    });

    const count = await exportOrganizers(db, TEST_DATA_DIR, logger);
    expect(count).toBe(2);

    // Check both files exist
    const aliceContent = await readFile(
      join(TEST_DATA_DIR, "organizers", "alice.md"),
      "utf-8",
    );
    const bobContent = await readFile(
      join(TEST_DATA_DIR, "organizers", "bob.md"),
      "utf-8",
    );

    expect(aliceContent).toBeTruthy();
    expect(bobContent).toBeTruthy();
  });

  it("should handle organizers with no bio", async () => {
    await organizerQueries.upsert(db, {
      username: "alice",
      name: "Alice",
      title: null,
      avatar_url: null,
      bio: null,
      joining_date: null,
      meta: null,
    });

    const count = await exportOrganizers(db, TEST_DATA_DIR, logger);
    expect(count).toBe(1);

    const content = await readFile(
      join(TEST_DATA_DIR, "organizers", "alice.md"),
      "utf-8",
    );
    const parsed = matter(content);

    expect(parsed.content.trim()).toBe("");
  });
});
