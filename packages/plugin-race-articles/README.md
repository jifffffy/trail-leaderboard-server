# @starter/plugin-race-articles

Turns race announcement articles (e.g. WeChat / 公众号 posts) into leaderboard
data. Use this when a "data source" is a **web page with race information** rather
than an API.

There is **no parser and no scraping here**: you fetch the article offline, then
author one file per event with a strict frontmatter contract. Adding a new site
means filling those fields — not editing code.

## Data model

- **Organizer (组办方) → `organizer`** — one organizer per organizer. Profile
  fields come from the `organizer` block; multiple events usually share one
  organizer, and their data is merged.
- **Race (赛事) → `race`** — one race per event, named after the event.
  Its distance categories (组别, `50KM / 35KM / 18KM / 6KM`) live in the race
  `meta.categories` array.
- **Distance band → `race_definition`** — `race_ultra` (≥50km),
  `race_long` (30–49km), `race_short` (15–29km), `race_fun` (<15km). An event maps
  to the band of its **longest** category; controls the UI icon and default points.
  Per-category detail stays in `meta.categories`.

## Required file format

One file per event under `<LEADERBOARD_DATA_DIR>/sources/races/` (`.md`,
`.markdown`, or `.txt`). Everything lives in frontmatter; the body is optional
free text kept as provenance.

```md
---
organizer:
  name: 耐吉赛事 # required
  slug: naiji-saishi # required, stable username (organizer)
  url: https://example.com/naiji # optional
  logo_url: https://example.com/naiji.png # optional (organizer avatar)
  bio: 专注越野赛事 # optional
event:
  title: 2026富川（西岭药谷）古明城越野赛 # required
  slug: fuchuan-gumingcheng-2026 # required
  date: 2026-11-08 # required, YYYY-MM-DD
  location: 广西富川古明城 # optional
  url: https://mp.weixin.qq.com/s/JSD56r2gue_EsI1Eu-uqiQ # optional
  cover_url: https://example.com/cover.png # optional
categories: # required, at least one
  - name: 橙就巅峰
    distance_km: 50 # required
    elevation_gain_m: 2890 # optional
    cutoff_hours: 15 # optional
    itra_points: 3 # optional
    level: L1 # optional
  - name: 橙意满满
    distance_km: 6
---

# 跑山好时节

正文会作为 race 的 `text` 保留，不参与解析。
```

The schema is enforced with Zod (`src/schema.ts`). Files that fail validation are
skipped and reported as warnings; the run does not fail.

## Update semantics

Updates are **incremental**. Each article is upserted by key — organizer by
`organizer.slug`, race by `event.slug` — so re-running adds new events and
updates existing ones; it never deletes. Deleting an article from the corpus
does **not** remove its race from an existing database; start from a fresh data
dir (or delete `.leaderboard.db`) if you need a clean rebuild. A missing
`articlesDir` is a no-op (warned).

## Register in `config.yaml`

```yaml
leaderboard:
  plugins:
    race-articles:
      source: "file:///abs/path/packages/plugin-race-articles/dist/index.js"
      config:
        articlesDir: sources/races # relative to LEADERBOARD_DATA_DIR (or absolute)
        # Optional: override distance bands
        # raceDefinitions:
        #   - { slug: race_ultra, name: Ultra, description: "...", icon: mountain-snow, minKm: 50, points: 30 }
```

`source` may also be an npm package name or an `https://` URL (see
`packages/plugin-runner/src/loader.ts`).

## JSON output

The web app is JSON-only: it exposes the ingested data as statically-exported
files at build time (no HTML pages) — see `apps/web/lib/data/race-api.ts`:

- `/api/organizers.json` — organizers with `race_count` and `points`
- `/api/races.json` — one entry per race with organizer, event, and `categories`

Serve them from any static host; `pnpm build:web` writes them to
`apps/web/out/api/`.

## Commands

```bash
pnpm --filter @starter/plugin-race-articles build
pnpm --filter @starter/plugin-race-articles test
pnpm --filter @starter/plugin-race-articles typecheck
```
