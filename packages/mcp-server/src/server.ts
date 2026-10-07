/**
 * MCP Server implementation
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { createDatabase } from "@starter/leaderboard-api";
import type { ServerConfig, ServerContext } from "./types.js";
import { getDatabaseUrl } from "./utils.js";

// Import all tools
import {
  batchGetOrganizers,
  BatchGetOrganizersSchema,
  batchGetOrganizerStats,
  BatchGetOrganizerStatsSchema,
  getAggregateDefinitions,
  GetAggregateDefinitionsSchema,
  getBadges,
  GetBadgesSchema,
  getGlobalAggregates,
  GetGlobalAggregatesSchema,
  getOrganizer,
  getOrganizerAggregates,
  GetOrganizerAggregatesSchema,
  GetOrganizerSchema,
  getOrganizerStats,
  GetOrganizerStatsSchema,
  getRace,
  getRaceDefinitions,
  GetRaceDefinitionsSchema,
  GetRaceSchema,
  getRaceTimeline,
  GetRaceTimelineSchema,
  getRecentBadges,
  GetRecentBadgesSchema,
  getTopBadgeEarners,
  GetTopBadgeEarnersSchema,
  queryOrganizers,
  QueryOrganizersSchema,
  queryRaces,
  QueryRacesSchema,
  searchRaces,
  SearchRacesSchema,
} from "./tools/index.js";

/**
 * Create and configure the MCP server
 */
