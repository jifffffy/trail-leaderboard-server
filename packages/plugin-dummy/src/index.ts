/**
 * Dummy data generator plugin for leaderboard development
 *
 * This plugin generates realistic organizers and GitHub-like races
 * using Faker.js, making it easy to develop and test the leaderboard
 * without needing production data.
 */

import { faker } from "@faker-js/faker";
import type { Plugin, PluginContext } from "@starter/leaderboard-api";
import {
  badgeDefinitionQueries,
  organizerAggregateDefinitionQueries,
  organizerQueries,
  raceDefinitionQueries,
  raceQueries,
} from "@starter/leaderboard-api";
import { mergeConfig, type DummyPluginConfig } from "./config";
import { generateOrganizers } from "./organizers";
import { RACE_TYPES, generateRaces } from "./races";

const plugin: Plugin = {
  name: "@starter/plugin-dummy",
  version: "0.1.0",

  async setup(ctx: PluginContext) {
    ctx.logger.info("Setting up dummy plugin...");

    // Register all race definitions
    for (const [slug, definition] of Object.entries(RACE_TYPES)) {
      await raceDefinitionQueries.insertOrIgnore(ctx.db, {
        slug,
        name: definition.name,
        description: definition.description,
        points: definition.points,
        icon: definition.icon,
      });

      ctx.logger.debug(`Registered race type: ${slug}`);
    }

    ctx.logger.info(`Registered ${Object.keys(RACE_TYPES).length} race types`);

    // Define organizer aggregate definitions
    const aggregateDefinitions = [
      {
        slug: "entry_count",
        name: "Entries",
        description: "Number of entries contributed",
        hidden: null,
      },
      {
        slug: "review_participation",
        name: "Review Participation",
        description: "Percentage of entries reviewed vs created",
        hidden: null,
      },
    ];

    for (const def of aggregateDefinitions) {
      await organizerAggregateDefinitionQueries.upsert(ctx.db, def);
      ctx.logger.debug(`Registered aggregate: ${def.slug}`);
    }

    ctx.logger.info(
      `Registered ${aggregateDefinitions.length} aggregate definitions`,
    );

    // Define badge definitions
    const badgeDefinitions: Array<{
      slug: string;
      name: string;
      description: string;
      variants: Record<string, { description: string; svg_url: string }>;
    }> = [
      {
        slug: "race_milestone",
        name: "Race Milestone",
        description: "Awarded for reaching race count milestones",
        variants: {
          bronze: {
            description: "10+ races",
            svg_url: "https://api.dicebear.com/7.x/shapes/svg?seed=bronze-race",
          },
          silver: {
            description: "50+ races",
            svg_url: "https://api.dicebear.com/7.x/shapes/svg?seed=silver-race",
          },
          gold: {
            description: "100+ races",
            svg_url: "https://api.dicebear.com/7.x/shapes/svg?seed=gold-race",
          },
          platinum: {
            description: "500+ races",
            svg_url:
              "https://api.dicebear.com/7.x/shapes/svg?seed=platinum-race",
          },
        },
      },
      {
        slug: "points_milestone",
        name: "Points Milestone",
        description: "Awarded for reaching points milestones",
        variants: {
          bronze: {
            description: "100+ points",
            svg_url:
              "https://api.dicebear.com/7.x/shapes/svg?seed=bronze-points",
          },
          silver: {
            description: "500+ points",
            svg_url:
              "https://api.dicebear.com/7.x/shapes/svg?seed=silver-points",
          },
          gold: {
            description: "1,000+ points",
            svg_url: "https://api.dicebear.com/7.x/shapes/svg?seed=gold-points",
          },
          platinum: {
            description: "5,000+ points",
            svg_url:
              "https://api.dicebear.com/7.x/shapes/svg?seed=platinum-points",
          },
        },
      },
      {
        slug: "consistency_champion",
        name: "Consistency Champion",
        description: "Awarded for maintaining race streaks",
        variants: {
          bronze: {
            description: "7 day streak",
            svg_url:
              "https://api.dicebear.com/7.x/shapes/svg?seed=bronze-streak",
          },
          silver: {
            description: "14 day streak",
            svg_url:
              "https://api.dicebear.com/7.x/shapes/svg?seed=silver-streak",
          },
          gold: {
            description: "30 day streak",
            svg_url: "https://api.dicebear.com/7.x/shapes/svg?seed=gold-streak",
          },
          platinum: {
            description: "90 day streak",
            svg_url:
              "https://api.dicebear.com/7.x/shapes/svg?seed=platinum-streak",
          },
        },
      },
      {
        slug: "entry_streak",
        name: "Entry Streak",
        description: "Awarded for maintaining a consistent contribution streak",
        variants: {
          bronze: {
            description: "5 day streak",
            svg_url:
              "https://api.dicebear.com/7.x/shapes/svg?seed=bronze-entry-streak",
          },
          silver: {
            description: "10 day streak",
            svg_url:
              "https://api.dicebear.com/7.x/shapes/svg?seed=silver-entry-streak",
          },
          gold: {
            description: "21 day streak",
            svg_url:
              "https://api.dicebear.com/7.x/shapes/svg?seed=gold-entry-streak",
          },
        },
      },
      {
        slug: "review_champion",
        name: "Review Champion",
        description: "Awarded for consistent review participation",
        variants: {
          bronze: {
            description: "4 weeks of reviews",
            svg_url:
              "https://api.dicebear.com/7.x/shapes/svg?seed=bronze-review",
          },
          silver: {
            description: "8 weeks of reviews",
            svg_url:
              "https://api.dicebear.com/7.x/shapes/svg?seed=silver-review",
          },
          gold: {
            description: "12 weeks of reviews",
            svg_url: "https://api.dicebear.com/7.x/shapes/svg?seed=gold-review",
          },
        },
      },
    ];

    for (const badge of badgeDefinitions) {
      await badgeDefinitionQueries.upsert(ctx.db, badge);
      ctx.logger.debug(`Registered badge: ${badge.slug}`);
    }

    ctx.logger.info(`Registered ${badgeDefinitions.length} badge definitions`);
    ctx.logger.info("✓ Setup complete");
  },

  async scrape(ctx: PluginContext) {
    ctx.logger.info("Starting dummy data generation...");

    // Parse and merge configuration
    const config = mergeConfig(ctx.config as DummyPluginConfig);

    // Set faker seed if provided
    if (config.races.seed !== undefined) {
      faker.seed(config.races.seed);
      ctx.logger.info(`Using seed: ${config.races.seed}`);
    }

    ctx.logger.info(`Generating ${config.organizers.count} organizers...`);

    // Generate organizers
    const organizers = generateOrganizers(config.organizers.count);
    let organizerCount = 0;

    for (const organizer of organizers) {
      await organizerQueries.upsert(ctx.db, organizer);
      organizerCount++;
    }

    ctx.logger.info(`✓ Generated ${organizerCount} organizers`);

    // Generate races
    ctx.logger.info("Generating races...");
    const organizerUsernames = organizers.map((c) => c.username);

    const racesByOrganizer = generateRaces(
      organizerUsernames,
      config.organizers.minRacesPerOrganizer,
      config.organizers.maxRacesPerOrganizer,
      config.races.daysBack,
      config.sources,
    );

    let totalRaces = 0;

    for (const [, races] of racesByOrganizer.entries()) {
      for (const race of races) {
        await raceQueries.upsert(ctx.db, race);
        totalRaces++;
      }
    }

    ctx.logger.info(`✓ Generated ${totalRaces} races`);

    // Calculate and log statistics
    const avgRaces = Math.round(totalRaces / organizerCount);
    const totalPoints = organizers.reduce((sum, _) => {
      const races = racesByOrganizer.get(_.username) || [];
      return sum + races.reduce((s, a) => s + (a.points || 0), 0);
    }, 0);

    ctx.logger.info("──────────────────────────────────");
    ctx.logger.info("Generation Summary:");
    ctx.logger.info(`  Organizers: ${organizerCount}`);
    ctx.logger.info(`  Races: ${totalRaces}`);
    ctx.logger.info(`  Avg races per organizer: ${avgRaces}`);
    ctx.logger.info(`  Total points: ${totalPoints.toLocaleString()}`);
    ctx.logger.info(`  Time period: Last ${config.races.daysBack} days`);
    ctx.logger.info("──────────────────────────────────");
    ctx.logger.info("✓ Dummy data generation complete!");
  },
};

export default plugin;
