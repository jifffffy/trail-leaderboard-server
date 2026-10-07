/**
 * Badge rule evaluation engine
 */

import type {
  Database,
  Logger,
  Race,
  RaceDefinition,
} from "@starter/leaderboard-api";
import {
  badgeDefinitionQueries,
  organizerAggregateQueries,
  organizerBadgeQueries,
  organizerQueries,
  raceDefinitionQueries,
  raceQueries,
} from "@starter/leaderboard-api";
import type {
  BadgeRuleDefinition,
  CompositeBadgeRule,
  GrowthBadgeRule,
  RuleEvaluationResult,
  StreakBadgeRule,
  ThresholdBadgeRule,
} from "./types";

/**
 * Match race definitions using regex patterns
 * @param patterns Array of regex patterns (e.g., ["pull_request_.*", "issue_.*"])
 * @param definitions All race definitions
 * @returns Matched race definition slugs
 */
function matchRaceDefinitions(
  patterns: string[] | undefined,
  definitions: RaceDefinition[],
): string[] {
  // Empty/undefined = all definitions
  if (!patterns || patterns.length === 0) {
    return definitions.map((d) => d.slug);
  }

  const regexes = patterns.map((p) => new RegExp(p));

  return definitions
    .filter((def) => regexes.some((regex) => regex.test(def.slug)))
    .map((d) => d.slug);
}

/**
 * Evaluate badge rules and award badges to organizers
 */
export async function evaluateBadgeRules(
  db: Database,
  logger: Logger,
  rules: BadgeRuleDefinition[],
): Promise<void> {
  logger.info("Evaluating badge rules", { ruleCount: rules.length });

  // Load all organizers
  const organizers = await organizerQueries.getAll(db);

  // Load badge definitions
  const badgeDefinitions = await badgeDefinitionQueries.getAll(db);

  // Load all race definitions (for streak rule filtering)
  const raceDefinitions = await raceDefinitionQueries.getAll(db);

  let awardsGiven = 0;

  for (const organizer of organizers) {
    // Evaluate each rule
    for (const rule of rules) {
      if (!rule.enabled) continue;

      const results = await evaluateRule(
        db,
        rule,
        organizer.username,
        raceDefinitions,
      );

      if (!results || results.length === 0) continue;

      // Check if badge definition exists
      const badgeDef = badgeDefinitions.find((b) => b.slug === rule.badgeSlug);
      if (!badgeDef) {
        logger.warn(`Badge definition not found: ${rule.badgeSlug}`);
        continue;
      }

      // Award each qualifying variant independently
      for (const result of results) {
        const { shouldAward, variant, achievedOn, meta } = result;

        if (!shouldAward) continue;

        const resolvedAchievedOn =
          achievedOn ?? new Date().toISOString().split("T")[0];

        // Check if variant exists in badge definition
        if (!badgeDef.variants[variant]) {
          logger.warn(
            `Variant ${variant} not found for badge ${rule.badgeSlug}`,
          );
          continue;
        }

        const badgeSlug = `${rule.badgeSlug}__${organizer.username}__${variant}`;

        // Check if this specific variant already exists
        const existingBadge =
          await organizerBadgeQueries.getByOrganizerAndBadge(
            db,
            organizer.username,
            rule.badgeSlug,
            variant,
          );

        if (!existingBadge) {
          // Award new badge variant
          await organizerBadgeQueries.award(db, {
            slug: badgeSlug,
            badge: rule.badgeSlug,
            organizer: organizer.username,
            variant,
            achieved_on: resolvedAchievedOn,
            meta: { ...meta, rule_type: rule.type, auto_awarded: true },
          });
          awardsGiven++;
          logger.debug(
            `Awarded ${rule.badgeSlug} (${variant}) to ${organizer.username}`,
          );
        }
      }
    }
  }

  logger.info("Badge evaluation complete", {
    awardsGiven,
  });
}

/**
 * Evaluate a single rule for a organizer
 */
async function evaluateRule(
  db: Database,
  rule: BadgeRuleDefinition,
  organizer: string,
  raceDefinitions: RaceDefinition[],
): Promise<RuleEvaluationResult[] | null> {
  switch (rule.type) {
    case "threshold":
      return evaluateThresholdRule(db, rule, organizer);
    case "streak":
      return evaluateStreakRule(db, rule, organizer, raceDefinitions);
    case "composite":
      return evaluateCompositeRule(db, rule, organizer);
    case "growth":
      return evaluateGrowthRule(db, rule, organizer);
    case "custom": {
      // For custom rules, load data and call evaluator
      const [aggregates, races, organizerData] = await Promise.all([
        organizerAggregateQueries.getByOrganizer(db, organizer),
        raceQueries.getByOrganizer(db, organizer),
        organizerQueries.getByUsername(db, organizer),
      ]);
      if (!organizerData) return null;
      const aggregateMap = new Map(
        aggregates.map((a) => [a.aggregate, a.value]),
      );
      const result = rule.evaluator(organizerData, aggregateMap, races);
      return result ? [result] : null;
    }
    default:
      return null;
  }
}

