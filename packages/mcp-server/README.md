# MCP Server

A Model Context Protocol (MCP) server for querying the generated data. This server exposes tools for querying organizers, races, badges, and aggregates through a standardized MCP interface.

## What is MCP?

The Model Context Protocol (MCP) is an open protocol created by Anthropic that standardizes how AI assistants connect to data sources and tools. This server implements MCP to make the data easily accessible to AI assistants like Claude.

## Features

- **20+ Query Tools**: Comprehensive set of tools for querying all aspects of the data
- **Batch Operations**: Support for querying multiple organizers or stats in a single request
- **Flexible Filtering**: Filter by date range, race type, and more
- **Multiple Transports**: Support for both STDIO (for local use) and HTTP transports
- **Read-Only**: Safe, read-only access to the data
- **Zero Configuration**: Works out of the box with sensible defaults

## Installation

```bash
# From the monorepo root
pnpm install

# Build the MCP server package
pnpm --filter @starter/mcp-server build
```

## Usage

### STDIO Transport (Recommended for Claude Desktop)

```bash
# Default - uses LEADERBOARD_DATA_DIR environment variable or ./data
starter-mcp

# Specify data directory
starter-mcp --data-dir /path/to/data

# Specify database URL directly
starter-mcp --db-url file:/path/to/database.db
```

### HTTP Transport

```bash
# Run on default port 3001
starter-mcp --transport http

# Run on custom port
starter-mcp --transport http --port 8080
```

## Integration with Claude Desktop

Add this configuration to your Claude Desktop config file (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

```json
{
  "mcpServers": {
    "starter": {
      "command": "node",
      "args": [
        "/path/to/starter/packages/mcp-server/dist/index.js",
        "--data-dir",
        "/path/to/data"
      ]
    }
  }
}
```

After configuration, restart Claude Desktop. The server will be available and Claude can use the tools to query your data.

## Available Tools

### Organizer Tools

- **query_organizers**: Query organizers with pagination
- **get_organizer**: Get detailed information about a specific organizer
- **get_organizer_stats**: Get comprehensive statistics for a organizer including races, badges, and aggregates
- **batch_get_organizers**: Get multiple organizers in a single batch request

### Race Tools

- **query_races**: Query races with flexible filtering by organizer, race type, and date range
- **get_race**: Get a specific race by slug
- **get_race_definitions**: Get race definitions (types of races tracked)
- **get_race_timeline**: Get race timeline for a organizer grouped by time period
- **search_races**: Search races by title or text content

### Badge Tools

- **get_badges**: Get badge definitions or organizer badges
- **get_recent_badges**: Get recently awarded badges
- **get_top_badge_earners**: Get organizers with the most badges

### Aggregate Tools

- **get_global_aggregates**: Get organization-level aggregate metrics
- **get_organizer_aggregates**: Get aggregates for a specific organizer
- **get_aggregate_definitions**: Get organizer aggregate definitions
- **batch_get_organizer_stats**: Get statistics for multiple organizers in batch

## Example Queries

Here are some example natural language queries you can ask Claude:

- "Show me the top 10 organizers this month"
- "What races did alice complete last week?"
- "Who has earned the most badges?"
- "Get me detailed stats for user john_doe"
- "Find all pull requests merged in January 2024"
- "Show the contribution timeline for bob grouped by month"
- "What's alice's current ranking?"
- "Compare the stats of alice, bob, and charlie"

## Configuration

### Environment Variables

- `LEADERBOARD_DATA_DIR`: Path to data directory (default: `./data`)
- `LIBSQL_DB_URL`: Database URL (overrides data directory)

### Command Line Options

```
Options:
  --transport <type>    Transport type: stdio (default) or http
  --port <number>       HTTP port (default: 3001, only for HTTP transport)
  --data-dir <path>     Path to data directory
  --db-url <url>        Database URL (overrides data-dir)
  --help, -h            Show this help message
```

## Tool Schemas

All tools accept and return structured JSON data. Input parameters are validated using Zod schemas. Here's an example of the `get_organizer_stats` tool:

**Input:**

```json
{
  "username": "alice"
}
```

**Output:**

```json
{
  "organizer": {
    "username": "alice",
    "name": "Alice Smith",
    "avatar_url": "https://...",
    ...
  },
  "stats": {
    "totalPoints": 1250,
    "raceCount": 45,
    "badgeCount": 5
  },
  "recentRaces": [...],
  "aggregates": [...],
  "badges": [...],
  "raceByDate": [...]
}
```

## Development

### Build

```bash
pnpm build
```

### Type Checking

```bash
pnpm typecheck
```

### Run Tests

```bash
pnpm test
```

### Development Mode

```bash
# Watch mode with hot reload
pnpm dev

# HTTP transport in development
pnpm dev:http
```

## Architecture

```
┌─────────────────┐
│   MCP Client    │  (Claude Desktop, MCP Inspector, etc.)
│  (AI Assistant) │
└────────┬────────┘
         │ MCP Protocol (JSON-RPC)
         │
┌────────┴────────┐
│   MCP Server    │
│  (This Package) │
├─────────────────┤
│ • Tool Handlers │
│ • Validation    │
│ • Error Handling│
└────────┬────────┘
         │
┌────────┴────────┐
│  Starter        │
│      API        │
│ (@starter/      │
│  api            │
│      api)       │
└────────┬────────┘
         │
┌────────┴────────┐
│  LibSQL         │
│  Database       │
└─────────────────┘
```

## Security

- **Read-Only**: All operations are read-only. No write, update, or delete operations are exposed.
- **Input Validation**: All inputs are validated using Zod schemas.
- **Error Handling**: Comprehensive error handling with structured error messages.
- **Trusted Environment**: Designed for use in trusted environments. No authentication required.

## Performance

- **Optimized Queries**: Uses existing optimized queries from the API package
- **Pagination**: Support for pagination to handle large result sets
- **Batch Operations**: Efficient batch operations to reduce round trips
- **Database Indexes**: Leverages database indexes for fast queries

## Troubleshooting

### Server won't start

1. Check that the data directory exists and contains a `.leaderboard.db` file
2. Verify environment variables are set correctly
3. Ensure the database file has read permissions

### Tools return empty results

1. Verify the database contains data by running: `sqlite3 data/.leaderboard.db "SELECT COUNT(*) FROM organizer"`
2. Check that the data directory path is correct
3. Try querying without filters first

### Claude Desktop doesn't show the server

1. Check the config file path is correct for your OS
2. Verify the JSON syntax in `claude_desktop_config.json`
3. Restart Claude Desktop after making config changes
4. Check Claude Desktop logs for error messages

## Contributing

Contributions are welcome! Please follow the existing code style and add tests for new features.

## License

MIT © Open Healthcare Network

## Support

- [MCP Server README](./README.md)
- [Model Context Protocol Docs](https://modelcontextprotocol.io)
