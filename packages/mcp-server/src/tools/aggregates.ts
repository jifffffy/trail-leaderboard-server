/**
 * Badge and aggregate query tools
 */

import {
  badgeDefinitionQueries,
  globalAggregateQueries,
  organizerAggregateDefinitionQueries,
  organizerAggregateQueries,
  organizerBadgeQueries,
  raceQueries,
} from "@starter/leaderboard-api";
import { z } from "zod";
import type { ServerContext, ToolResult } from "../types.js";
import { createErrorResult, createSuccessResult } from "../utils.js";

/**
 * Schema for get_badges tool
 */
export const GetBadgesSchema = z.object({
  username: z
    .string()
    .optional()
    .describe("Get badges for a specific organizer"),
  badge_slug: z.string().optional().describe("Get specific badge definition"),
});

/**
 * Get badge definitions or organizer badges
 */
export async function getBadges(
  args: z.infer<typeof GetBadgesSchema>,
  context: ServerContext,
): Promise<ToolResult> {
  try {
    // Get badges for a specific organizer
    if (args.username) {
      const badges = await organizerBadgeQueries.getByOrganizer(
        context.db,
        args.username,
      );

      return createSuccessResult({
        username: args.username,
        badges,
        total: badges.length,
      });
    }

    // Get specific badge definition
    if (args.badge_slug) {
      const badge = await badgeDefinitionQueries.getBySlug(
        context.db,
        args.badge_slug,
      );

      if (!badge) {
        return createErrorResult(`Badge not found: ${args.badge_slug}`);
      }

      return createSuccessResult(badge);
    }

    // Get all badge definitions
    const badges = await badgeDefinitionQueries.getAll(context.db);

    return createSuccessResult({
      badges,
      total: badges.length,
    });
  } catch (error) {
    return createErrorResult(error as Error);
  }
}

/**
 * Schema for get_recent_badges tool
 */
export const GetRecentBadgesSchema = z.object({
  limit: z.number().optional().describe("Maximum number of results (1-100)"),
});

/**
 * Get recently awarded badges
 */
export async function getRecentBadges(
  args: z.infer<typeof GetRecentBadgesSchema>,
  context: ServerContext,
): Promise<ToolResult> {
  try {
    const limit = Math.min(args.limit || 20, 100);

    const recentBadges = await organizerBadgeQueries.getRecentEnriched(
      context.db,
      limit,
    );

    return createSuccessResult({
      recent_badges: recentBadges,
      total: recentBadges.length,
    });
  } catch (error) {
    return createErrorResult(error as Error);
  }
}

/**
 * Schema for get_top_badge_earners tool
 */
export const GetTopBadgeEarnersSchema = z.object({
  limit: z.number().optional().describe("Maximum number of results (1-100)"),
});

/**
 * Get organizers with the most badges
 */
export async function getTopBadgeEarners(
  args: z.infer<typeof GetTopBadgeEarnersSchema>,
  context: ServerContext,
): Promise<ToolResult> {
  try {
    const limit = Math.min(args.limit || 10, 100);

    const topEarners = await organizerBadgeQueries.getTopEarnersEnriched(
      context.db,
      limit,
    );

    // Add rank to each entry
    const rankedEarners = topEarners.map((entry, index) => ({
      rank: index + 1,
      ...entry,
    }));

    return createSuccessResult({
      top_earners: rankedEarners,
      total: rankedEarners.length,
    });
  } catch (error) {
    return createErrorResult(error as Error);
  }
}

/**
 * Schema for get_global_aggregates tool
 */
export const GetGlobalAggregatesSchema = z.object({
  slugs: z
    .array(z.string())
    .optional()
    .describe("Filter by specific aggregate slugs"),
});

/**
 * Get organization-level aggregates
 */
