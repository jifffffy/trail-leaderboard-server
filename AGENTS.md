# AGENTS.md

Single-domain starter for trail races: `organizer` (组办方) and `race` (赛事) are
the core entities (the storage/queries are named accordingly — there is no generic
contributor/activity layer). Pipeline: **data sources → plugin-runner → LibSQL DB →
Next.js static JSON export**. Everything is resolved at build time; there is no
runtime web server.

## Required setup order

Packages depend on each other through their built `dist/` output, so the order matters:

```bash
pnpm install
pnpm build:packages   # MUST run before setup:dev, test, dev, or mcp
pnpm setup:dev        # generates ./data (dummy data); needs build:packages first
pnpm dev              # http://localhost:3000
```

`pnpm setup:dev` exits if `./data` already exists — use `--force` (or `pnpm reset:dev`).
Options: `--organizers <n>`, `--days <n>`, `--seed <n>`, `--force`.

Editing `packages/api` source is not picked up by other packages until you re-run
`pnpm build:packages` (or build that package).

## Commands

- `pnpm build` = `build:packages` → `build:data` (plugin runner, all phases) → `build:web`.
  Web output is a static export in `apps/web/out/`.
- `pnpm dev` runs Next.js dev server; the app only exposes JSON route handlers.
- `pnpm test` = `pnpm -r test` (only api, plugin-runner, plugin-race-articles,
  plugin-dummy, mcp-server, web).
- Single package test: `pnpm --filter @starter/web test`.
- Single test file: `pnpm --filter <pkg> exec vitest run path/to/file.test.ts`.
- Typecheck is per-package only (no root script): `pnpm --filter <pkg> typecheck`.
- Lint only exists in web: `pnpm --filter @starter/web lint`.
- Format: `pnpm format` / `pnpm format:check`. Prettier uses the
  `organize-imports` plugin, so imports are auto-sorted — do not hand-order them.
- Data phases: `pnpm data:import|scrape|aggregate|evaluate|export`, or run one with
  `pnpm --filter @starter/plugin-runner dev <phase>`. Phase order is
  import → setup → scrape → aggregate → evaluate → export.
- `pnpm build:data` runs with `--fresh` (drops all tables first), so a full build
  is a clean sync; add `--fresh` manually for a fresh full run. Individual phase
  commands stay incremental.
- Regenerate the JSON schema after editing `ConfigSchema`:
  `pnpm generate:schema` → `config.schema.json`.

## Architecture

- `packages/api` (`@starter/leaderboard-api`): shared types, LibSQL client, queries,
  schema. Leaf dependency; built with tsup (`dist/index.js`, `dist/seed.js`).
- `packages/plugin-runner` (`@starter/plugin-runner`): CLI orchestrating all phases.
  Writes the LibSQL DB at `${LEADERBOARD_DATA_DIR}/.leaderboard.db`.
- `packages/plugin-dummy`: reference plugin (faker-based); used by `setup:dev`.
- `packages/plugin-race-articles`: validates offline-authored race articles
  (`<dataDir>/sources/races/*.md`, strict frontmatter, no prose parsing) and maps
  organizers to the `organizer` table and race events to the `race` table
  (distance categories in `meta`). Each `scrape` replaces the rows it owns (marked
  by `meta.plugin`), so removed articles disappear; see its README.
- Web JSON API: `apps/web/app/api/{organizers,races}.json/route.ts` are
  `force-static` route handlers exported at build time; data shaping lives in
  `apps/web/lib/data/race-api.ts`.
- `packages/mcp-server` (`@starter/mcp-server`): read-only MCP server over the same DB.
- `apps/web` (`@starter/web`): JSON-only Next.js static export. Reads the DB at
  build time and emits `/api/*.json`; there are **no HTML pages** and it no longer
  runs `predev`/`prebuild` asset generation.
- `scripts/setup-dev.ts`: bootstraps `./data`; `scripts/generate-config-schema.ts`:
  emits `config.schema.json` from the Zod schema in `packages/plugin-runner/src/config.ts`.
- `packages/create-plugin` / `packages/create-data-repo`: scaffolding CLIs
  (`pnpm create-plugin`, `pnpm create-data-repo`). `create-starter-plugin` is
  private and linked via workspace overrides.

## Data dir and config

- `LEADERBOARD_DATA_DIR` (default `./data`, gitignored) holds `config.yaml`,
  `organizers/` (exported organizer profiles), `races/organizers/` (exported races),
  and `sources/races/` (authored race articles). `apps/web/config.yaml` is
  gitignored — config lives in the data dir.
- Relative data paths resolve against the workspace root (found via `WORKSPACE_ROOT`
  or by walking up to `pnpm-workspace.yaml`), not the current file.
- `config.yaml` supports `${{ env.VAR_NAME }}` interpolation.

## Conventions

- Node 20+ (CI uses Node 22); pnpm 10.33.0 pinned via `packageManager`.
- Next config uses `output: "export"`, `images.unoptimized`, and transpiles
  `@starter/leaderboard-api`.
- CI (`.github/workflows/ci.yaml`) checks out the **separate private data repo**
  `jifffffy/trail-data` into `./data` (via the `DATA_REPO_SSH_KEY` read-only deploy
  key secret), then runs `build:packages` → `test` → `build:data` → `build:web` with
  `LEADERBOARD_DATA_DIR=./data`, and deploys to GitHub Pages. Data/config live in
  that repo; this repo commits none.
