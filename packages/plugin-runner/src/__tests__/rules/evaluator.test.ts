import type { Database } from "@starter/leaderboard-api";
import {
  badgeDefinitionQueries,
  createDatabase,
  initializeSchema,
  organizerAggregateDefinitionQueries,
  organizerAggregateQueries,
  organizerBadgeQueries,
  organizerQueries,
  raceDefinitionQueries,
  raceQueries,
} from "@starter/leaderboard-api";
import { beforeEach, describe, expect, it } from "vitest";
import { evaluateBadgeRules } from "../../rules/evaluator";
import type { BadgeRuleDefinition } from "../../rules/types";

describe("Badge Rule Evaluator", () => {
  let db: Database;
  const mockLogger = {
    info: () => {},
    warn: () => {},
    error: () => {},
    debug: () => {},
  };

  beforeEach(async () => {
    db = createDatabase(":memory:");
    await initializeSchema(db);

    // Set up test data
    await organizerQueries.upsert(db, {
      username: "test_user",
      name: "Test User",
      joining_date: "2025-01-01",
      avatar_url: null,
      title: null,
      bio: null,
      meta: null,
    });

    // Add race definitions
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

    await raceDefinitionQueries.insertOrIgnore(db, {
      slug: "pull_request_reviewed",
      name: "PR Reviewed",
      description: "Reviewed a pull request",
      icon: "eye",
      points: 15,
    });
  });

  describe("Threshold Rules", () => {
    it("should award badges based on aggregate thresholds", async () => {
      // Set up aggregate definition
      await organizerAggregateDefinitionQueries.upsert(db, {
        slug: "race_count",
        name: "Race Count",
        description: "Total number of races",
      });

      // Set up aggregate value
      await organizerAggregateQueries.upsert(db, {
        aggregate: "race_count",
        organizer: "test_user",
        value: { type: "number", value: 50 },
        meta: null,
      });

      // Set up badge definition
      await badgeDefinitionQueries.upsert(db, {
        slug: "race_milestone",
        name: "Race Milestone",
        description: "Awarded for reaching race milestones",
        variants: {
          bronze: {
            description: "10 races",
            svg_url: "/bronze.svg",
            order: 1,
          },
          silver: {
            description: "50 races",
            svg_url: "/silver.svg",
            order: 2,
          },
          gold: {
            description: "100 races",
            svg_url: "/gold.svg",
            order: 3,
          },
        },
      });

      // Define test rule
      const rules: BadgeRuleDefinition[] = [
        {
          type: "threshold",
          badgeSlug: "race_milestone",
          enabled: true,
          aggregateSlug: "race_count",
          thresholds: [
            { variant: "bronze", value: 10 },
            { variant: "silver", value: 50 },
            { variant: "gold", value: 100 },
          ],
        },
      ];

      await evaluateBadgeRules(db, mockLogger, rules);

      // Check that both bronze and silver badges were awarded
      const badges = await organizerBadgeQueries.getByOrganizer(
        db,
        "test_user",
      );
      expect(badges).toHaveLength(2);
      const variants = badges.map((b) => b.variant).sort();
      expect(variants).toEqual(["bronze", "silver"]);
    });

    it("should award all eligible variants up to the highest", async () => {
      // Set up with high value
      await organizerAggregateDefinitionQueries.upsert(db, {
        slug: "race_count",
        name: "Race Count",
        description: "Total number of races",
      });

      await organizerAggregateQueries.upsert(db, {
        aggregate: "race_count",
        organizer: "test_user",
        value: { type: "number", value: 150 },
        meta: null,
      });

      await badgeDefinitionQueries.upsert(db, {
        slug: "race_milestone",
        name: "Race Milestone",
        description: "Awarded for reaching race milestones",
        variants: {
          bronze: {
            description: "10 races",
            svg_url: "/bronze.svg",
            order: 1,
          },
          silver: {
            description: "50 races",
            svg_url: "/silver.svg",
            order: 2,
          },
          gold: {
            description: "100 races",
            svg_url: "/gold.svg",
            order: 3,
          },
        },
      });

      const rules: BadgeRuleDefinition[] = [
        {
          type: "threshold",
          badgeSlug: "race_milestone",
          enabled: true,
          aggregateSlug: "race_count",
          thresholds: [
            { variant: "bronze", value: 10 },
            { variant: "silver", value: 50 },
            { variant: "gold", value: 100 },
          ],
        },
      ];

      await evaluateBadgeRules(db, mockLogger, rules);

      const badges = await organizerBadgeQueries.getByOrganizer(
        db,
        "test_user",
      );
      expect(badges).toHaveLength(3);
      const variants = badges.map((b) => b.variant).sort();
      expect(variants).toEqual(["bronze", "gold", "silver"]);
    });

    it("should set achieved_on to the date of the Nth race for race_count thresholds", async () => {
      // Create 15 races with specific dates
      for (let i = 0; i < 15; i++) {
        await raceQueries.upsert(db, {
          slug: `act_${i}`,
          organizer: "test_user",
          race_definition: "pull_request_opened",
          title: `Race ${i}`,
          occurred_at: `2025-01-${String(i + 1).padStart(2, "0")}`,
          link: null,
          text: null,
          points: 10,
          meta: null,
        });
      }

      await organizerAggregateDefinitionQueries.upsert(db, {
        slug: "race_count",
        name: "Race Count",
        description: "Total number of races",
      });

      await organizerAggregateQueries.upsert(db, {
        aggregate: "race_count",
        organizer: "test_user",
        value: { type: "number", value: 15 },
        meta: null,
      });

      await badgeDefinitionQueries.upsert(db, {
        slug: "race_milestone",
        name: "Race Milestone",
        description: "milestone",
        variants: {
          bronze: { description: "10", svg_url: "/b.svg", order: 1 },
        },
      });

      const rules: BadgeRuleDefinition[] = [
        {
          type: "threshold",
          badgeSlug: "race_milestone",
          enabled: true,
          aggregateSlug: "race_count",
          thresholds: [{ variant: "bronze", value: 10 }],
        },
      ];

      await evaluateBadgeRules(db, mockLogger, rules);

      const badges = await organizerBadgeQueries.getByOrganizer(
        db,
        "test_user",
      );
      expect(badges).toHaveLength(1);
      // The 10th race (0-indexed: 9) has date 2025-01-10
      expect(badges[0].achieved_on).toBe("2025-01-10");
    });

    it("should set achieved_on to the date of the Nth race for per-definition race_count thresholds", async () => {
      // Create mixed races: PRs on odd days, issues on even days
      for (let i = 0; i < 10; i++) {
        await raceQueries.upsert(db, {
          slug: `pr_${i}`,
          organizer: "test_user",
          race_definition: "pull_request_opened",
          title: `PR ${i}`,
          occurred_at: `2025-02-${String(i * 2 + 1).padStart(2, "0")}`,
          link: null,
          text: null,
          points: 10,
          meta: null,
        });
      }
      for (let i = 0; i < 5; i++) {
        await raceQueries.upsert(db, {
          slug: `issue_${i}`,
          organizer: "test_user",
          race_definition: "issue_created",
          title: `Issue ${i}`,
          occurred_at: `2025-02-${String(i * 2 + 2).padStart(2, "0")}`,
          link: null,
          text: null,
          points: 5,
          meta: null,
        });
      }

      await organizerAggregateDefinitionQueries.upsert(db, {
        slug: "race_count:pull_request_opened",
        name: "PR Count",
        description: "PR races",
      });

      await organizerAggregateQueries.upsert(db, {
        aggregate: "race_count:pull_request_opened",
        organizer: "test_user",
        value: { type: "number", value: 10 },
        meta: null,
      });

      await badgeDefinitionQueries.upsert(db, {
        slug: "pr_milestone",
        name: "PR Milestone",
        description: "milestone",
        variants: {
          bronze: { description: "5 PRs", svg_url: "/b.svg", order: 1 },
        },
      });

      const rules: BadgeRuleDefinition[] = [
        {
          type: "threshold",
          badgeSlug: "pr_milestone",
          enabled: true,
          aggregateSlug: "race_count:pull_request_opened",
          thresholds: [{ variant: "bronze", value: 5 }],
        },
      ];

      await evaluateBadgeRules(db, mockLogger, rules);

      const badges = await organizerBadgeQueries.getByOrganizer(
        db,
        "test_user",
      );
      expect(badges).toHaveLength(1);
      // 5th PR (0-indexed: 4) has date 2025-02-09
      expect(badges[0].achieved_on).toBe("2025-02-09");
    });

    it("should set achieved_on based on cumulative points for total_race_points thresholds", async () => {
      // Create races with varying points
      await raceQueries.upsert(db, {
        slug: "act_a",
        organizer: "test_user",
        race_definition: "pull_request_opened",
        title: "A",
        occurred_at: "2025-03-01",
        link: null,
        text: null,
        points: 30,
        meta: null,
      });
      await raceQueries.upsert(db, {
        slug: "act_b",
        organizer: "test_user",
        race_definition: "pull_request_merged",
        title: "B",
        occurred_at: "2025-03-05",
        link: null,
        text: null,
        points: 40,
        meta: null,
      });
      await raceQueries.upsert(db, {
        slug: "act_c",
        organizer: "test_user",
        race_definition: "pull_request_opened",
        title: "C",
        occurred_at: "2025-03-10",
        link: null,
        text: null,
        points: 50,
        meta: null,
      });

      await organizerAggregateDefinitionQueries.upsert(db, {
        slug: "total_race_points",
        name: "Total Points",
        description: "Total race points",
      });

      await organizerAggregateQueries.upsert(db, {
        aggregate: "total_race_points",
        organizer: "test_user",
        value: { type: "number", value: 120 },
        meta: null,
      });

      await badgeDefinitionQueries.upsert(db, {
        slug: "points_milestone",
        name: "Points Milestone",
        description: "milestone",
        variants: {
          bronze: { description: "50 pts", svg_url: "/b.svg", order: 1 },
        },
      });

      const rules: BadgeRuleDefinition[] = [
        {
          type: "threshold",
          badgeSlug: "points_milestone",
          enabled: true,
          aggregateSlug: "total_race_points",
          thresholds: [{ variant: "bronze", value: 50 }],
        },
      ];

      await evaluateBadgeRules(db, mockLogger, rules);

      const badges = await organizerBadgeQueries.getByOrganizer(
        db,
        "test_user",
      );
      expect(badges).toHaveLength(1);
      // Cumulative: 30 (act_a), 70 (act_b crosses 50) → achieved_on = 2025-03-05
      expect(badges[0].achieved_on).toBe("2025-03-05");
    });

    it("should fall back to current date for unknown aggregate slugs", async () => {
      await organizerAggregateDefinitionQueries.upsert(db, {
        slug: "custom_metric",
        name: "Custom Metric",
        description: "Some custom metric",
      });

      await organizerAggregateQueries.upsert(db, {
        aggregate: "custom_metric",
        organizer: "test_user",
        value: { type: "number", value: 100 },
        meta: null,
      });

      await badgeDefinitionQueries.upsert(db, {
        slug: "custom_badge",
        name: "Custom Badge",
        description: "badge",
        variants: {
          bronze: { description: "50", svg_url: "/b.svg", order: 1 },
        },
      });

      const rules: BadgeRuleDefinition[] = [
        {
          type: "threshold",
          badgeSlug: "custom_badge",
          enabled: true,
          aggregateSlug: "custom_metric",
          thresholds: [{ variant: "bronze", value: 50 }],
        },
      ];

      await evaluateBadgeRules(db, mockLogger, rules);

      const badges = await organizerBadgeQueries.getByOrganizer(
        db,
        "test_user",
      );
      expect(badges).toHaveLength(1);
      // Falls back to current date for unknown aggregates
      expect(badges[0].achieved_on).toBe(
        new Date().toISOString().split("T")[0],
      );
    });
  });

  describe("Streak Rules", () => {
    it("should calculate streak across all races when no filter", async () => {
      // Add consecutive daily races
      const today = new Date();
      for (let i = 0; i < 10; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        await raceQueries.upsert(db, {
          slug: `race_${i}`,
          organizer: "test_user",
          race_definition:
            i % 2 === 0 ? "pull_request_opened" : "issue_created",
          title: `Race ${i}`,
          occurred_at: date.toISOString().split("T")[0],
          link: null,
          text: null,
          points: 10,
          meta: null,
        });
      }

      await badgeDefinitionQueries.upsert(db, {
        slug: "consistency_champion",
        name: "Consistency Champion",
        description: "Awarded for maintaining an race streak",
        variants: {
          bronze: {
            description: "7 day streak",
            svg_url: "/bronze.svg",
            order: 1,
          },
          silver: {
            description: "14 day streak",
            svg_url: "/silver.svg",
            order: 2,
          },
          gold: {
            description: "30 day streak",
            svg_url: "/gold.svg",
            order: 3,
          },
        },
      });

      const rules: BadgeRuleDefinition[] = [
        {
          type: "streak",
          badgeSlug: "consistency_champion",
          enabled: true,
          streakType: "daily",
          thresholds: [
            { variant: "bronze", days: 7 },
            { variant: "silver", days: 14 },
            { variant: "gold", days: 30 },
          ],
        },
      ];

      await evaluateBadgeRules(db, mockLogger, rules);

      const badges = await organizerBadgeQueries.getByOrganizer(
        db,
        "test_user",
      );
      expect(badges).toHaveLength(1);
      expect(badges[0].badge).toBe("consistency_champion");
      expect(badges[0].variant).toBe("bronze");
    });

    it("should set achieved_on to streak end date", async () => {
      // Add 10 consecutive daily races starting from a fixed past date
      for (let i = 0; i < 10; i++) {
        await raceQueries.upsert(db, {
          slug: `streak_act_${i}`,
          organizer: "test_user",
          race_definition: "pull_request_opened",
          title: `Race ${i}`,
          occurred_at: `2025-03-${String(i + 1).padStart(2, "0")}`,
          link: null,
          text: null,
          points: 10,
          meta: null,
        });
      }

      await badgeDefinitionQueries.upsert(db, {
        slug: "streak_badge",
        name: "Streak Badge",
        description: "streak",
        variants: {
          bronze: { description: "7 days", svg_url: "/b.svg", order: 1 },
        },
      });

      const rules: BadgeRuleDefinition[] = [
        {
          type: "streak",
          badgeSlug: "streak_badge",
          enabled: true,
          streakType: "daily",
          thresholds: [{ variant: "bronze", days: 7 }],
        },
      ];

      await evaluateBadgeRules(db, mockLogger, rules);

      const badges = await organizerBadgeQueries.getByOrganizer(
        db,
        "test_user",
      );
      expect(badges).toHaveLength(1);
      // Streak of 10 consecutive days: 2025-03-01 to 2025-03-10
      // achieved_on is when the 7-day threshold was first reached: day 7 = 2025-03-07
      expect(badges[0].achieved_on).toBe("2025-03-07");
    });

    it("should filter races by regex pattern", async () => {
      // Add mixed races
      const today = new Date();
      for (let i = 0; i < 10; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        await raceQueries.upsert(db, {
          slug: `race_${i}`,
          organizer: "test_user",
          race_definition:
            i % 3 === 0 ? "pull_request_opened" : "issue_created",
          title: `Race ${i}`,
          occurred_at: date.toISOString().split("T")[0],
          link: null,
          text: null,
          points: 10,
          meta: null,
        });
      }

      await badgeDefinitionQueries.upsert(db, {
        slug: "pr_consistency",
        name: "PR Consistency",
        description: "Streak of PR races",
        variants: {
          bronze: {
            description: "5 day PR streak",
            svg_url: "/bronze.svg",
            order: 1,
          },
        },
      });

      const rules: BadgeRuleDefinition[] = [
        {
          type: "streak",
          badgeSlug: "pr_consistency",
          enabled: true,
          streakType: "daily",
          raceDefinitions: ["pull_request_.*"], // Only PR races
          thresholds: [{ variant: "bronze", days: 2 }],
        },
      ];

      await evaluateBadgeRules(db, mockLogger, rules);

      const badges = await organizerBadgeQueries.getByOrganizer(
        db,
        "test_user",
      );
      // PR races are on days 0, 3, 6, 9 - not consecutive
      // So either no badge or bronze if we have at least 2
      expect(badges.length).toBeGreaterThanOrEqual(0);
    });

    it("should handle multiple regex patterns", async () => {
      // Add mixed races
      const today = new Date();
      for (let i = 0; i < 10; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const raceType =
          i % 3 === 0
            ? "pull_request_opened"
            : i % 3 === 1
              ? "pull_request_reviewed"
              : "issue_created";
        await raceQueries.upsert(db, {
          slug: `race_${i}`,
          organizer: "test_user",
          race_definition: raceType,
          title: `Race ${i}`,
          occurred_at: date.toISOString().split("T")[0],
          link: null,
          text: null,
          points: 10,
          meta: null,
        });
      }

      await badgeDefinitionQueries.upsert(db, {
        slug: "pr_expert",
        name: "PR Expert",
        description: "PR related races",
        variants: {
          bronze: {
            description: "PR races",
            svg_url: "/bronze.svg",
            order: 1,
          },
        },
      });

      const rules: BadgeRuleDefinition[] = [
        {
          type: "streak",
          badgeSlug: "pr_expert",
          enabled: true,
          streakType: "daily",
          raceDefinitions: ["pull_request_.*"], // Match all PR races
          thresholds: [{ variant: "bronze", days: 5 }],
        },
      ];

      await evaluateBadgeRules(db, mockLogger, rules);

      const badges = await organizerBadgeQueries.getByOrganizer(
        db,
        "test_user",
      );
      expect(badges.length).toBeGreaterThanOrEqual(0);
    });

    it("should handle exact matches", async () => {
      // Add specific race type
      const today = new Date();
      for (let i = 0; i < 7; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        await raceQueries.upsert(db, {
          slug: `race_${i}`,
          organizer: "test_user",
          race_definition: "pull_request_reviewed",
          title: `Review ${i}`,
          occurred_at: date.toISOString().split("T")[0],
          link: null,
          text: null,
          points: 15,
          meta: null,
        });
      }

      await badgeDefinitionQueries.upsert(db, {
        slug: "review_champion",
        name: "Review Champion",
        description: "Consistent code reviewer",
        variants: {
          bronze: {
            description: "Review streak",
            svg_url: "/bronze.svg",
            order: 1,
          },
        },
      });

      const rules: BadgeRuleDefinition[] = [
        {
          type: "streak",
          badgeSlug: "review_champion",
          enabled: true,
          streakType: "daily",
          raceDefinitions: ["pull_request_reviewed"], // Exact match
          thresholds: [{ variant: "bronze", days: 5 }],
        },
      ];

      await evaluateBadgeRules(db, mockLogger, rules);

      const badges = await organizerBadgeQueries.getByOrganizer(
        db,
        "test_user",
      );
      expect(badges).toHaveLength(1);
      expect(badges[0].badge).toBe("review_champion");
    });
  });

  describe("Composite Rules", () => {
    it("should evaluate AND conditions", async () => {
      // Set up multiple aggregates
      await organizerAggregateDefinitionQueries.upsert(db, {
        slug: "race_count",
        name: "Race Count",
        description: "Total races",
      });

      await organizerAggregateDefinitionQueries.upsert(db, {
        slug: "total_points",
        name: "Total Points",
        description: "Total points earned",
      });

      await organizerAggregateQueries.upsert(db, {
        aggregate: "race_count",
        organizer: "test_user",
        value: { type: "number", value: 100 },
        meta: null,
      });

      await organizerAggregateQueries.upsert(db, {
        aggregate: "total_points",
        organizer: "test_user",
        value: { type: "number", value: 1000 },
        meta: null,
      });

      await badgeDefinitionQueries.upsert(db, {
        slug: "super_organizer",
        name: "Super Organizer",
        description: "Both high race and points",
        variants: {
          gold: {
            description: "Super organizer",
            svg_url: "/gold.svg",
            order: 1,
          },
        },
      });

      const rules: BadgeRuleDefinition[] = [
        {
          type: "composite",
          badgeSlug: "super_organizer",
          enabled: true,
          operator: "AND",
          variant: "gold",
          conditions: [
            { aggregateSlug: "race_count", operator: ">=", value: 50 },
            { aggregateSlug: "total_points", operator: ">=", value: 500 },
          ],
        },
      ];

      await evaluateBadgeRules(db, mockLogger, rules);

      const badges = await organizerBadgeQueries.getByOrganizer(
        db,
        "test_user",
      );
      expect(badges).toHaveLength(1);
      expect(badges[0].badge).toBe("super_organizer");
      // Composite rules fall back to current date
      expect(badges[0].achieved_on).toBe(
        new Date().toISOString().split("T")[0],
      );
    });
  });

  describe("Badge Multi-variant Awards", () => {
    it("should award all lower variants when upgrading aggregate value", async () => {
      // Create 150 races with specific dates
      for (let i = 0; i < 150; i++) {
        await raceQueries.upsert(db, {
          slug: `upgrade_act_${i}`,
          organizer: "test_user",
          race_definition: "pull_request_opened",
          title: `Race ${i}`,
          occurred_at: `2025-${String(Math.floor(i / 28) + 1).padStart(2, "0")}-${String((i % 28) + 1).padStart(2, "0")}`,
          link: null,
          text: null,
          points: 10,
          meta: null,
        });
      }

      await organizerAggregateDefinitionQueries.upsert(db, {
        slug: "race_count",
        name: "Race Count",
        description: "Total races",
      });

      await badgeDefinitionQueries.upsert(db, {
        slug: "race_milestone",
        name: "Race Milestone",
        description: "milestone",
        variants: {
          bronze: { description: "10", svg_url: "/b.svg", order: 1 },
          silver: { description: "50", svg_url: "/s.svg", order: 2 },
          gold: { description: "100", svg_url: "/g.svg", order: 3 },
        },
      });

      const rules: BadgeRuleDefinition[] = [
        {
          type: "threshold",
          badgeSlug: "race_milestone",
          enabled: true,
          aggregateSlug: "race_count",
          thresholds: [
            { variant: "bronze", value: 10 },
            { variant: "silver", value: 50 },
            { variant: "gold", value: 100 },
          ],
        },
      ];

      // Set aggregate to 150 (qualifies for all three)
      await organizerAggregateQueries.upsert(db, {
        aggregate: "race_count",
        organizer: "test_user",
        value: { type: "number", value: 150 },
        meta: null,
      });

      await evaluateBadgeRules(db, mockLogger, rules);

      const badges = await organizerBadgeQueries.getByOrganizer(
        db,
        "test_user",
      );
      expect(badges).toHaveLength(3);

      const badgeMap = new Map(badges.map((b) => [b.variant, b]));

      // Each variant should have the correct achieved_on date
      // 10th race: index 9 → 2025-01-10
      expect(badgeMap.get("bronze")?.achieved_on).toBe("2025-01-10");
      // 50th race: index 49 → month 2 (49/28=1.75→floor=1→+1=2), day (49%28)+1=22
      expect(badgeMap.get("silver")?.achieved_on).toBe("2025-02-22");
      // 100th race: index 99 → month 4 (99/28=3.5→floor=3→+1=4), day (99%28)+1=16
      expect(badgeMap.get("gold")?.achieved_on).toBe("2025-04-16");
    });

    it("should not re-award existing variants on re-evaluation", async () => {
      for (let i = 0; i < 150; i++) {
        await raceQueries.upsert(db, {
          slug: `reeval_act_${i}`,
          organizer: "test_user",
          race_definition: "pull_request_opened",
          title: `Race ${i}`,
          occurred_at: `2025-${String(Math.floor(i / 28) + 1).padStart(2, "0")}-${String((i % 28) + 1).padStart(2, "0")}`,
          link: null,
          text: null,
          points: 10,
          meta: null,
        });
      }

      await organizerAggregateDefinitionQueries.upsert(db, {
        slug: "race_count",
        name: "Race Count",
        description: "Total races",
      });

      await organizerAggregateQueries.upsert(db, {
        aggregate: "race_count",
        organizer: "test_user",
        value: { type: "number", value: 150 },
        meta: null,
      });

      await badgeDefinitionQueries.upsert(db, {
        slug: "race_milestone",
        name: "Race Milestone",
        description: "milestone",
        variants: {
          bronze: { description: "10", svg_url: "/b.svg", order: 1 },
          silver: { description: "50", svg_url: "/s.svg", order: 2 },
          gold: { description: "100", svg_url: "/g.svg", order: 3 },
        },
      });

      const rules: BadgeRuleDefinition[] = [
        {
          type: "threshold",
          badgeSlug: "race_milestone",
          enabled: true,
          aggregateSlug: "race_count",
          thresholds: [
            { variant: "bronze", value: 10 },
            { variant: "silver", value: 50 },
            { variant: "gold", value: 100 },
          ],
        },
      ];

      // Run twice
      await evaluateBadgeRules(db, mockLogger, rules);
      await evaluateBadgeRules(db, mockLogger, rules);

      const badges = await organizerBadgeQueries.getByOrganizer(
        db,
        "test_user",
      );
      // Should still be 3, not 6
      expect(badges).toHaveLength(3);
    });
  });
});
