/**
 * Aggregate importer tests
 */

import type { Database } from "@starter/leaderboard-api";
import {
  createDatabase,
  globalAggregateQueries,
  initializeSchema,
  organizerAggregateDefinitionQueries,
  organizerAggregateQueries,
  organizerQueries,
} from "@starter/leaderboard-api";
import { mkdir, rm, writeFile } from "fs/promises";
import { join } from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  importAggregates,
  importGlobalAggregates,
  importOrganizerAggregateDefinitions,
  importOrganizerAggregates,
} from "../../importers/aggregates";
import { createLogger } from "../../logger";

const TEST_DATA_DIR = "./test-data-import-aggregates";
const logger = createLogger(false);

describe("Aggregate Importers", () => {
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

  describe("importGlobalAggregates", () => {
    it("should import global aggregates from JSON", async () => {
      const aggregates = [
        {
          slug: "total_organizers",
          name: "Total Organizers",
          description: "Total number of organizers",
          value: { type: "number", value: 42, format: "integer" },
          meta: { calculated_at: "2025-01-05T12:00:00Z" },
        },
        {
          slug: "total_races",
          name: "Total Races",
          description: null,
          value: { type: "number", value: 100, format: "integer" },
          meta: null,
        },
      ];

      await mkdir(join(TEST_DATA_DIR, "aggregates"), { recursive: true });
      await writeFile(
        join(TEST_DATA_DIR, "aggregates", "global.json"),
        JSON.stringify(aggregates),
        "utf-8",
      );

      await importGlobalAggregates(db, TEST_DATA_DIR, logger);

      const imported = await globalAggregateQueries.getAll(db);
      expect(imported).toHaveLength(2);
      const slugs = imported.map((a) => a.slug).sort();
      expect(slugs).toContain("total_organizers");
      expect(slugs).toContain("total_races");
    });

    it("should handle missing global aggregates file", async () => {
      await importGlobalAggregates(db, TEST_DATA_DIR, logger);

      const imported = await globalAggregateQueries.getAll(db);
      expect(imported).toHaveLength(0);
    });

    it("should handle different aggregate value types", async () => {
      const aggregates = [
        {
          slug: "status",
          name: "Status",
          description: null,
          value: { type: "string", value: "Active" },
          meta: null,
        },
        {
          slug: "stats",
          name: "Statistics",
          description: null,
          value: {
            type: "statistics/number",
            min: 1,
            max: 100,
            mean: 50,
            highlightMetric: "mean",
          },
          meta: null,
        },
      ];

      await mkdir(join(TEST_DATA_DIR, "aggregates"), { recursive: true });
      await writeFile(
        join(TEST_DATA_DIR, "aggregates", "global.json"),
        JSON.stringify(aggregates),
        "utf-8",
      );

      await importGlobalAggregates(db, TEST_DATA_DIR, logger);

      const stringAgg = await globalAggregateQueries.getBySlug(db, "status");
      const statsAgg = await globalAggregateQueries.getBySlug(db, "stats");

      expect(stringAgg?.value.type).toBe("string");
      expect(statsAgg?.value.type).toBe("statistics/number");
    });
  });

  describe("importOrganizerAggregateDefinitions", () => {
    it("should import aggregate definitions from JSON", async () => {
      const definitions = [
        {
          slug: "pr_merged_count",
          name: "PRs Merged",
          description: "Number of pull requests merged",
        },
        {
          slug: "code_review_count",
          name: "Code Reviews",
          description: null,
        },
      ];

      await mkdir(join(TEST_DATA_DIR, "aggregates"), { recursive: true });
      await writeFile(
        join(TEST_DATA_DIR, "aggregates", "definitions.json"),
        JSON.stringify(definitions),
        "utf-8",
      );

      await importOrganizerAggregateDefinitions(db, TEST_DATA_DIR, logger);

      const imported = await organizerAggregateDefinitionQueries.getAll(db);
      expect(imported).toHaveLength(2);
      const slugs = imported.map((d) => d.slug).sort();
      expect(slugs).toContain("pr_merged_count");
      expect(slugs).toContain("code_review_count");
    });

    it("should handle missing definitions file", async () => {
      await importOrganizerAggregateDefinitions(db, TEST_DATA_DIR, logger);

      const imported = await organizerAggregateDefinitionQueries.getAll(db);
      expect(imported).toHaveLength(0);
    });
  });

  describe("importOrganizerAggregates", () => {
    beforeEach(async () => {
      // Setup organizers and definitions
      await organizerQueries.upsert(db, {
        username: "alice",
        name: "Alice",
        title: null,
        avatar_url: null,
        bio: null,
        joining_date: null,
        meta: null,
      });

      await organizerAggregateDefinitionQueries.upsert(db, {
        slug: "race_count",
        name: "Race Count",
        description: null,
      });

      await organizerAggregateDefinitionQueries.upsert(db, {
        slug: "total_points",
        name: "Total Points",
        description: null,
      });
    });

    it("should import organizer aggregates from JSONL files", async () => {
      const aggregates = [
        {
          aggregate: "race_count",
          organizer: "alice",
          value: { type: "number", value: 42, format: "integer" },
          meta: { calculated_at: "2025-01-05T12:00:00Z" },
        },
        {
          aggregate: "total_points",
          organizer: "alice",
          value: { type: "number", value: 250, format: "integer" },
          meta: null,
        },
      ];

      await mkdir(join(TEST_DATA_DIR, "aggregates", "organizers"), {
        recursive: true,
      });
      await writeFile(
        join(TEST_DATA_DIR, "aggregates", "organizers", "alice.jsonl"),
        aggregates.map((a) => JSON.stringify(a)).join("\n") + "\n",
        "utf-8",
      );

      await importOrganizerAggregates(db, TEST_DATA_DIR, logger);

      const imported = await organizerAggregateQueries.getByOrganizer(
        db,
        "alice",
      );
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

      await mkdir(join(TEST_DATA_DIR, "aggregates", "organizers"), {
        recursive: true,
      });

      await writeFile(
        join(TEST_DATA_DIR, "aggregates", "organizers", "alice.jsonl"),
        JSON.stringify({
          aggregate: "race_count",
          organizer: "alice",
          value: { type: "number", value: 42, format: "integer" },
          meta: null,
        }) + "\n",
        "utf-8",
      );

      await writeFile(
        join(TEST_DATA_DIR, "aggregates", "organizers", "bob.jsonl"),
        JSON.stringify({
          aggregate: "race_count",
          organizer: "bob",
          value: { type: "number", value: 30, format: "integer" },
          meta: null,
        }) + "\n",
        "utf-8",
      );

      await importOrganizerAggregates(db, TEST_DATA_DIR, logger);

      const aliceAggs = await organizerAggregateQueries.getByOrganizer(
        db,
        "alice",
      );
      const bobAggs = await organizerAggregateQueries.getByOrganizer(db, "bob");

      expect(aliceAggs).toHaveLength(1);
      expect(bobAggs).toHaveLength(1);
    });

    it("should handle aggregates with units", async () => {
      await mkdir(join(TEST_DATA_DIR, "aggregates", "organizers"), {
        recursive: true,
      });
      await writeFile(
        join(TEST_DATA_DIR, "aggregates", "organizers", "alice.jsonl"),
        JSON.stringify({
          aggregate: "race_count",
          organizer: "alice",
          value: {
            type: "number",
            value: 7200000,
            unit: "ms",
            format: "duration",
          },
          meta: null,
        }) + "\n",
        "utf-8",
      );

      await importOrganizerAggregates(db, TEST_DATA_DIR, logger);

      const aggregate =
        await organizerAggregateQueries.getByOrganizerAndAggregate(
          db,
          "alice",
          "race_count",
        );

      if (aggregate?.value.type === "number") {
        expect(aggregate.value.unit).toBe("ms");
        expect(aggregate.value.format).toBe("duration");
      }
    });

    it("should handle missing organizers directory", async () => {
      await importOrganizerAggregates(db, TEST_DATA_DIR, logger);

      const aggregates = await organizerAggregateQueries.getAll(db);
      expect(aggregates).toHaveLength(0);
    });
  });

  describe("importAggregates", () => {
    it("should import all aggregate data", async () => {
      await organizerQueries.upsert(db, {
        username: "alice",
        name: "Alice",
        title: null,
        avatar_url: null,
        bio: null,
        joining_date: null,
        meta: null,
      });

      await mkdir(join(TEST_DATA_DIR, "aggregates", "organizers"), {
        recursive: true,
      });

      // Global aggregates
      await writeFile(
        join(TEST_DATA_DIR, "aggregates", "global.json"),
        JSON.stringify([
          {
            slug: "total_organizers",
            name: "Total Organizers",
            description: null,
            value: { type: "number", value: 1, format: "integer" },
            meta: null,
          },
        ]),
        "utf-8",
      );

      // Definitions
      await writeFile(
        join(TEST_DATA_DIR, "aggregates", "definitions.json"),
        JSON.stringify([
          {
            slug: "race_count",
            name: "Race Count",
            description: null,
          },
        ]),
        "utf-8",
      );

      // Organizer aggregates
      await writeFile(
        join(TEST_DATA_DIR, "aggregates", "organizers", "alice.jsonl"),
        JSON.stringify({
          aggregate: "race_count",
          organizer: "alice",
          value: { type: "number", value: 42, format: "integer" },
          meta: null,
        }) + "\n",
        "utf-8",
      );

      await importAggregates(db, TEST_DATA_DIR, logger);

      const globalAggs = await globalAggregateQueries.getAll(db);
      const definitions = await organizerAggregateDefinitionQueries.getAll(db);
      const organizerAggs = await organizerAggregateQueries.getAll(db);

      expect(globalAggs).toHaveLength(1);
      expect(definitions).toHaveLength(1);
      expect(organizerAggs).toHaveLength(1);
    });
  });
});
