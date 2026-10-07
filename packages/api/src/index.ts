/**
 * @starter/leaderboard-api
 *
 * Unified API package combining database utilities and plugin type definitions
 * for the leaderboard system.
 *
 * @packageDocumentation
 */

// Export all type definitions
export type {
  AggregateValue,
  BadgeDefinition,
  BadgeRuleDefinition,
  BadgeVariant,
  BatchResult,
  BatchStatement,
  CompositeBadgeRule,
  Database,
  ExecuteResult,
  GlobalAggregate,
  GrowthBadgeRule,
  Logger,
  NumberAggregateValue,
  NumberStatisticsAggregateValue,
  OrgConfig,
  Organizer,
  OrganizerAggregate,
  OrganizerAggregateDefinition,
  OrganizerBadge,
  Plugin,
  PluginConfig,
  PluginContext,
  PluginManifest,
  Race,
  RaceDefinition,
  StreakBadgeRule,
  StringAggregateValue,
  ThresholdBadgeRule,
} from "./types";

// Export database client utilities
export * from "./client";

// Export schema utilities
export * from "./schema";

// Export query helpers
export * from "./queries";

// Export utility functions
export * from "./utils";
