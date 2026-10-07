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
    // Initialize activity definitions
    await ctx.db.execute(
      `
      INSERT OR IGNORE INTO activity_definition (slug, name, description, points)
      VALUES (?, ?, ?, ?)
    `,
      ["my_activity", "My Activity", "Description", 10],
    );
  },

  async scrape(ctx: PluginContext) {
    // Fetch and store activities
    const data = await fetchData(ctx.config);
    // Insert activities into database
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
import { contributorQueries, activityQueries } from "@starter/leaderboard-api";

// Get all contributors
const contributors = await contributorQueries.getAll(db);

// Get recent activities
const activities = await activityQueries.getAll(db, 10);
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
- `Contributor` - Contributor data structure
- `Activity` - Activity data structure
- `ActivityDefinition` - Activity definition data structure
- And more...

## License

MIT
