# My Static Server Starter

A plugin-based starter for building a static site from multiple data sources.

Data flows in one direction:

```
Data Sources → Plugin Runner → LibSQL Database → Next.js Build → Static Site
```

Everything is generated at build time; the output is a fully static site you can host anywhere.

## Features

- 🔌 **Plugin Architecture**: add new data sources without touching the core
- 📊 **Multiple Views**: contributor directory, entity profiles, data explorer
- 🤖 **MCP Server**: query the generated data with AI assistants (Model Context Protocol)
- 🧰 **Scaffolding CLIs**: `create-starter-plugin` and `create-starter-data-repo`
- 📝 **Human-Editable**: contributor profiles in Markdown, activities in sharded JSONL
- 🎨 **Customizable**: theme overrides and configurable aggregates
- 🚀 **Static Export**: deploy to any static host

## Requirements

- Node.js v20+
- pnpm v10+

## Quick Start

```bash
pnpm install
pnpm build:packages
pnpm setup:dev      # generate dummy data (30 contributors, 90 days)
pnpm dev            # http://localhost:3000
```

`setup:dev` options:

```bash
pnpm setup:dev --contributors 50
pnpm setup:dev --days 30
pnpm setup:dev --seed 12345     # reproducible data
pnpm setup:dev --force
```

## Project Structure

```
.
├── apps/
│   └── web/                    # Next.js static site
├── packages/
│   ├── api/                    # database utilities, plugin types, query builders
│   ├── plugin-runner/          # CLI orchestrating data collection
│   ├── plugin-dummy/           # example plugin (dummy data generator)
│   ├── mcp-server/             # MCP server for AI assistant queries
│   ├── create-plugin/          # plugin scaffolding CLI
│   └── create-data-repo/       # data repository scaffolding CLI
└── scripts/
    └── setup-dev.ts            # local dev data bootstrapper
```

## Data Management

```bash
pnpm data:import      # import existing data
pnpm data:scrape      # run plugins to scrape new data
pnpm data:aggregate   # compute aggregates
pnpm data:evaluate    # evaluate badges
pnpm data:export      # export data back to files
pnpm db:seed --output=./data
```

## Configuration

The system reads a `config.yaml` from the data repository (`LEADERBOARD_DATA_DIR`).
`pnpm setup:dev` generates a development config; see `config.schema.json` for the full schema.

```yaml
org:
  name: My Organization
  description: A great organization
  url: https://example.com
  logo_url: https://example.com/logo.png

meta:
  title: My Site
  description: Track our amazing contributors
  site_url: https://site.example.com
  image_url: https://example.com/og-image.png
  favicon_url: https://example.com/favicon.ico

leaderboard:
  plugins:
    my-plugin:
      source: https://example.com/plugins/my-plugin.js
      config:
        apiToken: ${{ env.MY_API_TOKEN }}
```

## Creating a Plugin

```bash
pnpm create-plugin ../my-plugin
```

A plugin exports a default object implementing `setup`, `scrape`, and optionally
`aggregate` and `badgeRules`. See [`packages/plugin-dummy`](packages/plugin-dummy) for a
reference implementation and [`packages/api/src/types.ts`](packages/api/src/types.ts)
for the contract.

## Querying with AI Assistants

```bash
pnpm mcp -- --data-dir ./data
```

See [`packages/mcp-server/README.md`](packages/mcp-server/README.md) for setup.

## Building & Testing

```bash
pnpm build          # packages + data + web
pnpm test
pnpm test:coverage
pnpm format
pnpm generate:schema
```

## Deployment

`pnpm build:web` emits a static site to `apps/web/out/`. Deploy that
directory to any static host (Netlify, Vercel, GitHub Pages, Cloudflare Pages, S3, ...).

## Environment Variables

```bash
LEADERBOARD_DATA_DIR=./data   # location of the data repository
LIBSQL_DB_URL=file:.leaderboard.db
```

## License

MIT © Open Healthcare Network