export async function getGlobalAggregates(
  args: z.infer<typeof GetGlobalAggregatesSchema>,
  context: ServerContext,
): Promise<ToolResult> {
  try {
    if (args.slugs && args.slugs.length > 0) {
      const aggregates = await globalAggregateQueries.getBySlugs(
        context.db,
        args.slugs,
      );

      return createSuccessResult({
        aggregates,
        total: aggregates.length,
      });
    }

    const aggregates = await globalAggregateQueries.getAllVisible(context.db);

    return createSuccessResult({
      aggregates,
      total: aggregates.length,
    });
  } catch (error) {
    return createErrorResult(error as Error);
  }
}

/**
 * Schema for get_organizer_aggregates tool
 */
export const GetOrganizerAggregatesSchema = z.object({
  username: z.string().describe("Organizer username"),
  slugs: z
    .array(z.string())
    .optional()
    .describe("Filter by specific aggregate slugs"),
});

/**
 * Get aggregates for a specific organizer
 */
export async function getOrganizerAggregates(
  args: z.infer<typeof GetOrganizerAggregatesSchema>,
  context: ServerContext,
): Promise<ToolResult> {
  try {
    if (args.slugs && args.slugs.length > 0) {
      const aggregates = await organizerAggregateQueries.getByOrganizerEnriched(
        context.db,
        args.username,
        args.slugs,
      );

      return createSuccessResult({
        username: args.username,
        aggregates,
        total: aggregates.length,
      });
    }

    const aggregates = await organizerAggregateQueries.getByOrganizer(
      context.db,
      args.username,
    );

    return createSuccessResult({
      username: args.username,
      aggregates,
      total: aggregates.length,
    });
  } catch (error) {
    return createErrorResult(error as Error);
  }
}

/**
 * Schema for get_aggregate_definitions tool
 */
export const GetAggregateDefinitionsSchema = z.object({
  visible_only: z
    .boolean()
    .optional()
    .default(true)
    .describe("Only return visible aggregate definitions"),
});

/**
 * Get organizer aggregate definitions
 */
export async function getAggregateDefinitions(
  args: z.infer<typeof GetAggregateDefinitionsSchema>,
  context: ServerContext,
): Promise<ToolResult> {
  try {
    const definitions = args.visible_only
      ? await organizerAggregateDefinitionQueries.getAllVisible(context.db)
      : await organizerAggregateDefinitionQueries.getAll(context.db);

    return createSuccessResult({
      definitions,
      total: definitions.length,
    });
  } catch (error) {
    return createErrorResult(error as Error);
  }
}

/**
 * Schema for batch_get_organizer_stats tool
 */
export const BatchGetOrganizerStatsSchema = z.object({
  usernames: z.array(z.string()).describe("List of organizer usernames"),
  include_aggregates: z
    .boolean()
    .optional()
    .default(false)
    .describe("Include organizer aggregates"),
  include_badges: z
    .boolean()
    .optional()
    .default(false)
    .describe("Include organizer badges"),
});

/**
 * Get statistics for multiple organizers in batch
 */
export async function batchGetOrganizerStats(
  args: z.infer<typeof BatchGetOrganizerStatsSchema>,
  context: ServerContext,
): Promise<ToolResult> {
  try {
    const results = await Promise.all(
      args.usernames.map(async (username) => {
        const totalPoints = await raceQueries.getTotalPointsByOrganizer(
          context.db,
          username,
        );

        const raceCount = await context.db.execute(
          "SELECT COUNT(*) as count FROM race WHERE organizer = ?",
          [username],
        );

        const stats: any = {
          username,
          totalPoints,
          raceCount: (raceCount.rows[0] as any).count,
        };

        if (args.include_aggregates) {
          stats.aggregates = await organizerAggregateQueries.getByOrganizer(
            context.db,
            username,
          );
        }

        if (args.include_badges) {
          stats.badges = await organizerBadgeQueries.getByOrganizer(
            context.db,
            username,
          );
        }

        return stats;
      }),
    );

    return createSuccessResult({
      results,
      total: results.length,
    });
  } catch (error) {
    return createErrorResult(error as Error);
  }
}
