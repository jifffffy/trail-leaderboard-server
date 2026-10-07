# @starter/leaderboard-api

Unified API package combining database utilities, schema definitions, query helpers, and plugin type definitions for the starter.

## Installation

```bash
npm install @starter/leaderboard-api
```

## Usage

### Plugin Development

```typescript
import type { Plugin, PluginContext } from "@starter/leaderboard-api";

const myPlugin: Plugin = {
  name: "my-plugin",
  version: "1.0.0",

  async setup(ctx: PluginContext) {
    // Initialize race definitions
    await ctx.db.execute(
      `
      INSERT OR IGNORE INTO race_definition (slug, name, description, points)
      VALUES (?, ?, ?, ?)
    `,
      ["my_race", "My Race", "Description", 10],
    );
  },

  async scrape(ctx: PluginContext) {
    // Fetch and store races
    const data = await fetchData(ctx.config);
    // Insert races into database
  },

  async aggregate(ctx: PluginContext) {
    // Optional: Compute plugin-specific aggregates
    // Runs after the main aggregation
  },
};

export default myPlugin;
```

### Database Usage

```typescript
import { createDatabase, initializeSchema } from "@starter/leaderboard-api";

const db = createDatabase("file:./leaderboard.db");
await initializeSchema(db);
```

### Query Helpers

```typescript
import { organizerQueries, raceQueries } from "@starter/leaderboard-api";

// Get all organizers
const organizers = await organizerQueries.getAll(db);

// Get recent races
const races = await raceQueries.getAll(db, 10);
```

### Generate Seed Data

```bash
pnpm seed --output=./test-data
```

## Type Definitions

This package exports all core types used throughout the starter:

- `Database` - Database interface abstraction
- `Plugin` - Plugin interface
- `PluginContext` - Context passed to plugin methods
- `Organizer` - Organizer data structure
- `Race` - Race data structure
- `RaceDefinition` - Race definition data structure
- And more...

## License

MIT
