/**
 * Data loading utilities for Next.js SSG
 * Uses LibSQL to query the database during build time
 */

import { getDatabase } from "@/lib/db/client";
import {
  badgeDefinitionQueries,
  globalAggregateQueries,
  organizerAggregateQueries,
  organizerBadgeQueries,
  organizerQueries,
  raceDefinitionQueries,
  raceQueries,
  type OrganizerBadge,
} from "@starter/leaderboard-api";

/**
 * Get all organizers
 */
export async function getAllOrganizers() {
  const db = getDatabase();
  return await organizerQueries.getAll(db);
}

/**
 * Get organizer by username
 */
export async function getOrganizer(username: string) {
  const db = getDatabase();
  return await organizerQueries.getByUsername(db, username);
}

/**
 * Get all race definitions
 */
export async function getAllRaceDefinitions() {
  const db = getDatabase();
  return await raceDefinitionQueries.getAll(db);
}

/**
 * List all race definitions
 */
export async function listRaceDefinitions() {
  const db = getDatabase();
  return await raceDefinitionQueries.getAll(db);
}

/**
 * Get races with optional filters
 */
export async function getRaces(
  options: {
    limit?: number;
    offset?: number;
    organizer?: string;
    startDate?: string;
    endDate?: string;
    definition?: string;
  } = {},
) {
  const db = getDatabase();

  if (options.organizer) {
    return await raceQueries.getByOrganizer(
      db,
      options.organizer,
      options.limit,
    );
  }

  if (options.startDate && options.endDate) {
    return await raceQueries.getByDateRange(
      db,
      options.startDate,
      options.endDate,
    );
  }

  if (options.definition) {
    return await raceQueries.getByDefinition(db, options.definition);
  }

  return await raceQueries.getAll(db, options.limit, options.offset);
}

/**
 * Get organizer stats
 */
export async function getOrganizerStats(username: string) {
  const db = getDatabase();

  const totalPoints = await raceQueries.getTotalPointsByOrganizer(db, username);
  const races = await raceQueries.getByOrganizer(db, username);

  return {
    totalPoints,
    raceCount: races.length,
    races,
  };
}

/**
 * Get global aggregates filtered by slugs and visibility
 */
export async function getGlobalAggregates(slugs: string[]) {
  const db = getDatabase();
  return await globalAggregateQueries.getBySlugs(db, slugs);
}

/**
 * Get all organizer usernames
 */
export async function getAllOrganizerUsernames() {
  const db = getDatabase();
  return await organizerQueries.getAllUsernames(db);
}

/**
 * Get organizer profile with races
 */
export async function getOrganizerProfile(username: string) {
  const db = getDatabase();

  const organizer = await organizerQueries.getByUsername(db, username);
  if (!organizer) {
    return {
      organizer: null,
      races: [],
      totalPoints: 0,
      raceByDate: {},
    };
  }

  const races = await raceQueries.getByOrganizer(db, username);
  const totalPoints = await raceQueries.getTotalPointsByOrganizer(db, username);

  const raceDefinitions = await raceDefinitionQueries.getAll(db);
  const defMap = new Map(raceDefinitions.map((d) => [d.slug, d]));

  const raceCountsByDate = await raceQueries.getRaceCountByDate(db, username);
  const raceByDate: Record<string, number> = {};
  for (const { date, count } of raceCountsByDate) {
    raceByDate[date] = count;
  }

  const enrichedRaces = races.map((race) => {
    const def = defMap.get(race.race_definition);
    return {
      ...race,
      race_name: def?.name || race.race_definition,
      race_description: def?.description || null,
      race_icon: def?.icon || null,
    };
  });

  return {
    organizer,
    races: enrichedRaces,
    totalPoints,
    raceByDate,
  };
}

/**
 * Get organizer aggregates filtered by slugs and visibility
 */
export async function getOrganizerAggregates(
  username: string,
  slugs: string[],
) {
  const db = getDatabase();
  return await organizerAggregateQueries.getByOrganizerEnriched(
    db,
    username,
    slugs,
  );
}

/**
 * Get all organizers with avatars and total points
 */
export async function getAllOrganizersWithAvatars() {
  const db = getDatabase();
  return await organizerQueries.getLeaderboardWithPoints(db);
}

/**
 * Get all badge definitions
 */
export async function getAllBadgeDefinitions() {
  const db = getDatabase();
  return await badgeDefinitionQueries.getAll(db);
}

/**
 * Get all badges earned by a organizer
 */
export async function getOrganizerBadges(
  username: string,
): Promise<OrganizerBadge[]> {
  const db = getDatabase();
  return await organizerBadgeQueries.getByOrganizer(db, username);
}

/**
 * Get recent badge achievements across all organizers
 */
export async function getRecentBadgeAchievements(limit: number = 20): Promise<
  Array<
    OrganizerBadge & {
      organizer_name: string | null;
      organizer_avatar_url: string | null;
      badge_name: string;
      badge_description: string;
      badge_variants: Record<string, { description: string; svg_url: string }>;
    }
  >
> {
  const db = getDatabase();
  return await organizerBadgeQueries.getRecentEnriched(db, limit);
}

/**
 * Get top badge earners (organizers with most badges)
 */
export async function getTopBadgeEarners(limit: number = 10): Promise<
  Array<{
    username: string;
    name: string | null;
    avatar_url: string | null;
    badge_count: number;
  }>
> {
  const db = getDatabase();
  return await organizerBadgeQueries.getTopEarnersEnriched(db, limit);
}

/**
 * Get badge award counts grouped by badge definition and variant
 */
export async function getBadgeAwardCounts(): Promise<
  Array<{
    badge: string;
    variant: string;
    award_count: number;
  }>
> {
  const db = getDatabase();
  return await organizerBadgeQueries.getAwardCountsByBadge(db);
}

/**
 * Get overall badge statistics (total awarded, unique earners)
 */
export async function getTotalBadgeStats(): Promise<{
  total_awarded: number;
  unique_earners: number;
}> {
  const db = getDatabase();
  return await organizerBadgeQueries.getTotalStats(db);
}
