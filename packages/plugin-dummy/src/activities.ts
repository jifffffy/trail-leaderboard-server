/**
 * Generate realistic example activities
 */

import { faker } from "@faker-js/faker";
import type { Activity } from "@starter/leaderboard-api";

/**
 * Activity type definitions with example attributes
 */
export const ACTIVITY_TYPES = {
  entry_created: {
    name: "Entry Created",
    description: "Created a new entry",
    points: 5,
    icon: "plus-circle",
  },
  entry_updated: {
    name: "Entry Updated",
    description: "Updated an existing entry",
    points: 2,
    icon: "pencil",
  },
  entry_reviewed: {
    name: "Entry Reviewed",
    description: "Reviewed an entry",
    points: 3,
    icon: "eye",
  },
  entry_published: {
    name: "Entry Published",
    description: "Published an entry",
    points: 20,
    icon: "send",
  },
  comment_added: {
    name: "Comment Added",
    description: "Added a comment",
    points: 1,
    icon: "message-square",
  },
  milestone_reached: {
    name: "Milestone Reached",
    description: "Reached a milestone",
    points: 12,
    icon: "flag",
  },
  reference_added: {
    name: "Reference Added",
    description: "Added a reference to an entry",
    points: 4,
    icon: "link",
  },
  attachment_added: {
    name: "Attachment Added",
    description: "Attached a file to an entry",
    points: 3,
    icon: "paperclip",
  },
} as const;

/**
 * Generate an example entry title
 */
function generateActivityTitle(type: string): string {
  const templates = [
    () => `Added ${faker.word.adjective()} ${faker.word.noun()}`,
    () => `Updated ${faker.word.noun()} details`,
    () => `Reviewed ${faker.word.adjective()} ${faker.word.noun()}`,
    () => `Published ${faker.word.noun()} release`,
    () =>
      `Reached ${faker.number.int({ min: 1, max: 50 })} ${faker.word.noun()}s`,
  ];

  return `${ACTIVITY_TYPES[type as keyof typeof ACTIVITY_TYPES]?.name ?? "Activity"}: ${faker.helpers.arrayElement(
    templates,
  )()}`;
}

/**
 * Generate an example link for an activity
 */
function generateActivityLink(
  type: string,
  sourceName: string,
  id: number,
): string {
  return `https://example.com/${sourceName}/${type}/${id}`;
}

/**
 * Generate meta information for an activity
 */
function generateActivityMeta(
  type: string,
  sourceName: string,
): Record<string, unknown> {
  return {
    source: sourceName,
    term: faker.word.noun(),
    order: faker.number.int({ min: 1, max: 25 }),
  };
}

/**
 * Generate a single activity
 */
export function generateActivity(
  contributor: string,
  type: keyof typeof ACTIVITY_TYPES,
  sourceName: string,
  date: Date,
): Activity {
  const id = faker.number.int({ min: 1, max: 9999 });
  const title = generateActivityTitle(type);
  const link = generateActivityLink(type, sourceName, id);
  const meta = generateActivityMeta(type, sourceName);

  // Generate slug
  const slug = `${contributor}-${type}-${date.getTime()}-${faker.string.alphanumeric(
    6,
  )}`;

  return {
    slug,
    contributor,
    activity_definition: type,
    title,
    occurred_at: date.toISOString(),
    link,
    text: null,
    points: ACTIVITY_TYPES[type].points,
    meta,
  };
}

/**
 * Generate activities for a contributor
 */
export function generateActivitiesForContributor(
  contributor: string,
  count: number,
  daysBack: number,
  sourceNames: string[],
): Activity[] {
  const activities: Activity[] = [];
  const now = new Date();
  const startDate = new Date(now);
  startDate.setDate(startDate.getDate() - daysBack);

  const activityTypes = Object.keys(ACTIVITY_TYPES) as Array<
    keyof typeof ACTIVITY_TYPES
  >;

  for (let i = 0; i < count; i++) {
    // Generate date with bias towards recent dates
    const randomFactor = Math.pow(Math.random(), 0.7);
    const timeRange = now.getTime() - startDate.getTime();
    const activityTime = startDate.getTime() + timeRange * randomFactor;
    const date = new Date(activityTime);

    const type = faker.helpers.arrayElement(activityTypes);
    const sourceName = faker.helpers.arrayElement(sourceNames);

    activities.push(generateActivity(contributor, type, sourceName, date));
  }

  activities.sort(
    (a, b) =>
      new Date(a.occurred_at).getTime() - new Date(b.occurred_at).getTime(),
  );

  return activities;
}

/**
 * Generate activities for all contributors
 */
export function generateActivities(
  contributors: string[],
  minActivitiesPerContributor: number,
  maxActivitiesPerContributor: number,
  daysBack: number,
  sourceNames: string[],
): Map<string, Activity[]> {
  const activitiesByContributor = new Map<string, Activity[]>();

  for (const contributor of contributors) {
    const activityCount = faker.number.int({
      min: minActivitiesPerContributor,
      max: maxActivitiesPerContributor,
    });

    const activities = generateActivitiesForContributor(
      contributor,
      activityCount,
      daysBack,
      sourceNames,
    );

    activitiesByContributor.set(contributor, activities);
  }

  return activitiesByContributor;
}
