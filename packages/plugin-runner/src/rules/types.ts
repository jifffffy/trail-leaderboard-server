/**
 * Badge rule type definitions
 *
 * Declarative rule types (Threshold, Streak, Growth, Composite) are defined in
 * @starter/leaderboard-api so plugins can reference them.
 * The CustomBadgeRule type is internal to the plugin-runner.
 */

import type {
  AggregateValue,
  CompositeBadgeRule,
  BadgeRuleDefinition as DeclarativeBadgeRuleDefinition,
  GrowthBadgeRule,
  Organizer,
  Race,
  StreakBadgeRule,
  ThresholdBadgeRule,
} from "@starter/leaderboard-api";

// Re-export declarative rule types for internal use
export type {
  CompositeBadgeRule,
  GrowthBadgeRule,
  StreakBadgeRule,
  ThresholdBadgeRule,
};

/**
 * Base rule interface
 */
export interface BadgeRule {
  type: string;
  badgeSlug: string;
  enabled: boolean;
}

/**
 * Custom function-based rules (internal to plugin-runner, not serializable)
 */
export interface CustomBadgeRule extends BadgeRule {
  type: "custom";
  evaluator: (
    organizer: Organizer,
    aggregates: Map<string, AggregateValue>,
    races: Race[],
  ) => {
    shouldAward: boolean;
    variant: string;
    meta?: Record<string, unknown>;
  } | null;
}

/**
 * Full badge rule union type (includes custom rules for internal use)
 */
export type BadgeRuleDefinition =
  DeclarativeBadgeRuleDefinition | CustomBadgeRule;

/**
 * Rule evaluation result
 */
export interface RuleEvaluationResult {
  shouldAward: boolean;
  variant: string;
  achievedOn?: string;
  meta?: Record<string, unknown>;
}
