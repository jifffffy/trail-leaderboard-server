/**
 * Data loading utilities for Next.js SSG
 * Uses LibSQL to query the database during build time
 */

import { getDatabase } from "@/lib/db/client";
import {
  activityDefinitionQueries,
  activityQueries,
  badgeDefinitionQueries,
  contributorAggregateQueries,
  contributorBadgeQueries,
  contributorQueries,
  globalAggregateQueries,
  type ContributorBadge,
} from "@starter/leaderboard-api";

/**
 * Get all contributors
 */
export async function getAllContributors() {
  const db = getDatabase();
  return await contributorQueries.getAll(db);
}

/**
 * Get contributor by username
 */
export async function getContributor(username: string) {
  const db = getDatabase();
  return await contributorQueries.getByUsername(db, username);
}

/**
 * Get all activity definitions
 */
export async function getAllActivityDefinitions() {
  const db = getDatabase();
  return await activityDefinitionQueries.getAll(db);
}

/**
 * List all activity definitions
 */
export async function listActivityDefinitions() {
  const db = getDatabase();
  return await activityDefinitionQueries.getAll(db);
}

/**
 * Get activities with optional filters
 */
export async function getActivities(
  options: {
    limit?: number;
    offset?: number;
    contributor?: string;
    startDate?: string;
    endDate?: string;
    definition?: string;
  } = {},
) {
  const db = getDatabase();

  if (options.contributor) {
    return await activityQueries.getByContributor(
      db,
      options.contributor,
      options.limit,
    );
  }

  if (options.startDate && options.endDate) {
    return await activityQueries.getByDateRange(
      db,
      options.startDate,
      options.endDate,
    );
  }

  if (options.definition) {
    return await activityQueries.getByDefinition(db, options.definition);
  }

  return await activityQueries.getAll(db, options.limit, options.offset);
}

/**
 * Get contributor stats
 */
export async function getContributorStats(username: string) {
  const db = getDatabase();

  const totalPoints = await activityQueries.getTotalPointsByContributor(
    db,
    username,
  );
  const activities = await activityQueries.getByContributor(db, username);

  return {
    totalPoints,
    activityCount: activities.length,
    activities,
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
 * Get all contributor usernames
 */
export async function getAllContributorUsernames() {
  const db = getDatabase();
  return await contributorQueries.getAllUsernames(db);
}

/**
 * Get contributor profile with activities
 */
export async function getContributorProfile(username: string) {
  const db = getDatabase();

  const contributor = await contributorQueries.getByUsername(db, username);
  if (!contributor) {
    return {
      contributor: null,
      activities: [],
      totalPoints: 0,
      activityByDate: {},
    };
  }

  const activities = await activityQueries.getByContributor(db, username);
  const totalPoints = await activityQueries.getTotalPointsByContributor(
    db,
    username,
  );

  const activityDefinitions = await activityDefinitionQueries.getAll(db);
  const defMap = new Map(activityDefinitions.map((d) => [d.slug, d]));

  const activityCountsByDate = await activityQueries.getActivityCountByDate(
    db,
    username,
  );
  const activityByDate: Record<string, number> = {};
  for (const { date, count } of activityCountsByDate) {
    activityByDate[date] = count;
  }

  const enrichedActivities = activities.map((activity) => {
    const def = defMap.get(activity.activity_definition);
    return {
      ...activity,
      activity_name: def?.name || activity.activity_definition,
      activity_description: def?.description || null,
      activity_icon: def?.icon || null,
    };
  });

  return {
    contributor,
    activities: enrichedActivities,
    totalPoints,
    activityByDate,
  };
}

/**
 * Get contributor aggregates filtered by slugs and visibility
 */
export async function getContributorAggregates(
  username: string,
  slugs: string[],
) {
  const db = getDatabase();
  return await contributorAggregateQueries.getByContributorEnriched(
    db,
    username,
    slugs,
  );
}

/**
 * Get all contributors with avatars and total points
 */
export async function getAllContributorsWithAvatars() {
  const db = getDatabase();
  return await contributorQueries.getLeaderboardWithPoints(db);
}

/**
 * Get all badge definitions
 */
export async function getAllBadgeDefinitions() {
  const db = getDatabase();
  return await badgeDefinitionQueries.getAll(db);
}

/**
 * Get all badges earned by a contributor
 */
export async function getContributorBadges(
  username: string,
): Promise<ContributorBadge[]> {
  const db = getDatabase();
  return await contributorBadgeQueries.getByContributor(db, username);
}

/**
 * Get recent badge achievements across all contributors
 */
export async function getRecentBadgeAchievements(limit: number = 20): Promise<
  Array<
    ContributorBadge & {
      contributor_name: string | null;
      contributor_avatar_url: string | null;
      badge_name: string;
      badge_description: string;
      badge_variants: Record<string, { description: string; svg_url: string }>;
    }
  >
> {
  const db = getDatabase();
  return await contributorBadgeQueries.getRecentEnriched(db, limit);
}

/**
 * Get top badge earners (contributors with most badges)
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
  return await contributorBadgeQueries.getTopEarnersEnriched(db, limit);
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
  return await contributorBadgeQueries.getAwardCountsByBadge(db);
}

/**
 * Get overall badge statistics (total awarded, unique earners)
 */
export async function getTotalBadgeStats(): Promise<{
  total_awarded: number;
  unique_earners: number;
}> {
  const db = getDatabase();
  return await contributorBadgeQueries.getTotalStats(db);
}
