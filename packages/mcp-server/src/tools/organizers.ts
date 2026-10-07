/**
 * Organizer query tools
 */

import {
  organizerAggregateQueries,
  organizerBadgeQueries,
  organizerQueries,
  raceQueries,
} from "@starter/leaderboard-api";
import { z } from "zod";
import type { ServerContext, ToolResult } from "../types.js";
import {
  createErrorResult,
  createSuccessResult,
  validatePagination,
} from "../utils.js";

/**
 * Schema for query_organizers tool
 */
export const QueryOrganizersSchema = z.object({
  limit: z.number().optional().describe("Maximum number of results (1-1000)"),
  offset: z.number().optional().describe("Number of results to skip"),
});

/**
 * Query organizers with optional filters
 */
export async function queryOrganizers(
  args: z.infer<typeof QueryOrganizersSchema>,
  context: ServerContext,
): Promise<ToolResult> {
  try {
    const { limit, offset } = validatePagination(args.limit, args.offset);

    const organizers = await organizerQueries.getAll(context.db);

    // Apply pagination
    const paginatedResults = organizers.slice(offset, offset + limit);

    return createSuccessResult({
      organizers: paginatedResults,
      total: organizers.length,
      limit,
      offset,
    });
  } catch (error) {
    return createErrorResult(error as Error);
  }
}

/**
 * Schema for get_organizer tool
 */
export const GetOrganizerSchema = z.object({
  username: z.string().describe("Organizer username"),
});

/**
 * Get detailed information about a specific organizer
 */
export async function getOrganizer(
  args: z.infer<typeof GetOrganizerSchema>,
  context: ServerContext,
): Promise<ToolResult> {
  try {
    const organizer = await organizerQueries.getByUsername(
      context.db,
      args.username,
    );

    if (!organizer) {
      return createErrorResult(`Organizer not found: ${args.username}`);
    }

    return createSuccessResult(organizer);
  } catch (error) {
    return createErrorResult(error as Error);
  }
}

/**
 * Schema for get_organizer_stats tool
 */
export const GetOrganizerStatsSchema = z.object({
  username: z.string().describe("Organizer username"),
});

/**
 * Get comprehensive statistics for a organizer
 */
export async function getOrganizerStats(
  args: z.infer<typeof GetOrganizerStatsSchema>,
  context: ServerContext,
): Promise<ToolResult> {
  try {
    const organizer = await organizerQueries.getByUsername(
      context.db,
      args.username,
    );

    if (!organizer) {
      return createErrorResult(`Organizer not found: ${args.username}`);
    }

    // Get races
    const races = await raceQueries.getByOrganizer(context.db, args.username);

    // Get total points
    const totalPoints = await raceQueries.getTotalPointsByOrganizer(
      context.db,
      args.username,
    );

    // Get aggregates
    const aggregates = await organizerAggregateQueries.getByOrganizer(
      context.db,
      args.username,
    );

    // Get badges
    const badges = await organizerBadgeQueries.getByOrganizer(
      context.db,
      args.username,
    );

    // Get race count by date
    const raceByDate = await raceQueries.getRaceCountByDate(
      context.db,
      args.username,
    );

    return createSuccessResult({
      organizer,
      stats: {
        totalPoints,
        raceCount: races.length,
        badgeCount: badges.length,
      },
      recentRaces: races.slice(0, 10),
      aggregates,
      badges,
      raceByDate: raceByDate.slice(-90), // Last 90 days
    });
  } catch (error) {
    return createErrorResult(error as Error);
  }
}

/**
 * Schema for batch_get_organizers tool
 */
export const BatchGetOrganizersSchema = z.object({
  usernames: z.array(z.string()).describe("List of organizer usernames"),
});

/**
 * Get multiple organizers in a single batch request
 */
export async function batchGetOrganizers(
  args: z.infer<typeof BatchGetOrganizersSchema>,
  context: ServerContext,
): Promise<ToolResult> {
  try {
    const results = await Promise.all(
      args.usernames.map(async (username) => {
        const organizer = await organizerQueries.getByUsername(
          context.db,
          username,
        );
        return {
          username,
          found: !!organizer,
          data: organizer,
        };
      }),
    );

    return createSuccessResult({
      results,
      total: results.length,
      found: results.filter((r) => r.found).length,
    });
  } catch (error) {
    return createErrorResult(error as Error);
  }
}