/**
 * Evaluate threshold-based rule using SQL filtering
 */
async function evaluateThresholdRule(
  db: Database,
  rule: ThresholdBadgeRule,
  organizer: string,
): Promise<RuleEvaluationResult[] | null> {
  // Get organizer's aggregate value using SQL
  const organizers =
    await organizerAggregateQueries.getOrganizersAboveThreshold(
      db,
      rule.aggregateSlug,
      Math.min(...rule.thresholds.map((t) => t.value)), // Minimum threshold
    );

  // Find this organizer
  const organizerData = organizers.find((c) => c.organizer === organizer);
  if (!organizerData) return null;

  // Sort thresholds by value ascending and collect ALL qualifying variants
  const sortedThresholds = [...rule.thresholds].sort(
    (a, b) => a.value - b.value,
  );

  const results: RuleEvaluationResult[] = [];

  for (const threshold of sortedThresholds) {
    if (organizerData.value >= threshold.value) {
      // Determine achieved_on from the race that crossed this threshold
      const achievedOn = await resolveThresholdAchievedOn(
        db,
        organizer,
        rule.aggregateSlug,
        threshold.value,
      );

      results.push({
        shouldAward: true,
        variant: threshold.variant,
        achievedOn,
        meta: {
          threshold: threshold.value,
          actualValue: organizerData.value,
        },
      });
    }
  }

  return results.length > 0 ? results : null;
}

/**
 * Resolve the achieved_on date for a threshold rule by finding the race
 * that caused the organizer to cross the threshold.
 *
 * Supports:
 * - `race_count` — date of the Nth race
 * - `race_count:<definition>` — date of the Nth race of that type
 * - `total_race_points` — date when cumulative points crossed the threshold
 * - Other aggregates — returns undefined (falls back to current date)
 */
async function resolveThresholdAchievedOn(
  db: Database,
  organizer: string,
  aggregateSlug: string,
  thresholdValue: number,
): Promise<string | undefined> {
  if (aggregateSlug === "race_count") {
    return (
      (await raceQueries.getDateAtOffset(db, organizer, thresholdValue - 1)) ??
      undefined
    );
  }

  if (aggregateSlug.startsWith("race_count:")) {
    const raceDefinition = aggregateSlug.slice("race_count:".length);
    return (
      (await raceQueries.getDateAtOffset(
        db,
        organizer,
        thresholdValue - 1,
        raceDefinition,
      )) ?? undefined
    );
  }

  if (aggregateSlug === "total_race_points") {
    return (
      (await raceQueries.getDateAtPointsThreshold(
        db,
        organizer,
        thresholdValue,
      )) ?? undefined
    );
  }

  return undefined;
}

/**
 * Evaluate streak-based rule with race definition filtering
 */
async function evaluateStreakRule(
  db: Database,
  rule: StreakBadgeRule,
  organizer: string,
  allRaceDefinitions: RaceDefinition[],
): Promise<RuleEvaluationResult[] | null> {
  // Match race definitions using regex patterns
  const matchedSlugs = matchRaceDefinitions(
    rule.raceDefinitions,
    allRaceDefinitions,
  );

  if (matchedSlugs.length === 0) return null;

  // Fetch filtered races using SQL
  const races = await raceQueries.getByOrganizerAndDefinitions(
    db,
    organizer,
    matchedSlugs,
  );

  if (races.length === 0) return null;

  // Calculate longest streak (union of all matched races)
  const {
    streak: longestStreak,
    startIndex,
    sortedDates,
  } = calculateLongestStreak(races, rule.streakType);

  // Sort thresholds by days ascending and collect ALL qualifying variants
  const sortedThresholds = [...rule.thresholds].sort((a, b) => a.days - b.days);

  const results: RuleEvaluationResult[] = [];

  for (const threshold of sortedThresholds) {
    if (longestStreak >= threshold.days) {
      // Compute achieved_on: the date when the streak first reached this threshold
      const achievedOnIndex = startIndex + threshold.days - 1;
      const achievedOn = sortedDates[achievedOnIndex];

      results.push({
        shouldAward: true,
        variant: threshold.variant,
        achievedOn,
        meta: {
          streakDays: longestStreak,
          requiredDays: threshold.days,
          raceDefinitions: matchedSlugs,
        },
      });
    }
  }

  return results.length > 0 ? results : null;
}

