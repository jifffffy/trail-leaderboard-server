/**
 * Aggregation phase - calculates standard metrics after scraping
 */

import type { Database, Logger } from "@starter/leaderboard-api";
import {
  globalAggregateQueries,
  organizerAggregateDefinitionQueries,
  organizerAggregateQueries,
  organizerQueries,
  raceDefinitionQueries,
  raceQueries,
} from "@starter/leaderboard-api";

/**
 * Run the aggregation phase
 * Calculates standard global and organizer aggregates
 */
export async function runAggregation(
  db: Database,
  logger: Logger,
): Promise<void> {
  logger.info("Starting aggregation phase");

  // Calculate global aggregates
  await calculateGlobalAggregates(db, logger);

  // Calculate organizer aggregates
  await calculateOrganizerAggregates(db, logger);

  logger.info("Aggregation phase complete");
}

/**
 * Calculate standard global aggregates
 */
async function calculateGlobalAggregates(
  db: Database,
  logger: Logger,
): Promise<void> {
  logger.info("Calculating global aggregates");

  // Calculate total organizers
  const totalOrganizers = await organizerQueries.count(db);
  await globalAggregateQueries.upsert(db, {
    slug: "total_organizers",
    name: "Total Organizers",
    description: "Total number of organizers",
    value: {
      type: "number",
      value: totalOrganizers,
      format: "integer",
    },
    hidden: false,
    meta: {
      calculated_at: new Date().toISOString(),
    },
  });
  logger.debug(`Total organizers: ${totalOrganizers}`);

  // Calculate total races
  const totalRaces = await raceQueries.count(db);
  await globalAggregateQueries.upsert(db, {
    slug: "total_races",
    name: "Total Races",
    description: "Total number of races",
    value: {
      type: "number",
      value: totalRaces,
      format: "integer",
    },
    hidden: false,
    meta: {
      calculated_at: new Date().toISOString(),
    },
  });
  logger.debug(`Total races: ${totalRaces}`);

  // Calculate active organizers in last 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split("T")[0];
  const today = new Date().toISOString().split("T")[0];

  const recentRaces = await raceQueries.getByDateRange(
    db,
    thirtyDaysAgoStr,
    today,
  );
  const activeOrganizers = new Set(recentRaces.map((a) => a.organizer)).size;

  await globalAggregateQueries.upsert(db, {
    slug: "active_organizers_last_30d",
    name: "Active Organizers (Last 30 Days)",
    description: "Number of organizers with race in the last 30 days",
    value: {
      type: "number",
      value: activeOrganizers,
      format: "integer",
    },
    hidden: false,
    meta: {
      calculated_at: new Date().toISOString(),
      period_start: thirtyDaysAgoStr,
      period_end: today,
    },
  });
  logger.debug(`Active organizers (last 30d): ${activeOrganizers}`);

  logger.info("Global aggregates calculated", {
    total_organizers: totalOrganizers,
    total_races: totalRaces,
    active_organizers_last_30d: activeOrganizers,
  });

  // Calculate per-race-definition global counts
  const raceDefinitions = await raceDefinitionQueries.getAll(db);
  const allRaces = await raceQueries.getAll(db);

  const countsByDefinition = new Map<string, number>();
  for (const race of allRaces) {
    const count = countsByDefinition.get(race.race_definition) || 0;
    countsByDefinition.set(race.race_definition, count + 1);
  }

  for (const def of raceDefinitions) {
    const count = countsByDefinition.get(def.slug) || 0;
    await globalAggregateQueries.upsert(db, {
      slug: `race_count:${def.slug}`,
      name: `${def.name} Count`,
      description: `Total number of ${def.name} races`,
      value: {
        type: "number",
        value: count,
        format: "integer",
      },
      hidden: false,
      meta: {
        race_definition: def.slug,
        calculated_at: new Date().toISOString(),
      },
    });
  }
  logger.debug(
    `Per-race-definition global counts calculated for ${raceDefinitions.length} definitions`,
  );
}

/**
 * Calculate standard organizer aggregates
 */
