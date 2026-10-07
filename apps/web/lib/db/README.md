# Database Client

LibSQL database client for Next.js SSG (Static Site Generation).

## Usage

The database client reads from the persisted `.leaderboard.db` file in the data-repo during build time.

```typescript
import { getDatabase } from "@/lib/db/client";
import { contributorQueries } from "@starter/leaderboard-api";

// In a Next.js page or component during SSG
export async function generateStaticParams() {
  const db = getDatabase();
  const contributors = await contributorQueries.getAll(db);

  return contributors.map((contributor) => ({
    username: contributor.username,
  }));
}
```

## Data Loading Utilities

For convenience, use the data loading utilities from `@/lib/data/loader`:

```typescript
import { getAllContributors, getActivities } from "@/lib/data/loader";

export default async function ContributorsPage() {
  const contributors = await getAllContributors();
  const activities = await getActivities({ limit: 10 });

  return (
    <div>
      {/* Render contributors and recent activities */}
    </div>
  );
}
```

## Environment Variables

- `LEADERBOARD_DATA_DIR` - Path to data repository (default: `./data`)
- `LIBSQL_DB_URL` - Custom database URL (default: auto-detected from data directory)
