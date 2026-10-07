/**
 * Badge importer tests
 */

import type { Database } from "@starter/leaderboard-api";
import {
  badgeDefinitionQueries,
  createDatabase,
  initializeSchema,
  organizerBadgeQueries,
  organizerQueries,
} from "@starter/leaderboard-api";
import { mkdir, rm, writeFile } from "fs/promises";
import { join } from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  importBadgeDefinitions,
  importBadges,
  importOrganizerBadges,
} from "../../importers/badges";
import { createLogger } from "../../logger";

const TEST_DATA_DIR = "./test-data-import-badges";
const logger = createLogger(false);

describe("Badge Importers", () => {
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

  describe("importBadgeDefinitions", () => {
    it("should import badge definitions from JSON", async () => {
      const definitions = [
        {
          slug: "race_milestone",
          name: "Race Milestone",
          description: "Awarded for reaching race milestones",
          variants: {
            bronze: {
              description: "10+ races",
              svg_url: "https://example.com/bronze.svg",
            },
            silver: {
              description: "50+ races",
              svg_url: "https://example.com/silver.svg",
            },
            gold: {
              description: "100+ races",
              svg_url: "https://example.com/gold.svg",
            },
          },
        },
      ];

      await mkdir(join(TEST_DATA_DIR, "badges"), { recursive: true });
      await writeFile(
        join(TEST_DATA_DIR, "badges", "definitions.json"),
        JSON.stringify(definitions),
        "utf-8",
      );

      await importBadgeDefinitions(db, TEST_DATA_DIR, logger);

      const imported = await badgeDefinitionQueries.getAll(db);
      expect(imported).toHaveLength(1);
      expect(imported[0].slug).toBe("race_milestone");
      expect(imported[0].variants.bronze).toBeDefined();
    });

    it("should import multiple badge definitions", async () => {
      const definitions = [
        {
          slug: "badge1",
          name: "Badge 1",
          description: "Test badge",
          variants: { bronze: { description: "Level 1", svg_url: "url1" } },
        },
        {
          slug: "badge2",
          name: "Badge 2",
          description: "Test badge",
          variants: { silver: { description: "Level 2", svg_url: "url2" } },
        },
      ];

      await mkdir(join(TEST_DATA_DIR, "badges"), { recursive: true });
      await writeFile(
        join(TEST_DATA_DIR, "badges", "definitions.json"),
        JSON.stringify(definitions),
        "utf-8",
      );

      await importBadgeDefinitions(db, TEST_DATA_DIR, logger);

      const imported = await badgeDefinitionQueries.getAll(db);
      expect(imported).toHaveLength(2);
    });

    it("should handle missing definitions file", async () => {
      await importBadgeDefinitions(db, TEST_DATA_DIR, logger);

      const imported = await badgeDefinitionQueries.getAll(db);
      expect(imported).toHaveLength(0);
    });
  });

  describe("importOrganizerBadges", () => {
    beforeEach(async () => {
      // Setup organizers and badge definitions
      await organizerQueries.upsert(db, {
        username: "alice",
        name: "Alice",
        title: null,
        avatar_url: null,
        bio: null,
        joining_date: null,
        meta: null,
      });

      await badgeDefinitionQueries.upsert(db, {
        slug: "race_milestone",
        name: "Race Milestone",
        description: "Test badge",
        variants: {
          bronze: { description: "10+", svg_url: "url" },
          silver: { description: "50+", svg_url: "url" },
        },
      });

      await badgeDefinitionQueries.upsert(db, {
        slug: "streak_badge",
        name: "Streak Badge",
        description: "Test badge",
        variants: { bronze: { description: "7 days", svg_url: "url" } },
      });
    });

    it("should import organizer badges from JSONL files", async () => {
      const badges = [
        {
          slug: "race_milestone__alice__bronze",
          badge: "race_milestone",
          organizer: "alice",
          variant: "bronze",
          achieved_on: "2025-01-05",
          meta: { auto_awarded: true },
        },
        {
          slug: "streak_badge__alice__bronze",
          badge: "streak_badge",
          organizer: "alice",
          variant: "bronze",
          achieved_on: "2025-01-04",
          meta: null,
        },
      ];

      await mkdir(join(TEST_DATA_DIR, "badges", "organizers"), {
        recursive: true,
      });
      await writeFile(
        join(TEST_DATA_DIR, "badges", "organizers", "alice.jsonl"),
        badges.map((b) => JSON.stringify(b)).join("\n") + "\n",
        "utf-8",
      );

      await importOrganizerBadges(db, TEST_DATA_DIR, logger);

      const imported = await organizerBadgeQueries.getByOrganizer(db, "alice");
      expect(imported).toHaveLength(2);
    });

    it("should handle multiple organizer files", async () => {
      await organizerQueries.upsert(db, {
        username: "bob",
        name: "Bob",
        title: null,
        avatar_url: null,
        bio: null,
        joining_date: null,
        meta: null,
      });

      await mkdir(join(TEST_DATA_DIR, "badges", "organizers"), {
        recursive: true,
      });

      await writeFile(
        join(TEST_DATA_DIR, "badges", "organizers", "alice.jsonl"),
        JSON.stringify({
          slug: "race_milestone__alice__bronze",
          badge: "race_milestone",
          organizer: "alice",
          variant: "bronze",
          achieved_on: "2025-01-05",
          meta: null,
        }) + "\n",
        "utf-8",
      );

      await writeFile(
        join(TEST_DATA_DIR, "badges", "organizers", "bob.jsonl"),
        JSON.stringify({
          slug: "race_milestone__bob__silver",
          badge: "race_milestone",
          organizer: "bob",
          variant: "silver",
          achieved_on: "2025-01-05",
          meta: null,
        }) + "\n",
        "utf-8",
      );

      await importOrganizerBadges(db, TEST_DATA_DIR, logger);

      const aliceBadges = await organizerBadgeQueries.getByOrganizer(
        db,
        "alice",
      );
      const bobBadges = await organizerBadgeQueries.getByOrganizer(db, "bob");

      expect(aliceBadges).toHaveLength(1);
      expect(bobBadges).toHaveLength(1);
    });

    it("should preserve badge metadata", async () => {
      await mkdir(join(TEST_DATA_DIR, "badges", "organizers"), {
        recursive: true,
      });
      await writeFile(
        join(TEST_DATA_DIR, "badges", "organizers", "alice.jsonl"),
        JSON.stringify({
          slug: "race_milestone__alice__bronze",
          badge: "race_milestone",
          organizer: "alice",
          variant: "bronze",
          achieved_on: "2025-01-05",
          meta: {
            auto_awarded: true,
            threshold: 10,
            actualValue: 42,
          },
        }) + "\n",
        "utf-8",
      );

      await importOrganizerBadges(db, TEST_DATA_DIR, logger);

      const badge = await organizerBadgeQueries.getByOrganizerAndBadge(
        db,
        "alice",
        "race_milestone",
      );

      expect(badge?.meta).toBeDefined();
      expect(badge?.meta?.auto_awarded).toBe(true);
      expect(badge?.meta?.threshold).toBe(10);
    });

    it("should handle missing organizers directory", async () => {
      await importOrganizerBadges(db, TEST_DATA_DIR, logger);

      const badges = await organizerBadgeQueries.getAll(db);
      expect(badges).toHaveLength(0);
    });
  });

  describe("importBadges", () => {
    it("should import all badge data", async () => {
      await organizerQueries.upsert(db, {
        username: "alice",
        name: "Alice",
        title: null,
        avatar_url: null,
        bio: null,
        joining_date: null,
        meta: null,
      });

      await mkdir(join(TEST_DATA_DIR, "badges", "organizers"), {
        recursive: true,
      });

      // Badge definitions
      await writeFile(
        join(TEST_DATA_DIR, "badges", "definitions.json"),
        JSON.stringify([
          {
            slug: "race_milestone",
            name: "Race Milestone",
            description: "Test badge",
            variants: { bronze: { description: "10+", svg_url: "url" } },
          },
        ]),
        "utf-8",
      );

      // Organizer badges
      await writeFile(
        join(TEST_DATA_DIR, "badges", "organizers", "alice.jsonl"),
        JSON.stringify({
          slug: "race_milestone__alice__bronze",
          badge: "race_milestone",
          organizer: "alice",
          variant: "bronze",
          achieved_on: "2025-01-05",
          meta: null,
        }) + "\n",
        "utf-8",
      );

      await importBadges(db, TEST_DATA_DIR, logger);

      const definitions = await badgeDefinitionQueries.getAll(db);
      const organizerBadges = await organizerBadgeQueries.getAll(db);

      expect(definitions).toHaveLength(1);
      expect(organizerBadges).toHaveLength(1);
    });
  });
});
