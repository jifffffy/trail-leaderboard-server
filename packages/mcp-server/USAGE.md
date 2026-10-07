# MCP Server Usage Guide

This guide provides examples and best practices for using the MCP Server.

## Quick Start

### 1. Build and Install

```bash
# From the monorepo root
pnpm install
pnpm --filter @starter/mcp-server build
```

### 2. Run the Server

**STDIO Transport (for Claude Desktop):**

```bash
starter-mcp --data-dir ./data
```

**HTTP Transport:**

```bash
starter-mcp --transport http --port 3001
```

## Claude Desktop Integration

### Configuration

Edit `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or equivalent on your OS:

```json
{
  "mcpServers": {
    "starter": {
      "command": "node",
      "args": [
        "/absolute/path/to/starter/packages/mcp-server/dist/index.js",
        "--data-dir",
        "/absolute/path/to/starter/data"
      ]
    }
  }
}
```

### Restart Claude Desktop

After saving the configuration, restart Claude Desktop for the changes to take effect.

## Example Queries

Once configured, you can ask Claude questions like:

### Organizer Queries

```
"Show me all core team members"
"Get detailed stats for alice"
"Compare the contributions of alice, bob, and charlie"
"Who joined in the last month?"
```

### Race Queries

```
"What races did john_doe complete last week?"
"Find all pull requests merged in January 2024"
"Show me recent code reviews"
"Search for races mentioning 'bug fix'"
```

### Badge Queries

```
"What badges has alice earned?"
"Show me recently awarded badges"
"Who has the most badges?"
"What badge types are available?"
```

### Aggregate Queries

```
"What are the organization-level metrics?"
"Show alice's aggregate statistics"
"What's our total contribution count?"
"Show organizer streak information"
```

### Timeline and Analytics

```
"Show alice's contribution pattern over the last 6 months"
"Who opened the most pull requests this quarter?"
"Group bob's races by week"
"Show active organizers in Q1 2024"
```

## Tool Reference

### Organizer Tools

#### query_organizers

Get a list of organizers with optional filtering.

**Parameters:**

- `limit` (optional): Maximum results (1-1000, default: 50)
- `offset` (optional): Pagination offset (default: 0)

**Example:**

```
"Show me all organizers"
```

#### get_organizer

Get detailed information about a specific organizer.

**Parameters:**

- `username` (required): Organizer username

**Example:**

```
"Get details for organizer alice"
```

#### get_organizer_stats

Get comprehensive statistics including races, badges, and aggregates.

**Parameters:**

- `username` (required): Organizer username

**Example:**

```
"Show me detailed stats for alice"
```

#### batch_get_organizers

Get multiple organizers in a single request.

**Parameters:**

- `usernames` (required): Array of usernames

**Example:**

```
"Get information for alice, bob, and charlie"
```

### Race Tools

#### query_races

Query races with flexible filtering.

**Parameters:**

- `organizer` (optional): Filter by username
- `race_type` (optional): Filter by race definition slug
- `start_date` (optional): Start date (YYYY-MM-DD)
- `end_date` (optional): End date (YYYY-MM-DD)
- `limit` (optional): Maximum results (1-1000)
- `offset` (optional): Pagination offset

**Example:**

```
"Show races from alice in the last week"
```

#### get_race

Get a specific race by its slug.

**Parameters:**

- `slug` (required): Race slug

#### get_race_definitions

Get all race types tracked by the system.

**Parameters:**

- `slug` (optional): Get specific definition

**Example:**

```
"What types of races are tracked?"
```

#### get_race_timeline

Get race timeline grouped by time period.

**Parameters:**

- `username` (required): Organizer username
- `group_by` (optional): 'day', 'week', or 'month' (default: 'day')

**Example:**

```
"Show alice's race timeline grouped by month"
```

#### search_races

Search races by title or text.

**Parameters:**

- `query` (required): Search query
- `limit` (optional): Maximum results

**Example:**

```
"Search for races mentioning 'authentication'"
```

### Badge Tools

#### get_badges

Get badge definitions or organizer badges.

**Parameters:**

- `username` (optional): Get badges for specific organizer
- `badge_slug` (optional): Get specific badge definition

**Example:**

```
"What badges has alice earned?"
"What badge types exist?"
```

#### get_recent_badges

Get recently awarded badges.

**Parameters:**

- `limit` (optional): Maximum results (1-100, default: 20)

**Example:**

```
"Show recently awarded badges"
```

#### get_top_badge_earners

Get organizers with the most badges.

**Parameters:**

- `limit` (optional): Maximum results (1-100, default: 10)

**Example:**

```
"Who has earned the most badges?"
```

### Aggregate Tools

#### get_global_aggregates

Get organization-level aggregate metrics.

**Parameters:**

- `slugs` (optional): Filter by specific aggregate slugs

**Example:**

```
"Show organization-level metrics"
```

#### get_organizer_aggregates

Get aggregates for a specific organizer.

**Parameters:**

- `username` (required): Organizer username
- `slugs` (optional): Filter by specific aggregate slugs

**Example:**

```
"Show alice's aggregate statistics"
```

#### get_aggregate_definitions

Get available aggregate metric definitions.

**Parameters:**

- `visible_only` (optional): Only visible definitions (default: true)

**Example:**

```
"What aggregate metrics are tracked?"
```

#### batch_get_organizer_stats

Get stats for multiple organizers efficiently.

**Parameters:**

- `usernames` (required): Array of usernames
- `include_aggregates` (optional): Include aggregates (default: false)
- `include_badges` (optional): Include badges (default: false)

**Example:**

```
"Get stats for alice, bob, and charlie with aggregates"
```

## Best Practices

### 1. Use Batch Operations

When querying multiple organizers, use batch operations instead of individual queries:

**Good:**

```
"Get stats for alice, bob, and charlie"
→ Uses batch_get_organizers or batch_get_organizer_stats
```

**Less Efficient:**

```
"Get stats for alice"
"Get stats for bob"
"Get stats for charlie"
→ Three separate queries
```

### 2. Use Date Filters

For time-based queries, always specify date ranges for better performance:

**Good:**

```
"Show races from last week" (implies date range)
```

**Less Efficient:**

```
"Show all races" (queries entire database)
```

### 3. Use Pagination

For large result sets, use pagination:

```
"Show first 50 organizers"
"Show next 50 organizers (offset 50)"
```

### 4. Filter Early

Apply filters to reduce result size:

```
"Show the top 10 organizers this month"
```

### 5. Use Specific Queries

Use the most specific tool for your needs:

**Good:**

```
"What's alice's ranking?"
→ Uses get_organizer_ranking (optimized)
```

**Less Efficient:**

```
"Get the full organizer list and find alice"
→ Queries the entire organizer set
```

## Troubleshooting

### Problem: Server not appearing in Claude

**Solution:**

1. Check config file path is correct for your OS
2. Verify JSON syntax
3. Use absolute paths, not relative paths
4. Restart Claude Desktop
5. Check Claude Desktop logs

### Problem: Empty results

**Solution:**

1. Verify database has data
2. Check date range filters aren't too restrictive
3. Try querying without filters first
4. Check organizer/race exists

### Problem: Performance issues

**Solution:**

1. Use pagination for large result sets
2. Apply filters to reduce data volume
3. Use batch operations for multiple queries
4. Check database indexes are in place

## Advanced Usage

### Custom Scripts

You can also use the MCP server programmatically:

```typescript
import { createMCPServer } from "@starter/mcp-server";

const server = createMCPServer({
  name: "starter-mcp",
  version: "0.1.0",
  transport: "stdio",
  dataDir: "./data",
});

// Server is now ready to accept MCP requests
```

### HTTP API

When running in HTTP mode, the server exposes MCP over HTTP:

```bash
# Start server
starter-mcp --transport http --port 3001

# Server listens on http://localhost:3001
```

## Support

- [Main Documentation](../../README.md)
- [MCP Server README](./README.md)
- [Model Context Protocol Docs](https://modelcontextprotocol.io)
