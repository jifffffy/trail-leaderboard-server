# Database Client

LibSQL database client for Next.js SSG (Static Site Generation).

## Usage

The database client reads from the persisted `.leaderboard.db` file in the data-repo during build time.

```typescript
import { getDatabase } from "@/lib/db/client";
import { organizerQueries } from "@starter/leaderboard-api";

// In a Next.js page or component during SSG
export async function generateStaticParams() {
  const db = getDatabase();
  const organizers = await organizerQueries.getAll(db);

  return organizers.map((organizer) => ({
    username: organizer.username,
  }));
}
```

## Data Loading Utilities

For convenience, use the data loading utilities from `@/lib/data/loader`:

```typescript
import { getAllOrganizers, getRaces } from "@/lib/data/loader";

export default async function OrganizersPage() {
  const organizers = await getAllOrganizers();
  const races = await getRaces({ limit: 10 });

  return (
    <div>
      {/* Render organizers and recent races */}
    </div>
  );
}
```

## Environment Variables

- `LEADERBOARD_DATA_DIR` - Path to data repository (default: `./data`)
- `LIBSQL_DB_URL` - Custom database URL (default: auto-detected from data directory)
