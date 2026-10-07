/**
 * Race articles plugin.
 *
 * Reads author-authored article files (strict frontmatter, see `schema.ts`) and
 * maps them onto the leaderboard model:
 *  - one `organizer` (组办方) per organizer
 *  - one `race` (赛事) per event, with its distance categories (组别)
 *    stored in `meta.categories`
 *
 * The article body is never parsed; it is stored as the race's provenance text.
 * Adding a new source only means authoring frontmatter, not code changes.
 */

import type {
  Database,
  Organizer,
  Plugin,
  PluginContext,
  Race,
} from "@starter/leaderboard-api";
import {
  organizerQueries,
  raceDefinitionQueries,
  raceQueries,
} from "@starter/leaderboard-api";
import { loadArticles, resolveArticlesDir } from "./articles";
import { bandForDistance, mergeConfig, type DistanceBand } from "./config";
import type { ArticleOrganizer, RaceArticle, RaceEvent } from "./schema";

const PLUGIN_NAME = "@starter/plugin-race-articles";

const plugin: Plugin = {
  name: PLUGIN_NAME,
  version: "0.1.0",

  async setup(ctx: PluginContext) {
    const config = mergeConfig(ctx.config);
    ctx.logger.info("Registering race definitions...");

    for (const band of config.raceDefinitions) {
      await raceDefinitionQueries.insertOrIgnore(ctx.db, toDefinition(band));
      ctx.logger.debug(`Registered race definition: ${band.slug}`);
    }

    ctx.logger.info(
      `Registered ${config.raceDefinitions.length} race definitions`,
    );
  },

  async scrape(ctx: PluginContext) {
    const config = mergeConfig(ctx.config);
    const articlesDir = resolveArticlesDir(config.articlesDir);

    ctx.logger.info(`Reading race articles from ${articlesDir}`);
    const { articles, errors, found } = await loadArticles(articlesDir);

    for (const error of errors) {
      ctx.logger.warn(`Invalid article ${error.filePath}: ${error.message}`);
    }

    if (!found) {
      ctx.logger.warn(
        `Race articles directory not found (${articlesDir}); keeping existing data`,
      );
      return;
    }

    // Full sync: this plugin is the source of truth for the rows it owns, so
    // drop them and re-insert exactly what the current articles describe. This
    // removes races/organizers that were deleted from the corpus.
    await clearOwnedRows(ctx.db);
    ctx.logger.info(`Synchronized ${articles.length} race articles`);

    if (articles.length === 0) {
      ctx.logger.warn(
        `No valid race articles found in ${articlesDir}; cleared existing race data`,
      );
      return;
    }

    // Ensure definitions exist even when only the scrape phase is run.
    for (const band of config.raceDefinitions) {
      await raceDefinitionQueries.insertOrIgnore(ctx.db, toDefinition(band));
    }

    // Organizers are shared across events; merge the most complete data.
    const organizers = new Map<string, ArticleOrganizer>();
    for (const { article } of articles) {
      organizers.set(
        article.organizer.slug,
        mergeOrganizer(organizers, article),
      );
    }

    for (const organizer of organizers.values()) {
      await organizerQueries.upsert(ctx.db, toOrganizer(organizer));
    }

    for (const { article, body, filePath } of articles) {
      const band = bandForEvent(article, config.raceDefinitions);
      await raceQueries.upsert(ctx.db, toRace(article, band, body, filePath));
      ctx.logger.debug(
        `Imported race ${article.event.title} (${article.categories.length} categories)`,
      );
    }

    ctx.logger.info(
      `Imported ${organizers.size} organizers and ${articles.length} races`,
    );
  },
};

function mergeOrganizer(
  organizers: Map<string, ArticleOrganizer>,
  article: RaceArticle,
): ArticleOrganizer {
  const incoming = article.organizer;
  const previous = organizers.get(incoming.slug);
  return {
    slug: incoming.slug,
    name: incoming.name,
    url: incoming.url ?? previous?.url,
    logo_url: incoming.logo_url ?? previous?.logo_url,
    bio: incoming.bio ?? previous?.bio,
  };
}

function toDefinition(band: DistanceBand) {
  return {
    slug: band.slug,
    name: band.name,
    description: band.description,
    points: band.points,
    icon: band.icon,
  };
}

function toOrganizer(organizer: ArticleOrganizer): Organizer {
  return {
    username: organizer.slug,
    name: organizer.name,
    title: "赛事主办方",
    avatar_url: organizer.logo_url ?? null,
    bio: organizer.bio ?? null,
    joining_date: null,
    meta: { url: organizer.url ?? null, plugin: PLUGIN_NAME },
  };
}

/**
 * Delete every race and organizer contributed by this plugin.
 *
 * Organizers are identified by the `plugin` marker in their `meta`. Races
 * are deleted by `organizer` (not by their own meta) so that rows round-tripped
 * through import/export — where race `meta` can be double-encoded — are still
 * removed, and so the foreign key from race → organizer is satisfied.
 */
async function clearOwnedRows(db: Database): Promise<void> {
  const owned = await db.execute(
    "SELECT username FROM organizer WHERE json_extract(meta, '$.plugin') = ?",
    [PLUGIN_NAME],
  );

  const usernames = owned.rows.map((row) => String(row.username));
  if (usernames.length === 0) return;

  const placeholders = usernames.map(() => "?").join(", ");

  // Delete dependents before the organizer row (foreign keys are enforced).
  await db.execute(
    `DELETE FROM race WHERE organizer IN (${placeholders})`,
    usernames,
  );
  await db.execute(
    `DELETE FROM organizer_aggregate WHERE organizer IN (${placeholders})`,
    usernames,
  );
  await db.execute(
    `DELETE FROM organizer_badge WHERE organizer IN (${placeholders})`,
    usernames,
  );
  await db.execute(
    `DELETE FROM organizer WHERE username IN (${placeholders})`,
    usernames,
  );
}

function toRace(
  article: RaceArticle,
  band: DistanceBand,
  body: string,
  filePath: string,
): Race {
  const event: RaceEvent = article.event;

  return {
    slug: event.slug,
    organizer: article.organizer.slug,
    race_definition: band.slug,
    title: event.title,
    occurred_at: `${event.date}T00:00:00.000Z`,
    link: event.url ?? null,
    text: body || null,
    points: null,
    meta: {
      plugin: PLUGIN_NAME,
      event_title: event.title,
      event_slug: event.slug,
      location: event.location ?? null,
      cover_url: event.cover_url ?? null,
      organizer_slug: article.organizer.slug,
      organizer_name: article.organizer.name,
      category_count: article.categories.length,
      categories: article.categories.map((category) => ({
        name: category.name,
        distance_km: category.distance_km,
        elevation_gain_m: category.elevation_gain_m ?? null,
        cutoff_hours: category.cutoff_hours ?? null,
        itra_points: category.itra_points ?? null,
        level: category.level ?? null,
        description: category.description ?? null,
      })),
      source_file: filePath,
    },
  };
}

/**
 * An event maps to the band of its longest category (its headline distance),
 * which determines the UI icon and default points. Per-category bands are kept
 * in `meta.categories`.
 */
function bandForEvent(
  article: RaceArticle,
  bands: DistanceBand[],
): DistanceBand {
  const longest = article.categories.reduce((a, b) =>
    b.distance_km > a.distance_km ? b : a,
  );
  return bandForDistance(longest.distance_km, bands);
}

export default plugin;