async function calculateOrganizerAggregates(
  db: Database,
  logger: Logger,
): Promise<void> {
  logger.info("Calculating organizer aggregates");

  // Define standard organizer aggregate definitions
  const definitions = [
    {
      slug: "total_race_points",
      name: "Total Race Points",
      description: "Sum of all race points for the organizer",
      hidden: false,
    },
    {
      slug: "race_count",
      name: "Race Count",
      description: "Total number of races by the organizer",
      hidden: false,
    },
    {
      slug: "first_race_date",
      name: "First Race Date",
      description: "Date of the organizer's first race",
      hidden: false,
    },
    {
      slug: "last_race_date",
      name: "Last Race Date",
      description: "Date of the organizer's most recent race",
      hidden: false,
    },
    {
      slug: "active_days",
      name: "Active Days",
      description: "Number of unique days with race",
      hidden: false,
    },
    {
      slug: "avg_points_per_race",
      name: "Average Points Per Race",
      description: "Average points earned per race",
      hidden: false,
    },
  ];

  // Upsert definitions
  for (const def of definitions) {
    await organizerAggregateDefinitionQueries.upsert(db, def);
  }

  // Register per-race-definition count aggregate definitions
  const raceDefinitions = await raceDefinitionQueries.getAll(db);
  for (const def of raceDefinitions) {
    await organizerAggregateDefinitionQueries.upsert(db, {
      slug: `race_count:${def.slug}`,
      name: `${def.name} Count`,
      description: `Number of ${def.name} races by the organizer`,
      hidden: false,
    });
  }

  // Get all organizers
  const organizers = await organizerQueries.getAll(db);
  logger.debug(`Processing ${organizers.length} organizers`);

  let processedCount = 0;

  for (const organizer of organizers) {
    const races = await raceQueries.getByOrganizer(db, organizer.username);

    if (races.length === 0) {
      // Skip organizers with no races
      continue;
    }

    // Calculate total points
    const totalPoints = races.reduce((sum, a) => sum + (a.points || 0), 0);
    await organizerAggregateQueries.upsert(db, {
      aggregate: "total_race_points",
      organizer: organizer.username,
      value: {
        type: "number",
        value: totalPoints,
        format: "integer",
      },
      meta: {
        calculated_at: new Date().toISOString(),
      },
    });

    // Race count
    await organizerAggregateQueries.upsert(db, {
      aggregate: "race_count",
      organizer: organizer.username,
      value: {
        type: "number",
        value: races.length,
        format: "integer",
      },
      meta: {
        calculated_at: new Date().toISOString(),
      },
    });

    // Sort races by date
    const sortedRaces = [...races].sort(
      (a, b) =>
        new Date(a.occurred_at).getTime() - new Date(b.occurred_at).getTime(),
    );

    // First race date
    const firstRaceDate = sortedRaces[0].occurred_at.split("T")[0];
    await organizerAggregateQueries.upsert(db, {
      aggregate: "first_race_date",
      organizer: organizer.username,
      value: {
        type: "string",
        value: firstRaceDate,
      },
      meta: {
        calculated_at: new Date().toISOString(),
      },
    });

    // Last race date
    const lastRaceDate =
      sortedRaces[sortedRaces.length - 1].occurred_at.split("T")[0];
    await organizerAggregateQueries.upsert(db, {
      aggregate: "last_race_date",
      organizer: organizer.username,
      value: {
        type: "string",
        value: lastRaceDate,
      },
      meta: {
        calculated_at: new Date().toISOString(),
      },
    });

    // Active days (unique dates)
    const uniqueDates = new Set(races.map((a) => a.occurred_at.split("T")[0]));
    await organizerAggregateQueries.upsert(db, {
      aggregate: "active_days",
      organizer: organizer.username,
      value: {
        type: "number",
        value: uniqueDates.size,
        format: "integer",
        unit: "days",
      },
      meta: {
        calculated_at: new Date().toISOString(),
      },
    });

    // Average points per race
    const avgPoints = races.length > 0 ? totalPoints / races.length : 0;
    await organizerAggregateQueries.upsert(db, {
      aggregate: "avg_points_per_race",
      organizer: organizer.username,
      value: {
        type: "number",
        value: Math.round(avgPoints * 100) / 100, // Round to 2 decimals
        format: "decimal",
        decimals: 2,
      },
      meta: {
        calculated_at: new Date().toISOString(),
      },
    });

    // Per-race-definition counts
    const countsByDef = new Map<string, number>();
    for (const race of races) {
      const count = countsByDef.get(race.race_definition) || 0;
      countsByDef.set(race.race_definition, count + 1);
    }
    for (const def of raceDefinitions) {
      const count = countsByDef.get(def.slug) || 0;
      if (count > 0) {
        await organizerAggregateQueries.upsert(db, {
          aggregate: `race_count:${def.slug}`,
          organizer: organizer.username,
          value: {
            type: "number",
            value: count,
            format: "integer",
          },
          meta: {
            race_definition: def.slug,
            calculated_at: new Date().toISOString(),
          },
        });
      }
    }

    processedCount++;
  }

  logger.info("Organizer aggregates calculated", {
    organizers_processed: processedCount,
  });
}
