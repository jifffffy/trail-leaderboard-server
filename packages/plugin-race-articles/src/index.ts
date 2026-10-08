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
      ctx.logger.warn(`Race articles directory not found (${articlesDir})`);
      return;
    }

    if (articles.length === 0) {
      ctx.logger.warn(`No race articles found in ${articlesDir}`);
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
    meta: { url: organizer.url ?? null },
  };
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
