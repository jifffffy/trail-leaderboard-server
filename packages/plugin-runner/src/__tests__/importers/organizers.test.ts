/**
 * Organizer importer tests
 */

import type { Database } from "@starter/leaderboard-api";
import {
  createDatabase,
  initializeSchema,
  organizerQueries,
} from "@starter/leaderboard-api";
import { mkdir, rm, writeFile } from "fs/promises";
import matter from "gray-matter";
import { tmpdir } from "os";
import { join } from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { importOrganizers } from "../../importers/organizers";
import { createLogger } from "../../logger";

const TEST_DATA_DIR = "./test-data-organizers";
const logger = createLogger(false);

describe("Organizer Importer", () => {
  let db: Database;

  beforeEach(async () => {
    db = createDatabase(":memory:");
    await initializeSchema(db);
    await mkdir(join(TEST_DATA_DIR, "organizers"), { recursive: true });
  });

  afterEach(async () => {
    await db.close();
    await rm(TEST_DATA_DIR, { recursive: true, force: true });
  });

  it("should import organizers from markdown files", async () => {
    const organizer = matter.stringify("Alice is a software engineer.", {
      username: "alice",
      name: "Alice Smith",
      title: "Engineer",
      avatar_url: "https://example.com/alice.png",
      joining_date: "2020-01-01",
    });

    await writeFile(
      join(TEST_DATA_DIR, "organizers", "alice.md"),
      organizer,
      "utf-8",
    );

    const count = await importOrganizers(db, TEST_DATA_DIR, logger);
    expect(count).toBe(1);

    const imported = await organizerQueries.getByUsername(db, "alice");
    expect(imported).not.toBeNull();
    expect(imported?.name).toBe("Alice Smith");
    expect(imported?.bio).toBe("Alice is a software engineer.");
  });

  it("should handle multiple organizer files", async () => {
    const alice = matter.stringify("Alice's bio", {
      username: "alice",
      name: "Alice",
    });

    const bob = matter.stringify("Bob's bio", {
      username: "bob",
      name: "Bob",
    });

    await writeFile(
      join(TEST_DATA_DIR, "organizers", "alice.md"),
      alice,
      "utf-8",
    );
    await writeFile(join(TEST_DATA_DIR, "organizers", "bob.md"), bob, "utf-8");

    const count = await importOrganizers(db, TEST_DATA_DIR, logger);
    expect(count).toBe(2);

    const allOrganizers = await organizerQueries.getAll(db);
    expect(allOrganizers).toHaveLength(2);
  });

  it("should handle missing organizers directory", async () => {
    const emptyDir = join(tmpdir(), `test-data-empty-${Date.now()}`);
    await mkdir(emptyDir, { recursive: true });

    const count = await importOrganizers(db, emptyDir, logger);
    expect(count).toBe(0);

    await rm(emptyDir, { recursive: true, force: true });
  });
});
