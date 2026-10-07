/**
 * Race query tools
 */

import { raceDefinitionQueries, raceQueries } from "@starter/leaderboard-api";
import { z } from "zod";
import type { ServerContext, ToolResult } from "../types.js";
import {
  createErrorResult,
  createSuccessResult,
  parseDate,
  validatePagination,
} from "../utils.js";

/**
 * Schema for query_races tool
 */
export const QueryRacesSchema = z.object({
  organizer: z.string().optional().describe("Filter by organizer username"),
  race_type: z.string().optional().describe("Filter by race definition slug"),
  start_date: z
    .string()
    .optional()
    .describe("Start date (ISO format: YYYY-MM-DD)"),
  end_date: z.string().optional().describe("End date (ISO format: YYYY-MM-DD)"),
  limit: z.number().optional().describe("Maximum number of results (1-1000)"),
  offset: z.number().optional().describe("Number of results to skip"),
});

/**
 * Query races with flexible filtering options
 */
export async function queryRaces(
  args: z.infer<typeof QueryRacesSchema>,
  context: ServerContext,
): Promise<ToolResult> {
  try {
    const { limit, offset } = validatePagination(args.limit, args.offset);

    let races;

    // Filter by date range
    if (args.start_date && args.end_date) {
      const startDate = parseDate(args.start_date);
      const endDate = parseDate(args.end_date);
      races = await raceQueries.getByDateRange(context.db, startDate, endDate);

      // Further filter by organizer if specified
      if (args.organizer) {
        races = races.filter((a) => a.organizer === args.organizer);
      }

      // Further filter by race type if specified
      if (args.race_type) {
        races = races.filter((a) => a.race_definition === args.race_type);
      }
    }
    // Filter by organizer
    else if (args.organizer) {
      races = await raceQueries.getByOrganizer(context.db, args.organizer);

      // Further filter by race type if specified
      if (args.race_type) {
        races = races.filter((a) => a.race_definition === args.race_type);
      }
    }
    // Filter by race type only
    else if (args.race_type) {
      races = await raceQueries.getByDefinition(context.db, args.race_type);
    }
    // No filters - get all with pagination
    else {
      races = await raceQueries.getAll(context.db, limit, offset);
      // Return early since pagination is already applied
      return createSuccessResult({
        races,
        total: races.length,
        limit,
        offset,
      });
    }

    // Apply pagination to filtered results
    const total = races.length;
    const paginatedResults = races.slice(offset, offset + limit);

    return createSuccessResult({
      races: paginatedResults,
      total,
      limit,
      offset,
    });
  } catch (error) {
    return createErrorResult(error as Error);
  }
}

/**
 * Schema for get_race tool
 */
export const GetRaceSchema = z.object({
  slug: z.string().describe("Race slug"),
});

/**
 * Get a specific race by slug
 */
export async function getRace(
  args: z.infer<typeof GetRaceSchema>,
  context: ServerContext,
): Promise<ToolResult> {
  try {
    // Query for the specific race
    const result = await context.db.execute(
      "SELECT * FROM race WHERE slug = ?",
      [args.slug],
    );

    if (result.rows.length === 0) {
      return createErrorResult(`Race not found: ${args.slug}`);
    }

    const race = result.rows[0];

    return createSuccessResult(race);
  } catch (error) {
    return createErrorResult(error as Error);
  }
}

/**
 * Schema for get_race_definitions tool
 */
export const GetRaceDefinitionsSchema = z.object({
  slug: z.string().optional().describe("Filter by specific race slug"),
});

/**
 * Get race definitions (types of races)
 */
export async function getRaceDefinitions(
  args: z.infer<typeof GetRaceDefinitionsSchema>,
  context: ServerContext,
): Promise<ToolResult> {
  try {
    if (args.slug) {
      const definition = await raceDefinitionQueries.getBySlug(
        context.db,
        args.slug,
      );

      if (!definition) {
        return createErrorResult(`Race definition not found: ${args.slug}`);
      }

      return createSuccessResult(definition);
    }

    const definitions = await raceDefinitionQueries.getAll(context.db);

    return createSuccessResult({
      definitions,
      total: definitions.length,
    });
  } catch (error) {
    return createErrorResult(error as Error);
  }
}

/**
 * Schema for get_race_timeline tool
 */
export const GetRaceTimelineSchema = z.object({
  username: z.string().describe("Organizer username"),
  group_by: z
    .enum(["day", "week", "month"])
    .optional()
    .default("day")
    .describe("Group races by time period"),
});

/**
 * Get race timeline for a organizer
 */
export async function getRaceTimeline(
  args: z.infer<typeof GetRaceTimelineSchema>,
  context: ServerContext,
): Promise<ToolResult> {
  try {
    const raceByDate = await raceQueries.getRaceCountByDate(
      context.db,
      args.username,
    );

    // If grouping by week or month, aggregate the data
    if (args.group_by === "week" || args.group_by === "month") {
      const grouped = new Map<string, number>();

      for (const entry of raceByDate) {
        const date = new Date(entry.date);
        let key: string;

        if (args.group_by === "week") {
          // Get week number
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          key = weekStart.toISOString().split("T")[0];
        } else {
          // Month
          key = date.toISOString().substring(0, 7); // YYYY-MM
        }

        grouped.set(key, (grouped.get(key) || 0) + entry.count);
      }

      const timeline = Array.from(grouped.entries())
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date));

      return createSuccessResult({
        username: args.username,
        group_by: args.group_by,
        timeline,
        total_periods: timeline.length,
      });
    }

    return createSuccessResult({
      username: args.username,
      group_by: args.group_by,
      timeline: raceByDate,
      total_periods: raceByDate.length,
    });
  } catch (error) {
    return createErrorResult(error as Error);
  }
}

/**
 * Schema for search_races tool
 */
export const SearchRacesSchema = z.object({
  query: z.string().describe("Search query for race title or text"),
  limit: z.number().optional().describe("Maximum number of results (1-1000)"),
});

/**
 * Search races by title or text content
 */
export async function searchRaces(
  args: z.infer<typeof SearchRacesSchema>,
  context: ServerContext,
): Promise<ToolResult> {
  try {
    const { limit } = validatePagination(args.limit);

    const result = await context.db.execute(
      `
      SELECT a.*, COALESCE(a.points, ad.points, 0) as points
      FROM race a
      LEFT JOIN race_definition ad ON a.race_definition = ad.slug
      WHERE a.title LIKE ? OR a.text LIKE ?
      ORDER BY a.occurred_at DESC
      LIMIT ?
    `,
      [`%${args.query}%`, `%${args.query}%`, limit],
    );

    return createSuccessResult({
      races: result.rows,
      query: args.query,
      total: result.rows.length,
    });
  } catch (error) {
    return createErrorResult(error as Error);
  }
}