/**
 * Calculate the longest streak of consecutive days with race.
 * Returns both the streak length and the end date of the longest streak.
 */
function calculateLongestStreak(
  races: Race[],
  streakType: "daily" | "weekly" | "monthly",
): {
  streak: number;
  startIndex: number;
  endIndex: number;
  sortedDates: string[];
} {
  const empty = { streak: 0, startIndex: 0, endIndex: 0, sortedDates: [] };
  if (races.length === 0) return empty;

  // Get unique dates
  const uniqueDates = Array.from(
    new Set(races.map((a) => a.occurred_at.split("T")[0])),
  ).sort();

  if (uniqueDates.length === 0) return empty;

  let maxStreak = 1;
  let maxStreakEndIndex = 0;
  let maxStreakStartIndex = 0;
  let currentStreak = 1;
  let currentStreakStartIndex = 0;

  for (let i = 1; i < uniqueDates.length; i++) {
    const prevDate = new Date(uniqueDates[i - 1]);
    const currDate = new Date(uniqueDates[i]);

    // Calculate difference in days
    const diffTime = currDate.getTime() - prevDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (streakType === "daily") {
      if (diffDays === 1) {
        currentStreak++;
        if (currentStreak > maxStreak) {
          maxStreak = currentStreak;
          maxStreakEndIndex = i;
          maxStreakStartIndex = currentStreakStartIndex;
        }
      } else {
        currentStreak = 1;
        currentStreakStartIndex = i;
      }
    } else if (streakType === "weekly") {
      // For weekly, consider within 7 days as consecutive
      if (diffDays <= 7) {
        currentStreak++;
        if (currentStreak > maxStreak) {
          maxStreak = currentStreak;
          maxStreakEndIndex = i;
          maxStreakStartIndex = currentStreakStartIndex;
        }
      } else {
        currentStreak = 1;
        currentStreakStartIndex = i;
      }
    } else if (streakType === "monthly") {
      // For monthly, check if in consecutive months
      const prevMonth = prevDate.getMonth();
      const currMonth = currDate.getMonth();
      const prevYear = prevDate.getFullYear();
      const currYear = currDate.getFullYear();

      if (
        (currYear === prevYear && currMonth === prevMonth + 1) ||
        (currYear === prevYear + 1 && currMonth === 0 && prevMonth === 11)
      ) {
        currentStreak++;
        if (currentStreak > maxStreak) {
          maxStreak = currentStreak;
          maxStreakEndIndex = i;
          maxStreakStartIndex = currentStreakStartIndex;
        }
      } else {
        currentStreak = 1;
        currentStreakStartIndex = i;
      }
    }
  }

  return {
    streak: maxStreak,
    startIndex: maxStreakStartIndex,
    endIndex: maxStreakEndIndex,
    sortedDates: uniqueDates,
  };
}

/**
 * Evaluate growth-based rule
 * Note: This is a simplified implementation
 * A full implementation would require historical aggregate data
 */
async function evaluateGrowthRule(
  db: Database,
  rule: GrowthBadgeRule,
  organizer: string,
): Promise<RuleEvaluationResult[] | null> {
  // For now, return null as we don't have historical data
  // This would require storing aggregate values over time
  return null;
}

/**
 * Evaluate composite rule (multiple conditions) using SQL queries
 */
async function evaluateCompositeRule(
  db: Database,
  rule: CompositeBadgeRule,
  organizer: string,
): Promise<RuleEvaluationResult[] | null> {
  const results: boolean[] = [];

  for (const condition of rule.conditions) {
    // Fetch aggregate from DB
    const aggregates =
      await organizerAggregateQueries.getOrganizersWithAggregate(
        db,
        condition.aggregateSlug,
      );

    const organizerAggregate = aggregates.find(
      (a) => a.organizer === organizer,
    );
    if (!organizerAggregate || organizerAggregate.value.type !== "number") {
      results.push(false);
      continue;
    }

    // Evaluate condition
    let conditionMet = false;
    const value = organizerAggregate.value.value;

    switch (condition.operator) {
      case ">":
        conditionMet = value > condition.value;
        break;
      case "<":
        conditionMet = value < condition.value;
        break;
      case ">=":
        conditionMet = value >= condition.value;
        break;
      case "<=":
        conditionMet = value <= condition.value;
        break;
      case "==":
        conditionMet = value === condition.value;
        break;
      case "!=":
        conditionMet = value !== condition.value;
        break;
    }

    results.push(conditionMet);
  }

  // Evaluate based on operator
  const shouldAward =
    rule.operator === "AND" ? results.every((r) => r) : results.some((r) => r);

  return shouldAward
    ? [
        {
          shouldAward: true,
          variant: rule.variant,
          meta: { conditions: rule.conditions },
        },
      ]
    : null;
}
