/**
 * Database query tests
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createDatabase } from "../client";
import {
  badgeDefinitionQueries,
  globalAggregateQueries,
  organizerAggregateDefinitionQueries,
  organizerAggregateQueries,
  organizerBadgeQueries,
  organizerQueries,
  raceDefinitionQueries,
  raceQueries,
} from "../queries";
import { initializeSchema } from "../schema";
import type { Database, Organizer, Race, RaceDefinition } from "../types";

describe("Database Queries", () => {
  let db: Database;

  beforeEach(async () => {
    // Use in-memory database for tests
    db = createDatabase(":memory:");
    await initializeSchema(db);
  });

  afterEach(async () => {
    await db.close();
  });

  describe("organizerQueries", () => {
    it("should insert and retrieve a organizer", async () => {
      const organizer: Organizer = {
        username: "alice",
        name: "Alice Smith",
        title: "Engineer",
        avatar_url: "https://example.com/alice.png",
        bio: "Alice is a software engineer",
        joining_date: "2020-01-01",
        meta: { team: "backend" },
      };

      await organizerQueries.upsert(db, organizer);
      const retrieved = await organizerQueries.getByUsername(db, "alice");

      expect(retrieved).not.toBeNull();
      expect(retrieved?.username).toBe("alice");
      expect(retrieved?.name).toBe("Alice Smith");
      expect(retrieved?.title).toBe("Engineer");
      expect(retrieved?.avatar_url).toBe("https://example.com/alice.png");
      expect(retrieved?.bio).toBe("Alice is a software engineer");
      expect(retrieved?.joining_date).toBe("2020-01-01");

      // Verify JSON fields are parsed as objects
      expect(retrieved?.meta).toEqual({ team: "backend" });
      expect(typeof retrieved?.meta).toBe("object");
    });

    it("should count organizers", async () => {
      await organizerQueries.upsert(db, {
        username: "alice",
        name: "Alice",
        title: null,
        avatar_url: null,
        bio: null,
        joining_date: null,
        meta: null,
      });

      const count = await organizerQueries.count(db);
      expect(count).toBe(1);
    });

    it("should parse JSON fields correctly when getting all organizers", async () => {
      await organizerQueries.upsert(db, {
        username: "alice",
        name: "Alice",
        title: "Developer",
        avatar_url: "https://example.com/alice.png",
        bio: "Core developer",
        joining_date: "2023-01-01",
        meta: { skills: ["typescript", "react"], experience: 5 },
      });

      await organizerQueries.upsert(db, {
        username: "bob",
        name: "Bob",
        title: "Designer",
        avatar_url: null,
        bio: null,
        joining_date: "2023-06-01",
        meta: { department: "design" },
      });

      const all = await organizerQueries.getAll(db);

      expect(all).toHaveLength(2);

      // Check first organizer
      expect(all[0].username).toBe("alice");
      expect(all[0].meta).toEqual({
        skills: ["typescript", "react"],
        experience: 5,
      });
      expect(typeof all[0].meta).toBe("object");

      // Check second organizer
      expect(all[1].username).toBe("bob");
      expect(all[1].meta).toEqual({ department: "design" });
      expect(typeof all[1].meta).toBe("object");
    });

    it("should merge case-variant username on upsert", async () => {
      await organizerQueries.upsert(db, {
        username: "alice",
        name: "Alice",
        title: null,
        avatar_url: null,
        bio: null,
        joining_date: null,
        meta: null,
      });

      await organizerQueries.upsert(db, {
        username: "Alice",
        name: "Alice Uppercase",
        title: null,
        avatar_url: null,
        bio: null,
        joining_date: null,
        meta: null,
      });

      const all = await organizerQueries.getAll(db);
      expect(all).toHaveLength(1);
      expect(all[0].username).toBe("alice");
      expect(all[0].name).toBe("Alice Uppercase");
    });

    it("should silently ignore case-variant username on insertOrIgnore", async () => {
      await organizerQueries.insertOrIgnore(db, {
        username: "bob",
        name: "Bob",
        title: null,
        avatar_url: null,
        bio: null,
        joining_date: null,
        meta: null,
      });

      await organizerQueries.insertOrIgnore(db, {
        username: "BOB",
        name: "Bob Uppercase",
        title: null,
        avatar_url: null,
        bio: null,
        joining_date: null,
        meta: null,
      });

      const all = await organizerQueries.getAll(db);
      expect(all).toHaveLength(1);
      expect(all[0].username).toBe("bob");
      expect(all[0].name).toBe("Bob");
    });

    it("should update existing organizer", async () => {
      const organizer: Organizer = {
        username: "alice",
        name: "Alice Smith",
        title: "Engineer",
        avatar_url: null,
        bio: null,
        joining_date: null,
        meta: null,
      };

      await organizerQueries.upsert(db, organizer);

      // Update with new data including JSON fields
      await organizerQueries.upsert(db, {
        ...organizer,
        title: "Senior Engineer",
        meta: { team: "frontend", level: "senior" },
      });

      const updated = await organizerQueries.getByUsername(db, "alice");
      expect(updated?.username).toBe("alice");
      expect(updated?.name).toBe("Alice Smith");
      expect(updated?.title).toBe("Senior Engineer");
      expect(updated?.meta).toEqual({ team: "frontend", level: "senior" });
      expect(typeof updated?.meta).toBe("object");
    });
  });

  describe("raceDefinitionQueries", () => {
    it("should insert and retrieve race definitions", async () => {
      const def: RaceDefinition = {
        slug: "pr_merged",
        name: "PR Merged",
        description: "Pull request was merged",
        points: 10,
        icon: "git-merge",
      };

      await raceDefinitionQueries.insertOrIgnore(db, def);
      const retrieved = await raceDefinitionQueries.getBySlug(db, "pr_merged");

      expect(retrieved).not.toBeNull();
      expect(retrieved?.name).toBe("PR Merged");
      expect(retrieved?.points).toBe(10);
    });

    it("should not duplicate definitions with insertOrIgnore", async () => {
      const def: RaceDefinition = {
        slug: "pr_merged",
        name: "PR Merged",
        description: "Pull request was merged",
        points: 10,
        icon: null,
      };

      await raceDefinitionQueries.insertOrIgnore(db, def);
      await raceDefinitionQueries.insertOrIgnore(db, {
        ...def,
        points: 20,
      });

      const count = await raceDefinitionQueries.count(db);
      expect(count).toBe(1);

      const retrieved = await raceDefinitionQueries.getBySlug(db, "pr_merged");
      expect(retrieved?.points).toBe(10); // Should keep original
    });
  });

  describe("raceQueries", () => {
    beforeEach(async () => {
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

    it("should insert and retrieve races", async () => {
      const race: Race = {
        slug: "alice-pr-1",
        organizer: "alice",
        race_definition: "pr_merged",
        title: "Fix bug",
        occurred_at: "2024-01-01T10:00:00Z",
        link: "https://github.com/org/repo/pull/1",
        text: "Fixed critical bug in authentication",
        points: 20,
        meta: { pr_number: 123, lines_changed: 50 },
      };

      await raceQueries.upsert(db, race);
      let races = await raceQueries.getByOrganizer(db, "alice");

      expect(races).toHaveLength(1);
      expect(races[0].slug).toBe("alice-pr-1");
      expect(races[0].organizer).toBe("alice");
      expect(races[0].race_definition).toBe("pr_merged");
      expect(races[0].title).toBe("Fix bug");
      expect(races[0].occurred_at).toBe("2024-01-01T10:00:00Z");
      expect(races[0].link).toBe("https://github.com/org/repo/pull/1");
      expect(races[0].text).toBe("Fixed critical bug in authentication");
      expect(races[0].points).toBe(20);

      // Verify meta is parsed as object
      expect(races[0].meta).toEqual({ pr_number: 123, lines_changed: 50 });
      expect(typeof races[0].meta).toBe("object");

      // Test with null points
      await raceQueries.upsert(db, {
        slug: "alice-pr-2",
        organizer: "alice",
        race_definition: "pr_merged",
        title: "Another PR",
        occurred_at: "2024-01-02T10:00:00Z",
        link: null,
        text: null,
        points: null,
        meta: null,
      });

      // Test with both race points and definition points null
      await raceDefinitionQueries.insertOrIgnore(db, {
        slug: "issue_closed",
        name: "Issue Closed",
        description: "Closed an issue",
        points: null,
        icon: null,
      });

      await raceQueries.upsert(db, {
        slug: "alice-zero-points",
        organizer: "alice",
        race_definition: "issue_closed",
        title: "Issue Closed",
        occurred_at: "2024-01-03T10:00:00Z",
        link: null,
        text: null,
        points: null,
        meta: null,
      });

      races = await raceQueries.getByOrganizer(db, "alice");
      expect(races).toHaveLength(3);
      expect(races[0].points).toBe(0);
      expect(races[1].points).toBe(10);
    });

    it("should get races by date range", async () => {
      await raceQueries.upsert(db, {
        slug: "alice-pr-1",
        organizer: "alice",
        race_definition: "pr_merged",
        title: "Race 1",
        occurred_at: "2024-01-15T10:00:00Z",
        link: null,
        text: null,
        points: 10,
        meta: { month: "january" },
      });

      await raceQueries.upsert(db, {
        slug: "alice-pr-2",
        organizer: "alice",
        race_definition: "pr_merged",
        title: "Race 2",
        occurred_at: "2024-02-15T10:00:00Z",
        link: null,
        text: null,
        points: 10,
        meta: { month: "february" },
      });

      const races = await raceQueries.getByDateRange(
        db,
        "2024-01-01T00:00:00Z",
        "2024-01-31T23:59:59Z",
      );

      expect(races).toHaveLength(1);
      expect(races[0].slug).toBe("alice-pr-1");
      expect(races[0].title).toBe("Race 1");
      expect(races[0].occurred_at).toBe("2024-01-15T10:00:00Z");
      expect(races[0].points).toBe(10);
      expect(races[0].meta).toEqual({ month: "january" });
      expect(typeof races[0].meta).toBe("object");
    });

    it("should calculate total points for organizer", async () => {
      await raceQueries.upsert(db, {
        slug: "alice-pr-1",
        organizer: "alice",
        race_definition: "pr_merged",
        title: "Race 1",
        occurred_at: "2024-01-01T10:00:00Z",
        link: null,
        text: null,
        points: 25,
        meta: null,
      });

      await raceQueries.upsert(db, {
        slug: "alice-pr-2",
        organizer: "alice",
        race_definition: "pr_merged",
        title: "Race 2",
        occurred_at: "2024-01-02T10:00:00Z",
        link: null,
        text: null,
        points: null,
        meta: null,
      });

      const totalPoints = await raceQueries.getTotalPointsByOrganizer(
        db,
        "alice",
      );
      expect(totalPoints).toBe(35);
    });

    it("should generate leaderboard", async () => {
      // Add another organizer
      await organizerQueries.upsert(db, {
        username: "bob",
        name: "Bob",
        title: null,
        avatar_url: null,
        bio: null,
        joining_date: null,
        meta: null,
      });

      // Add races
      await raceQueries.upsert(db, {
        slug: "alice-pr-1",
        organizer: "alice",
        race_definition: "pr_merged",
        title: "Race 1",
        occurred_at: "2024-01-01T10:00:00Z",
        link: null,
        text: null,
        points: 20,
        meta: null,
      });

      await raceQueries.upsert(db, {
        slug: "bob-pr-1",
        organizer: "bob",
        race_definition: "pr_merged",
        title: "Race 2",
        occurred_at: "2024-01-02T10:00:00Z",
        link: null,
        text: null,
        points: 10,
        meta: null,
      });

      const leaderboard = await raceQueries.getLeaderboard(db);

      expect(leaderboard).toHaveLength(2);
      expect(leaderboard[0].organizer).toBe("alice");
      expect(leaderboard[0].total_points).toBe(20);
      expect(leaderboard[1].organizer).toBe("bob");
      expect(leaderboard[1].total_points).toBe(10);
    });
  });

  describe("globalAggregateQueries", () => {
    it("should insert and retrieve a global aggregate", async () => {
      await globalAggregateQueries.upsert(db, {
        slug: "total_organizers",
        name: "Total Organizers",
        description: "Total number of organizers",
        value: {
          type: "number",
          value: 42,
          format: "integer",
        },
        meta: { calculated_at: "2025-01-05T12:00:00Z" },
      });

      const aggregate = await globalAggregateQueries.getBySlug(
        db,
        "total_organizers",
      );

      expect(aggregate).not.toBeNull();
      expect(aggregate?.slug).toBe("total_organizers");
      expect(aggregate?.value.type).toBe("number");
      if (aggregate?.value.type === "number") {
        expect(aggregate.value.value).toBe(42);
      }
    });

    it("should get all global aggregates", async () => {
      await globalAggregateQueries.upsert(db, {
        slug: "total_organizers",
        name: "Total Organizers",
        description: null,
        value: { type: "number", value: 42, format: "integer" },
        meta: null,
      });

      await globalAggregateQueries.upsert(db, {
        slug: "total_races",
        name: "Total Races",
        description: null,
        value: { type: "number", value: 100, format: "integer" },
        meta: null,
      });

      const aggregates = await globalAggregateQueries.getAll(db);
      expect(aggregates).toHaveLength(2);
    });

    it("should update existing global aggregate", async () => {
      await globalAggregateQueries.upsert(db, {
        slug: "total_organizers",
        name: "Total Organizers",
        description: null,
        value: { type: "number", value: 42, format: "integer" },
        meta: null,
      });

      await globalAggregateQueries.upsert(db, {
        slug: "total_organizers",
        name: "Total Organizers",
        description: null,
        value: { type: "number", value: 50, format: "integer" },
        meta: null,
      });

      const aggregate = await globalAggregateQueries.getBySlug(
        db,
        "total_organizers",
      );
      if (aggregate?.value.type === "number") {
        expect(aggregate.value.value).toBe(50);
      }
    });

    it("should handle different aggregate value types", async () => {
      // String aggregate
      await globalAggregateQueries.upsert(db, {
        slug: "status",
        name: "Status",
        description: null,
        value: { type: "string", value: "Active" },
        meta: null,
      });

      // Statistics aggregate
      await globalAggregateQueries.upsert(db, {
        slug: "race_stats",
        name: "Race Statistics",
        description: null,
        value: {
          type: "statistics/number",
          min: 1,
          max: 100,
          mean: 42.5,
          count: 50,
          highlightMetric: "mean",
        },
        meta: null,
      });

      const stringAgg = await globalAggregateQueries.getBySlug(db, "status");
      const statsAgg = await globalAggregateQueries.getBySlug(db, "race_stats");

      expect(stringAgg?.value.type).toBe("string");
      expect(statsAgg?.value.type).toBe("statistics/number");
    });

    it("should create aggregates with hidden field", async () => {
      // Create visible aggregate
      await globalAggregateQueries.upsert(db, {
        slug: "visible_metric",
        name: "Visible Metric",
        description: null,
        value: { type: "number", value: 10, format: "integer" },
        hidden: false,
        meta: null,
      });

      // Create hidden aggregate
      await globalAggregateQueries.upsert(db, {
        slug: "hidden_metric",
        name: "Hidden Metric",
        description: null,
        value: { type: "number", value: 20, format: "integer" },
        hidden: true,
        meta: null,
      });

      const visible = await globalAggregateQueries.getBySlug(
        db,
        "visible_metric",
      );
      const hidden = await globalAggregateQueries.getBySlug(
        db,
        "hidden_metric",
      );

      // SQLite returns 0/1 for boolean values
      expect(visible?.hidden).toBeFalsy();
      expect(hidden?.hidden).toBeTruthy();
    });

    it("should filter hidden aggregates with getAllVisible", async () => {
      // Create visible aggregate
      await globalAggregateQueries.upsert(db, {
        slug: "visible1",
        name: "Visible 1",
        description: null,
        value: { type: "number", value: 10, format: "integer" },
        hidden: false,
        meta: null,
      });

      // Create hidden aggregate
      await globalAggregateQueries.upsert(db, {
        slug: "hidden1",
        name: "Hidden 1",
        description: null,
        value: { type: "number", value: 20, format: "integer" },
        hidden: true,
        meta: null,
      });

      // Create another visible aggregate (default hidden = false)
      await globalAggregateQueries.upsert(db, {
        slug: "visible2",
        name: "Visible 2",
        description: null,
        value: { type: "number", value: 30, format: "integer" },
        hidden: null,
        meta: null,
      });

      const allAggregates = await globalAggregateQueries.getAll(db);
      const visibleAggregates = await globalAggregateQueries.getAllVisible(db);

      expect(allAggregates).toHaveLength(3);
      expect(visibleAggregates).toHaveLength(2);
      expect(visibleAggregates.map((a) => a.slug)).toEqual(
        expect.arrayContaining(["visible1", "visible2"]),
      );
    });

    it("should default hidden to false when not specified", async () => {
      await globalAggregateQueries.upsert(db, {
        slug: "default_aggregate",
        name: "Default Aggregate",
        description: null,
        value: { type: "number", value: 42, format: "integer" },
        hidden: null,
        meta: null,
      });

      const aggregate = await globalAggregateQueries.getBySlug(
        db,
        "default_aggregate",
      );
      // Default should be falsy (0, false, or null - all treated as visible)
      expect(aggregate?.hidden).toBeFalsy();
    });
  });

  describe("organizerAggregateDefinitionQueries", () => {
    it("should insert and retrieve aggregate definition", async () => {
      await organizerAggregateDefinitionQueries.upsert(db, {
        slug: "pr_merged_count",
        name: "PRs Merged",
        description: "Number of pull requests merged",
      });

      const definition = await organizerAggregateDefinitionQueries.getBySlug(
        db,
        "pr_merged_count",
      );

      expect(definition).not.toBeNull();
      expect(definition?.name).toBe("PRs Merged");
    });

    it("should get all aggregate definitions", async () => {
      await organizerAggregateDefinitionQueries.upsert(db, {
        slug: "pr_merged_count",
        name: "PRs Merged",
        description: null,
      });

      await organizerAggregateDefinitionQueries.upsert(db, {
        slug: "code_review_count",
        name: "Code Reviews",
        description: null,
      });

      const definitions = await organizerAggregateDefinitionQueries.getAll(db);
      expect(definitions).toHaveLength(2);
    });

    it("should create definitions with hidden field", async () => {
      // Create visible definition
      await organizerAggregateDefinitionQueries.upsert(db, {
        slug: "visible_def",
        name: "Visible Definition",
        description: null,
        hidden: false,
      });

      // Create hidden definition
      await organizerAggregateDefinitionQueries.upsert(db, {
        slug: "hidden_def",
        name: "Hidden Definition",
        description: null,
        hidden: true,
      });

      const visible = await organizerAggregateDefinitionQueries.getBySlug(
        db,
        "visible_def",
      );
      const hidden = await organizerAggregateDefinitionQueries.getBySlug(
        db,
        "hidden_def",
      );

      // SQLite returns 0/1 for boolean values
      expect(visible?.hidden).toBeFalsy();
      expect(hidden?.hidden).toBeTruthy();
    });

    it("should filter hidden definitions with getAllVisible", async () => {
      // Create visible definition
      await organizerAggregateDefinitionQueries.upsert(db, {
        slug: "visible1",
        name: "Visible 1",
        description: null,
        hidden: false,
      });

      // Create hidden definition
      await organizerAggregateDefinitionQueries.upsert(db, {
        slug: "hidden1",
        name: "Hidden 1",
        description: null,
        hidden: true,
      });

      // Create another visible definition (default)
      await organizerAggregateDefinitionQueries.upsert(db, {
        slug: "visible2",
        name: "Visible 2",
        description: null,
        hidden: null,
      });

      const allDefinitions =
        await organizerAggregateDefinitionQueries.getAll(db);
      const visibleDefinitions =
        await organizerAggregateDefinitionQueries.getAllVisible(db);

      expect(allDefinitions).toHaveLength(3);
      expect(visibleDefinitions).toHaveLength(2);
      expect(visibleDefinitions.map((d) => d.slug)).toEqual(
        expect.arrayContaining(["visible1", "visible2"]),
      );
    });

    it("should default hidden to false when not specified", async () => {
      await organizerAggregateDefinitionQueries.upsert(db, {
        slug: "default_def",
        name: "Default Definition",
        description: null,
        hidden: null,
      });

      const definition = await organizerAggregateDefinitionQueries.getBySlug(
        db,
        "default_def",
      );
      // Default should be falsy (0, false, or null - all treated as visible)
      expect(definition?.hidden).toBeFalsy();
    });
  });

  describe("organizerAggregateQueries", () => {
    beforeEach(async () => {
      // Setup organizer and aggregate definition
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
    });

    it("should insert and retrieve organizer aggregate", async () => {
      await organizerAggregateQueries.upsert(db, {
        aggregate: "race_count",
        organizer: "alice",
        value: { type: "number", value: 42, format: "integer" },
        meta: null,
      });

      const aggregate =
        await organizerAggregateQueries.getByOrganizerAndAggregate(
          db,
          "alice",
          "race_count",
        );

      expect(aggregate).not.toBeNull();
      if (aggregate?.value.type === "number") {
        expect(aggregate.value.value).toBe(42);
      }
    });

    it("should get all aggregates for a organizer", async () => {
      await organizerAggregateDefinitionQueries.upsert(db, {
        slug: "total_points",
        name: "Total Points",
        description: null,
      });

      await organizerAggregateQueries.upsert(db, {
        aggregate: "race_count",
        organizer: "alice",
        value: { type: "number", value: 42, format: "integer" },
        meta: null,
      });

      await organizerAggregateQueries.upsert(db, {
        aggregate: "total_points",
        organizer: "alice",
        value: { type: "number", value: 250, format: "integer" },
        meta: null,
      });

      const aggregates = await organizerAggregateQueries.getByOrganizer(
        db,
        "alice",
      );
      expect(aggregates).toHaveLength(2);
    });

    it("should handle aggregate with units", async () => {
      await organizerAggregateQueries.upsert(db, {
        aggregate: "race_count",
        organizer: "alice",
        value: {
          type: "number",
          value: 7200000,
          unit: "ms",
          format: "duration",
        },
        meta: null,
      });

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
  });

  describe("badgeDefinitionQueries", () => {
    it("should insert and retrieve badge definition", async () => {
      await badgeDefinitionQueries.upsert(db, {
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
        },
      });

      const badge = await badgeDefinitionQueries.getBySlug(
        db,
        "race_milestone",
      );

      expect(badge).not.toBeNull();
      expect(badge?.name).toBe("Race Milestone");
      expect(badge?.variants.bronze).toBeDefined();
      expect(badge?.variants.silver).toBeDefined();
    });

    it("should get all badge definitions", async () => {
      await badgeDefinitionQueries.upsert(db, {
        slug: "badge1",
        name: "Badge 1",
        description: "Test badge",
        variants: { bronze: { description: "Level 1", svg_url: "url1" } },
      });

      await badgeDefinitionQueries.upsert(db, {
        slug: "badge2",
        name: "Badge 2",
        description: "Test badge",
        variants: { silver: { description: "Level 2", svg_url: "url2" } },
      });

      const badges = await badgeDefinitionQueries.getAll(db);
      expect(badges).toHaveLength(2);
    });
  });

  describe("organizerBadgeQueries", () => {
    beforeEach(async () => {
      // Setup organizer and badge definition
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
          gold: { description: "100+", svg_url: "url" },
        },
      });
    });

    it("should award and retrieve a badge", async () => {
      await organizerBadgeQueries.award(db, {
        slug: "race_milestone__alice__bronze",
        badge: "race_milestone",
        organizer: "alice",
        variant: "bronze",
        achieved_on: "2025-01-05",
        meta: { auto_awarded: true },
      });

      const badge = await organizerBadgeQueries.getByOrganizerAndBadge(
        db,
        "alice",
        "race_milestone",
      );

      expect(badge).not.toBeNull();
      expect(badge?.variant).toBe("bronze");
      expect(badge?.achieved_on).toBe("2025-01-05");
    });

    it("should get all badges for a organizer", async () => {
      await badgeDefinitionQueries.upsert(db, {
        slug: "streak_badge",
        name: "Streak Badge",
        description: "Test badge",
        variants: { bronze: { description: "7 days", svg_url: "url" } },
      });

      await organizerBadgeQueries.award(db, {
        slug: "race_milestone__alice__bronze",
        badge: "race_milestone",
        organizer: "alice",
        variant: "bronze",
        achieved_on: "2025-01-05",
        meta: null,
      });

      await organizerBadgeQueries.award(db, {
        slug: "streak_badge__alice__bronze",
        badge: "streak_badge",
        organizer: "alice",
        variant: "bronze",
        achieved_on: "2025-01-04",
        meta: null,
      });

      const badges = await organizerBadgeQueries.getByOrganizer(db, "alice");
      expect(badges).toHaveLength(2);
    });

    it("should check if badge exists", async () => {
      await organizerBadgeQueries.award(db, {
        slug: "race_milestone__alice__bronze",
        badge: "race_milestone",
        organizer: "alice",
        variant: "bronze",
        achieved_on: "2025-01-05",
        meta: null,
      });

      const exists = await organizerBadgeQueries.exists(
        db,
        "alice",
        "race_milestone",
        "bronze",
      );
      expect(exists).toBe(true);

      const notExists = await organizerBadgeQueries.exists(
        db,
        "alice",
        "race_milestone",
        "gold",
      );
      expect(notExists).toBe(false);
    });

    it("should upgrade a badge variant", async () => {
      await organizerBadgeQueries.award(db, {
        slug: "race_milestone__alice__bronze",
        badge: "race_milestone",
        organizer: "alice",
        variant: "bronze",
        achieved_on: "2025-01-01",
        meta: null,
      });

      await organizerBadgeQueries.upgrade(
        db,
        "race_milestone__alice__bronze",
        "silver",
        { upgraded: true },
      );

      const badge = await organizerBadgeQueries.getByOrganizerAndBadge(
        db,
        "alice",
        "race_milestone",
      );

      expect(badge?.variant).toBe("silver");
      expect(badge?.meta?.upgraded).toBe(true);
    });

    it("should not award duplicate badges", async () => {
      await organizerBadgeQueries.award(db, {
        slug: "race_milestone__alice__bronze",
        badge: "race_milestone",
        organizer: "alice",
        variant: "bronze",
        achieved_on: "2025-01-05",
        meta: null,
      });

      // Try to award same badge again (should be ignored due to INSERT OR IGNORE)
      await organizerBadgeQueries.award(db, {
        slug: "race_milestone__alice__bronze",
        badge: "race_milestone",
        organizer: "alice",
        variant: "bronze",
        achieved_on: "2025-01-06",
        meta: null,
      });

      const badges = await organizerBadgeQueries.getByOrganizer(db, "alice");
      expect(badges).toHaveLength(1);
    });
  });
});

describe("raceQueries", () => {
  let db: Database;

  beforeEach(async () => {
    db = createDatabase(":memory:");
    await initializeSchema(db);

    // Set up test data
    await organizerQueries.upsert(db, {
      username: "test_user",
      name: "Test User",
      title: null,
      joining_date: "2025-01-01",
      avatar_url: null,
      bio: null,
      meta: null,
    });

    await raceDefinitionQueries.insertOrIgnore(db, {
      slug: "pull_request_opened",
      name: "PR Opened",
      description: "Opened a pull request",
      icon: "git-pull-request",
      points: 10,
    });

    await raceDefinitionQueries.insertOrIgnore(db, {
      slug: "pull_request_merged",
      name: "PR Merged",
      description: "Merged a pull request",
      icon: "git-merge",
      points: 20,
    });

    await raceDefinitionQueries.insertOrIgnore(db, {
      slug: "issue_created",
      name: "Issue Created",
      description: "Created an issue",
      icon: "circle-dot",
      points: 5,
    });
  });

  afterEach(async () => {
    await db.close();
  });

  describe("getByDefinitions", () => {
    it("should filter by multiple race definitions", async () => {
      await raceQueries.upsert(db, {
        slug: "race_1",
        organizer: "test_user",
        race_definition: "pull_request_opened",
        title: "PR 1",
        occurred_at: "2025-01-01",
        link: null,
        text: null,
        points: 10,
        meta: null,
      });

      await raceQueries.upsert(db, {
        slug: "race_2",
        organizer: "test_user",
        race_definition: "pull_request_merged",
        title: "PR 2",
        occurred_at: "2025-01-02",
        link: null,
        text: null,
        points: 20,
        meta: null,
      });

      await raceQueries.upsert(db, {
        slug: "race_3",
        organizer: "test_user",
        race_definition: "issue_created",
        title: "Issue 1",
        occurred_at: "2025-01-03",
        link: null,
        text: null,
        points: 5,
        meta: null,
      });

      const result = await raceQueries.getByDefinitions(db, [
        "pull_request_opened",
        "pull_request_merged",
      ]);

      expect(result).toHaveLength(2);
      expect(result.map((a) => a.race_definition)).toContain(
        "pull_request_opened",
      );
      expect(result.map((a) => a.race_definition)).toContain(
        "pull_request_merged",
      );
      expect(result.map((a) => a.race_definition)).not.toContain(
        "issue_created",
      );
    });

    it("should return all when empty array", async () => {
      await raceQueries.upsert(db, {
        slug: "race_1",
        organizer: "test_user",
        race_definition: "pull_request_opened",
        title: "PR 1",
        occurred_at: "2025-01-01",
        link: null,
        text: null,
        points: 10,
        meta: null,
      });

      await raceQueries.upsert(db, {
        slug: "race_2",
        organizer: "test_user",
        race_definition: "issue_created",
        title: "Issue 1",
        occurred_at: "2025-01-02",
        link: null,
        text: null,
        points: 5,
        meta: null,
      });

      const result = await raceQueries.getByDefinitions(db, []);

      expect(result.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe("getByOrganizerAndDefinitions", () => {
    it("should filter by organizer and definitions", async () => {
      await organizerQueries.upsert(db, {
        username: "user2",
        name: "User 2",
        joining_date: "2025-01-01",
        title: null,
        avatar_url: null,
        bio: null,
        meta: null,
      });

      await raceQueries.upsert(db, {
        slug: "race_1",
        organizer: "test_user",
        race_definition: "pull_request_opened",
        title: "PR 1",
        occurred_at: "2025-01-01",
        link: null,
        text: null,
        points: 10,
        meta: null,
      });

      await raceQueries.upsert(db, {
        slug: "race_2",
        organizer: "test_user",
        race_definition: "issue_created",
        title: "Issue 1",
        occurred_at: "2025-01-02",
        link: null,
        text: null,
        points: 5,
        meta: null,
      });

      await raceQueries.upsert(db, {
        slug: "race_3",
        organizer: "user2",
        race_definition: "pull_request_opened",
        title: "PR 2",
        occurred_at: "2025-01-03",
        link: null,
        text: null,
        points: 10,
        meta: null,
      });

      const result = await raceQueries.getByOrganizerAndDefinitions(
        db,
        "test_user",
        ["pull_request_opened"],
      );

      expect(result).toHaveLength(1);
      expect(result[0].organizer).toBe("test_user");
      expect(result[0].race_definition).toBe("pull_request_opened");
    });
  });

  describe("Optimized Query Methods", () => {
    describe("organizerQueries.getAllUsernames", () => {
      it("should return only usernames", async () => {
        await organizerQueries.upsert(db, {
          username: "alice_username",
          name: "Alice Smith",
          title: null,
          avatar_url: null,
          bio: null,
          joining_date: null,
          meta: null,
        });

        await organizerQueries.upsert(db, {
          username: "bob_username",
          name: "Bob Jones",
          title: null,
          avatar_url: null,
          bio: null,
          joining_date: null,
          meta: null,
        });

        const usernames = await organizerQueries.getAllUsernames(db);

        expect(usernames.length).toBeGreaterThanOrEqual(2);
        expect(usernames).toContain("alice_username");
        expect(usernames).toContain("bob_username");
        expect(typeof usernames[0]).toBe("string");
      });

      it("should return sorted usernames", async () => {
        await organizerQueries.upsert(db, {
          username: "zebra",
          name: "Zebra",
          title: null,
          avatar_url: null,
          bio: null,
          joining_date: null,
          meta: null,
        });

        await organizerQueries.upsert(db, {
          username: "alpha",
          name: "Alpha",
          title: null,
          avatar_url: null,
          bio: null,
          joining_date: null,
          meta: null,
        });

        const usernames = await organizerQueries.getAllUsernames(db);

        const alphaIndex = usernames.indexOf("alpha");
        const zebraIndex = usernames.indexOf("zebra");
        expect(alphaIndex).toBeLessThan(zebraIndex);
      });
    });

    describe("organizerQueries.getLeaderboardWithPoints", () => {
      beforeEach(async () => {
        await raceDefinitionQueries.insertOrIgnore(db, {
          slug: "test_race",
          name: "Test Race",
          description: "Test",
          points: 10,
          icon: null,
        });

        await organizerQueries.upsert(db, {
          username: "alice",
          name: "Alice",
          title: null,
          avatar_url: "https://example.com/alice.png",
          bio: null,
          joining_date: null,
          meta: null,
        });

        await organizerQueries.upsert(db, {
          username: "bob",
          name: "Bob",
          title: null,
          avatar_url: null,
          bio: null,
          joining_date: null,
          meta: null,
        });

        await organizerQueries.upsert(db, {
          username: "charlie",
          name: "Charlie",
          title: null,
          avatar_url: null,
          bio: null,
          joining_date: null,
          meta: null,
        });

        await raceQueries.upsert(db, {
          slug: "act1",
          organizer: "alice",
          race_definition: "test_race",
          title: "Race 1",
          occurred_at: "2025-01-01",
          link: null,
          text: null,
          points: 100,
          meta: null,
        });

        await raceQueries.upsert(db, {
          slug: "act2",
          organizer: "bob",
          race_definition: "test_race",
          title: "Race 2",
          occurred_at: "2025-01-02",
          link: null,
          text: null,
          points: 50,
          meta: null,
        });
      });

      it("should return organizers with total points", async () => {
        const result = await organizerQueries.getLeaderboardWithPoints(db);

        expect(result.length).toBeGreaterThanOrEqual(3);

        const alice = result.find((r) => r.username === "alice");
        const bob = result.find((r) => r.username === "bob");
        const charlie = result.find((r) => r.username === "charlie");

        expect(alice?.totalPoints).toBe(100);
        expect(bob?.totalPoints).toBe(50);
        expect(charlie?.totalPoints).toBe(0);
      });

      it("should include organizer details", async () => {
        const result = await organizerQueries.getLeaderboardWithPoints(db);

        expect(result[0].name).toBe("Alice");
        expect(result[0].avatar_url).toBe("https://example.com/alice.png");
      });
    });

    describe("raceQueries.getLeaderboardEnriched", () => {
      beforeEach(async () => {
        await raceDefinitionQueries.insertOrIgnore(db, {
          slug: "test_race",
          name: "Test Race",
          description: "Test",
          points: 10,
          icon: null,
        });

        await organizerQueries.upsert(db, {
          username: "alice",
          name: "Alice Smith",
          title: null,
          avatar_url: "https://example.com/alice.png",
          bio: null,
          joining_date: null,
          meta: null,
        });

        await raceQueries.upsert(db, {
          slug: "act1",
          organizer: "alice",
          race_definition: "test_race",
          title: "Race 1",
          occurred_at: "2025-01-01T10:00:00Z",
          link: null,
          text: null,
          points: 100,
          meta: null,
        });

        await raceQueries.upsert(db, {
          slug: "act2",
          organizer: "alice",
          race_definition: "test_race",
          title: "Race 2",
          occurred_at: "2025-01-05T10:00:00Z",
          link: null,
          text: null,
          points: 50,
          meta: null,
        });
      });

      it("should return leaderboard with organizer details", async () => {
        const result = await raceQueries.getLeaderboardEnriched(db);

        expect(result).toHaveLength(1);
        expect(result[0].username).toBe("alice");
        expect(result[0].name).toBe("Alice Smith");
        expect(result[0].avatar_url).toBe("https://example.com/alice.png");
        expect(result[0].total_points).toBe(150);
        expect(result[0].race_count).toBe(2);
      });

      it("should filter by date range", async () => {
        const result = await raceQueries.getLeaderboardEnriched(
          db,
          undefined,
          "2025-01-04T00:00:00Z",
          "2025-01-06T00:00:00Z",
        );

        expect(result).toHaveLength(1);
        expect(result[0].total_points).toBe(50);
        expect(result[0].race_count).toBe(1);
      });

      it("should respect limit", async () => {
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
          slug: "act3",
          organizer: "bob",
          race_definition: "test_race",
          title: "Race 3",
          occurred_at: "2025-01-02T10:00:00Z",
          link: null,
          text: null,
          points: 75,
          meta: null,
        });

        const result = await raceQueries.getLeaderboardEnriched(db, 1);

        expect(result).toHaveLength(1);
        expect(result[0].username).toBe("alice");
      });
    });

    describe("raceQueries.getRecentRacesEnriched", () => {
      beforeEach(async () => {
        await raceDefinitionQueries.insertOrIgnore(db, {
          slug: "pr_opened",
          name: "PR Opened",
          description: "Opened a pull request",
          points: 10,
          icon: null,
        });

        await raceDefinitionQueries.insertOrIgnore(db, {
          slug: "issue_created",
          name: "Issue Created",
          description: "Created an issue",
          points: 5,
          icon: null,
        });

        await organizerQueries.upsert(db, {
          username: "alice",
          name: "Alice Smith",
          title: null,
          avatar_url: "https://example.com/alice.png",
          bio: null,
          joining_date: null,
          meta: null,
        });

        await raceQueries.upsert(db, {
          slug: "act1",
          organizer: "alice",
          race_definition: "pr_opened",
          title: "PR #1",
          occurred_at: "2025-01-02T10:00:00Z",
          link: "https://github.com/pr/1",
          text: null,
          points: 10,
          meta: null,
        });

        await raceQueries.upsert(db, {
          slug: "act2",
          organizer: "alice",
          race_definition: "issue_created",
          title: "Issue #1",
          occurred_at: "2025-01-03T10:00:00Z",
          link: null,
          text: null,
          points: 5,
          meta: null,
        });
      });

      it("should return enriched races", async () => {
        const result = await raceQueries.getRecentRacesEnriched(
          db,
          "2025-01-01T00:00:00Z",
          "2025-01-05T00:00:00Z",
        );

        expect(result).toHaveLength(2);
        expect(result[0].race_name).toBe("Issue Created");
        expect(result[0].organizer_name).toBe("Alice Smith");
        expect(result[0].organizer_avatar_url).toBe(
          "https://example.com/alice.png",
        );
        expect(result[1].race_name).toBe("PR Opened");
      });

      it("should filter by date range", async () => {
        const result = await raceQueries.getRecentRacesEnriched(
          db,
          "2025-01-03T00:00:00Z",
          "2025-01-04T00:00:00Z",
        );

        expect(result).toHaveLength(1);
        expect(result[0].race_definition).toBe("issue_created");
      });
    });

    describe("raceQueries.getTopByRaceEnriched", () => {
      beforeEach(async () => {
        await raceDefinitionQueries.insertOrIgnore(db, {
          slug: "pr_opened",
          name: "PR Opened",
          description: "Opened a pull request",
          points: 10,
          icon: null,
        });

        await organizerQueries.upsert(db, {
          username: "alice",
          name: "Alice",
          title: null,
          avatar_url: "https://example.com/alice.png",
          bio: null,
          joining_date: null,
          meta: null,
        });

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
          slug: "act1",
          organizer: "alice",
          race_definition: "pr_opened",
          title: "PR #1",
          occurred_at: "2025-01-02T10:00:00Z",
          link: null,
          text: null,
          points: 10,
          meta: null,
        });

        await raceQueries.upsert(db, {
          slug: "act2",
          organizer: "alice",
          race_definition: "pr_opened",
          title: "PR #2",
          occurred_at: "2025-01-03T10:00:00Z",
          link: null,
          text: null,
          points: 15,
          meta: null,
        });

        await raceQueries.upsert(db, {
          slug: "act3",
          organizer: "bob",
          race_definition: "pr_opened",
          title: "PR #3",
          occurred_at: "2025-01-04T10:00:00Z",
          link: null,
          text: null,
          points: 20,
          meta: null,
        });
      });

      it("should return top organizers for race", async () => {
        const result = await raceQueries.getTopByRaceEnriched(db, "pr_opened");

        expect(result).toHaveLength(2);
        expect(result[0].username).toBe("alice");
        expect(result[0].points).toBe(25);
        expect(result[0].count).toBe(2);
        expect(result[1].username).toBe("bob");
        expect(result[1].points).toBe(20);
        expect(result[1].count).toBe(1);
      });

      it("should filter by date range", async () => {
        const result = await raceQueries.getTopByRaceEnriched(
          db,
          "pr_opened",
          "2025-01-03T00:00:00Z",
          "2025-01-05T00:00:00Z",
        );

        expect(result).toHaveLength(2);
        expect(result[0].username).toBe("bob");
        expect(result[0].points).toBe(20);
        expect(result[1].username).toBe("alice");
        expect(result[1].points).toBe(15);
      });

      it("should respect limit", async () => {
        const result = await raceQueries.getTopByRaceEnriched(
          db,
          "pr_opened",
          undefined,
          undefined,
          1,
        );

        expect(result).toHaveLength(1);
        expect(result[0].username).toBe("alice");
      });
    });

    describe("raceQueries.getRaceCountByDate", () => {
      beforeEach(async () => {
        await raceDefinitionQueries.insertOrIgnore(db, {
          slug: "test_race",
          name: "Test Race",
          description: "Test",
          points: 10,
          icon: null,
        });

        await organizerQueries.upsert(db, {
          username: "alice",
          name: "Alice",
          title: null,
          avatar_url: null,
          bio: null,
          joining_date: null,
          meta: null,
        });

        await raceQueries.upsert(db, {
          slug: "act1",
          organizer: "alice",
          race_definition: "test_race",
          title: "Race 1",
          occurred_at: "2025-01-01T10:00:00Z",
          link: null,
          text: null,
          points: 10,
          meta: null,
        });

        await raceQueries.upsert(db, {
          slug: "act2",
          organizer: "alice",
          race_definition: "test_race",
          title: "Race 2",
          occurred_at: "2025-01-01T14:00:00Z",
          link: null,
          text: null,
          points: 10,
          meta: null,
        });

        await raceQueries.upsert(db, {
          slug: "act3",
          organizer: "alice",
          race_definition: "test_race",
          title: "Race 3",
          occurred_at: "2025-01-02T10:00:00Z",
          link: null,
          text: null,
          points: 10,
          meta: null,
        });
      });

      it("should group races by date", async () => {
        const result = await raceQueries.getRaceCountByDate(db, "alice");

        expect(result).toHaveLength(2);
        expect(result[0].date).toBe("2025-01-01");
        expect(result[0].count).toBe(2);
        expect(result[1].date).toBe("2025-01-02");
        expect(result[1].count).toBe(1);
      });

      it("should return empty array for organizer with no races", async () => {
        await organizerQueries.upsert(db, {
          username: "bob",
          name: "Bob",
          title: null,
          avatar_url: null,
          bio: null,
          joining_date: null,
          meta: null,
        });

        const result = await raceQueries.getRaceCountByDate(db, "bob");

        expect(result).toHaveLength(0);
      });
    });

    describe("globalAggregateQueries.getBySlugs", () => {
      beforeEach(async () => {
        await globalAggregateQueries.upsert(db, {
          slug: "total_prs",
          name: "Total PRs",
          description: "Total pull requests",
          value: { type: "number", value: 100 },
          hidden: false,
          meta: null,
        });

        await globalAggregateQueries.upsert(db, {
          slug: "total_issues",
          name: "Total Issues",
          description: "Total issues",
          value: { type: "number", value: 50 },
          hidden: false,
          meta: null,
        });

        await globalAggregateQueries.upsert(db, {
          slug: "hidden_metric",
          name: "Hidden Metric",
          description: "Should not appear",
          value: { type: "number", value: 999 },
          hidden: true,
          meta: null,
        });
      });

      it("should return aggregates by slugs", async () => {
        const result = await globalAggregateQueries.getBySlugs(db, [
          "total_prs",
          "total_issues",
        ]);

        expect(result).toHaveLength(2);
        expect(result[0].slug).toBe("total_issues");
        expect(result[0].value).toEqual({ type: "number", value: 50 });
        expect(result[1].slug).toBe("total_prs");
      });

      it("should filter out hidden aggregates", async () => {
        const result = await globalAggregateQueries.getBySlugs(db, [
          "total_prs",
          "hidden_metric",
        ]);

        expect(result).toHaveLength(1);
        expect(result[0].slug).toBe("total_prs");
      });

      it("should return empty array for empty slugs", async () => {
        const result = await globalAggregateQueries.getBySlugs(db, []);

        expect(result).toHaveLength(0);
      });
    });

    describe("organizerAggregateQueries.getByOrganizerEnriched", () => {
      beforeEach(async () => {
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
          slug: "pr_count",
          name: "PR Count",
          description: "Number of PRs",
          hidden: false,
        });

        await organizerAggregateDefinitionQueries.upsert(db, {
          slug: "issue_count",
          name: "Issue Count",
          description: "Number of issues",
          hidden: false,
        });

        await organizerAggregateDefinitionQueries.upsert(db, {
          slug: "hidden_stat",
          name: "Hidden Stat",
          description: "Should not appear",
          hidden: true,
        });

        await organizerAggregateQueries.upsert(db, {
          aggregate: "pr_count",
          organizer: "alice",
          value: { type: "number", value: 10 },
          meta: null,
        });

        await organizerAggregateQueries.upsert(db, {
          aggregate: "issue_count",
          organizer: "alice",
          value: { type: "number", value: 5 },
          meta: null,
        });

        await organizerAggregateQueries.upsert(db, {
          aggregate: "hidden_stat",
          organizer: "alice",
          value: { type: "number", value: 999 },
          meta: null,
        });
      });

      it("should return enriched aggregates", async () => {
        const result = await organizerAggregateQueries.getByOrganizerEnriched(
          db,
          "alice",
          ["pr_count", "issue_count"],
        );

        expect(result).toHaveLength(2);
        expect(result[0].aggregate).toBe("issue_count");
        expect(result[0].name).toBe("Issue Count");
        expect(result[0].value).toEqual({ type: "number", value: 5 });
        expect(result[1].aggregate).toBe("pr_count");
      });

      it("should filter out hidden aggregates", async () => {
        const result = await organizerAggregateQueries.getByOrganizerEnriched(
          db,
          "alice",
          ["pr_count", "hidden_stat"],
        );

        expect(result).toHaveLength(1);
        expect(result[0].aggregate).toBe("pr_count");
      });

      it("should return empty array for empty slugs", async () => {
        const result = await organizerAggregateQueries.getByOrganizerEnriched(
          db,
          "alice",
          [],
        );

        expect(result).toHaveLength(0);
      });
    });

    describe("organizerBadgeQueries.getRecentEnriched", () => {
      beforeEach(async () => {
        await organizerQueries.upsert(db, {
          username: "alice",
          name: "Alice Smith",
          title: null,
          avatar_url: "https://example.com/alice.png",
          bio: null,
          joining_date: null,
          meta: null,
        });

        await organizerQueries.upsert(db, {
          username: "bob",
          name: "Bob Jones",
          title: null,
          avatar_url: null,
          bio: null,
          joining_date: null,
          meta: null,
        });

        await badgeDefinitionQueries.upsert(db, {
          slug: "organizer",
          name: "Organizer Badge",
          description: "First contribution",
          variants: {
            bronze: { description: "Bronze", svg_url: "/bronze.svg" },
            silver: { description: "Silver", svg_url: "/silver.svg" },
          },
        });

        await organizerBadgeQueries.award(db, {
          slug: "badge1",
          badge: "organizer",
          organizer: "alice",
          variant: "bronze",
          achieved_on: "2025-01-01",
          meta: null,
        });

        await organizerBadgeQueries.award(db, {
          slug: "badge2",
          badge: "organizer",
          organizer: "bob",
          variant: "silver",
          achieved_on: "2025-01-02",
          meta: null,
        });
      });

      it("should return enriched badges", async () => {
        const result = await organizerBadgeQueries.getRecentEnriched(db, 10);

        expect(result).toHaveLength(2);
        expect(result[0].organizer).toBe("bob");
        expect(result[0].organizer_name).toBe("Bob Jones");
        expect(result[0].badge_name).toBe("Organizer Badge");
        expect(result[0].badge_variants).toHaveProperty("bronze");
        expect(result[1].organizer).toBe("alice");
        expect(result[1].organizer_avatar_url).toBe(
          "https://example.com/alice.png",
        );
      });

      it("should respect limit", async () => {
        const result = await organizerBadgeQueries.getRecentEnriched(db, 1);

        expect(result).toHaveLength(1);
        expect(result[0].organizer).toBe("bob");
      });

      it("should sort by achieved_on descending", async () => {
        const result = await organizerBadgeQueries.getRecentEnriched(db);

        expect(
          new Date(result[0].achieved_on).getTime(),
        ).toBeGreaterThanOrEqual(new Date(result[1].achieved_on).getTime());
      });
    });

    describe("organizerBadgeQueries.getTopEarnersEnriched", () => {
      beforeEach(async () => {
        await organizerQueries.upsert(db, {
          username: "alice",
          name: "Alice Smith",
          title: null,
          avatar_url: "https://example.com/alice.png",
          bio: null,
          joining_date: null,
          meta: null,
        });

        await organizerQueries.upsert(db, {
          username: "bob",
          name: "Bob Jones",
          title: null,
          avatar_url: null,
          bio: null,
          joining_date: null,
          meta: null,
        });

        await badgeDefinitionQueries.upsert(db, {
          slug: "badge1",
          name: "Badge 1",
          description: "First badge",
          variants: { default: { description: "Default", svg_url: "/1.svg" } },
        });

        await badgeDefinitionQueries.upsert(db, {
          slug: "badge2",
          name: "Badge 2",
          description: "Second badge",
          variants: { default: { description: "Default", svg_url: "/2.svg" } },
        });

        await organizerBadgeQueries.award(db, {
          slug: "b1",
          badge: "badge1",
          organizer: "alice",
          variant: "default",
          achieved_on: "2025-01-01",
          meta: null,
        });

        await organizerBadgeQueries.award(db, {
          slug: "b2",
          badge: "badge2",
          organizer: "alice",
          variant: "default",
          achieved_on: "2025-01-02",
          meta: null,
        });

        await organizerBadgeQueries.award(db, {
          slug: "b3",
          badge: "badge1",
          organizer: "bob",
          variant: "default",
          achieved_on: "2025-01-03",
          meta: null,
        });
      });

      it("should return top earners with badge count", async () => {
        const result = await organizerBadgeQueries.getTopEarnersEnriched(
          db,
          10,
        );

        expect(result).toHaveLength(2);
        expect(result[0].username).toBe("alice");
        expect(result[0].badge_count).toBe(2);
        expect(result[0].name).toBe("Alice Smith");
        expect(result[1].username).toBe("bob");
        expect(result[1].badge_count).toBe(1);
      });

      it("should respect limit", async () => {
        const result = await organizerBadgeQueries.getTopEarnersEnriched(db, 1);

        expect(result).toHaveLength(1);
        expect(result[0].username).toBe("alice");
      });

      it("should sort by badge count descending", async () => {
        const result = await organizerBadgeQueries.getTopEarnersEnriched(db);

        expect(result[0].badge_count).toBeGreaterThanOrEqual(
          result[1].badge_count,
        );
      });
    });
  });
});