export function createMCPServer(config: ServerConfig): Server {
  const server = new Server(
    {
      name: config.name,
      version: config.version,
    },
    {
      capabilities: {
        tools: {},
        resources: {},
      },
    },
  );

  // Initialize database connection
  const dbUrl = config.dbUrl || getDatabaseUrl(config.dataDir);
  const db = createDatabase(dbUrl);

  const context: ServerContext = {
    db,
    config,
  };

  // Register tool handlers
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      {
        name: "query_organizers",
        description: "Query organizers with pagination",
        inputSchema: {
          type: "object",
          properties: {
            limit: {
              type: "number",
              description: "Maximum number of results (1-1000)",
            },
            offset: {
              type: "number",
              description: "Number of results to skip",
            },
          },
        },
      },
      {
        name: "get_organizer",
        description: "Get detailed information about a specific organizer",
        inputSchema: {
          type: "object",
          properties: {
            username: { type: "string", description: "Organizer username" },
          },
          required: ["username"],
        },
      },
      {
        name: "get_organizer_stats",
        description:
          "Get comprehensive statistics for a organizer including races, badges, and aggregates",
        inputSchema: {
          type: "object",
          properties: {
            username: { type: "string", description: "Organizer username" },
          },
          required: ["username"],
        },
      },
      {
        name: "batch_get_organizers",
        description: "Get multiple organizers in a single batch request",
        inputSchema: {
          type: "object",
          properties: {
            usernames: {
              type: "array",
              items: { type: "string" },
              description: "List of organizer usernames",
            },
          },
          required: ["usernames"],
        },
      },
      {
        name: "query_races",
        description:
          "Query races with flexible filtering by organizer, race type, and date range",
        inputSchema: {
          type: "object",
          properties: {
            organizer: {
              type: "string",
              description: "Filter by organizer username",
            },
            race_type: {
              type: "string",
              description: "Filter by race definition slug",
            },
            start_date: {
              type: "string",
              description: "Start date (ISO format: YYYY-MM-DD)",
            },
            end_date: {
              type: "string",
              description: "End date (ISO format: YYYY-MM-DD)",
            },
            limit: {
              type: "number",
              description: "Maximum number of results (1-1000)",
            },
            offset: {
              type: "number",
              description: "Number of results to skip",
            },
          },
        },
      },
      {
        name: "get_race",
        description: "Get a specific race by slug",
        inputSchema: {
          type: "object",
          properties: {
            slug: { type: "string", description: "Race slug" },
          },
          required: ["slug"],
        },
      },
      {
        name: "get_race_definitions",
        description: "Get race definitions (types of races tracked)",
        inputSchema: {
          type: "object",
          properties: {
            slug: {
              type: "string",
              description: "Filter by specific race slug",
            },
          },
        },
      },
      {
        name: "get_race_timeline",
        description: "Get race timeline for a organizer grouped by time period",
        inputSchema: {
          type: "object",
          properties: {
            username: { type: "string", description: "Organizer username" },
            group_by: {
              type: "string",
              enum: ["day", "week", "month"],
              description: "Group races by time period",
            },
          },
          required: ["username"],
        },
      },
      {
        name: "search_races",
        description: "Search races by title or text content",
        inputSchema: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "Search query for race title or text",
            },
            limit: {
              type: "number",
              description: "Maximum number of results (1-1000)",
            },
          },
          required: ["query"],
        },
      },
      {
        name: "get_badges",
        description: "Get badge definitions or organizer badges",
        inputSchema: {
          type: "object",
          properties: {
            username: {
              type: "string",
              description: "Get badges for a specific organizer",
            },
            badge_slug: {
              type: "string",
              description: "Get specific badge definition",
            },
          },
        },
      },
      {
        name: "get_recent_badges",
        description: "Get recently awarded badges",
        inputSchema: {
          type: "object",
          properties: {
            limit: {
              type: "number",
              description: "Maximum number of results (1-100)",
            },
          },
        },
      },
      {
        name: "get_top_badge_earners",
        description: "Get organizers with the most badges",
        inputSchema: {
          type: "object",
          properties: {
            limit: {
              type: "number",
              description: "Maximum number of results (1-100)",
            },
          },
        },
      },
      {
        name: "get_global_aggregates",
        description: "Get organization-level aggregate metrics",
        inputSchema: {
          type: "object",
          properties: {
            slugs: {
              type: "array",
              items: { type: "string" },
              description: "Filter by specific aggregate slugs",
            },
          },
        },
      },
      {
        name: "get_organizer_aggregates",
        description: "Get aggregates for a specific organizer",
        inputSchema: {
          type: "object",
          properties: {
            username: { type: "string", description: "Organizer username" },
            slugs: {
              type: "array",
              items: { type: "string" },
              description: "Filter by specific aggregate slugs",
            },
          },
          required: ["username"],
        },
      },
      {
        name: "get_aggregate_definitions",
        description: "Get organizer aggregate definitions",
        inputSchema: {
          type: "object",
          properties: {
            visible_only: {
              type: "boolean",
              description: "Only return visible aggregate definitions",
            },
          },
        },
      },
      {
        name: "batch_get_organizer_stats",
        description: "Get statistics for multiple organizers in batch",
        inputSchema: {
          type: "object",
          properties: {
            usernames: {
              type: "array",
              items: { type: "string" },
              description: "List of organizer usernames",
            },
            include_aggregates: {
              type: "boolean",
              description: "Include organizer aggregates",
            },
            include_badges: {
              type: "boolean",
              description: "Include organizer badges",
            },
          },
          required: ["usernames"],
        },
      },
    ],
  }));

  // Register call tool handler
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      switch (name) {
        case "query_organizers":
          return await queryOrganizers(
            QueryOrganizersSchema.parse(args),
            context,
          );
        case "get_organizer":
          return await getOrganizer(GetOrganizerSchema.parse(args), context);
        case "get_organizer_stats":
          return await getOrganizerStats(
            GetOrganizerStatsSchema.parse(args),
            context,
          );
        case "batch_get_organizers":
          return await batchGetOrganizers(
            BatchGetOrganizersSchema.parse(args),
            context,
          );
        case "query_races":
          return await queryRaces(QueryRacesSchema.parse(args), context);
        case "get_race":
          return await getRace(GetRaceSchema.parse(args), context);
        case "get_race_definitions":
          return await getRaceDefinitions(
            GetRaceDefinitionsSchema.parse(args),
            context,
          );
        case "get_race_timeline":
          return await getRaceTimeline(
            GetRaceTimelineSchema.parse(args),
            context,
          );
        case "search_races":
          return await searchRaces(SearchRacesSchema.parse(args), context);
        case "get_badges":
          return await getBadges(GetBadgesSchema.parse(args), context);
        case "get_recent_badges":
          return await getRecentBadges(
            GetRecentBadgesSchema.parse(args),
            context,
          );
        case "get_top_badge_earners":
          return await getTopBadgeEarners(
            GetTopBadgeEarnersSchema.parse(args),
            context,
          );
        case "get_global_aggregates":
          return await getGlobalAggregates(
            GetGlobalAggregatesSchema.parse(args),
            context,
          );
        case "get_organizer_aggregates":
          return await getOrganizerAggregates(
            GetOrganizerAggregatesSchema.parse(args),
            context,
          );
        case "get_aggregate_definitions":
          return await getAggregateDefinitions(
            GetAggregateDefinitionsSchema.parse(args),
            context,
          );
        case "batch_get_organizer_stats":
          return await batchGetOrganizerStats(
            BatchGetOrganizerStatsSchema.parse(args),
            context,
          );
        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    } catch (error) {
      if (error instanceof Error) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                error: error.message,
                code: "TOOL_ERROR",
              }),
            },
          ],
          isError: true,
        };
      }
      throw error;
    }
  });

  // Register resource handlers (optional - for resource URIs)
  server.setRequestHandler(ListResourcesRequestSchema, async () => ({
    resources: [],
  }));

  server.setRequestHandler(ReadResourceRequestSchema, async () => {
    throw new Error("Resources not yet implemented");
  });

  return server;
}

/**
 * Run the server with the specified transport
 */
export async function runServer(config: ServerConfig): Promise<void> {
  const server = createMCPServer(config);

  if (config.transport === "stdio") {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("Starter MCP Server running on stdio");
  } else if (config.transport === "http") {
    const port = config.httpPort || 3001;
    const http = await import("node:http");
    const httpServer = http.createServer(async (req, res) => {
      if (req.method === "GET" && req.url === "/sse") {
        const transport = new SSEServerTransport("/message", res);
        await server.connect(transport);
        await transport.start();
      }
    });
    httpServer.listen(port, () => {
      console.error(`Starter MCP Server running on HTTP port ${port}`);
    });
  }
}
