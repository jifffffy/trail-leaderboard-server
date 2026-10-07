# @starter/web

JSON-only Next.js static export. At build time it reads the LibSQL database and
emits static JSON route handlers — there are **no HTML pages**.

## Endpoints

- `GET /api/organizers.json`
- `GET /api/races.json`

Both are `force-static` route handlers (`app/api/*.json/route.ts`); the database
projections live in `lib/data/race-api.ts`.

## Development

```bash
pnpm dev          # from the repository root
```

## Build

```bash
pnpm --filter @starter/web build
```

Output is written to `apps/web/out/` (e.g. `out/api/races.json`). The prebuild
asset scripts (icons, theme, avatars, data explorer) were removed along with the
HTML pages.

See the [root README](../../README.md) for full setup instructions.
