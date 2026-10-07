/**
 * Generate realistic example races
 */

import { faker } from "@faker-js/faker";
import type { Race } from "@starter/leaderboard-api";

/**
 * Race type definitions with example attributes
 */
export const RACE_TYPES = {
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
function generateRaceTitle(type: string): string {
  const templates = [
    () => `Added ${faker.word.adjective()} ${faker.word.noun()}`,
    () => `Updated ${faker.word.noun()} details`,
    () => `Reviewed ${faker.word.adjective()} ${faker.word.noun()}`,
    () => `Published ${faker.word.noun()} release`,
    () =>
      `Reached ${faker.number.int({ min: 1, max: 50 })} ${faker.word.noun()}s`,
  ];

  return `${RACE_TYPES[type as keyof typeof RACE_TYPES]?.name ?? "Race"}: ${faker.helpers.arrayElement(
    templates,
  )()}`;
}

/**
 * Generate an example link for an race
 */
function generateRaceLink(
  type: string,
  sourceName: string,
  id: number,
): string {
  return `https://example.com/${sourceName}/${type}/${id}`;
}

/**
 * Generate meta information for an race
 */
function generateRaceMeta(
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
 * Generate a single race
 */
export function generateRace(
  organizer: string,
  type: keyof typeof RACE_TYPES,
  sourceName: string,
  date: Date,
): Race {
  const id = faker.number.int({ min: 1, max: 9999 });
  const title = generateRaceTitle(type);
  const link = generateRaceLink(type, sourceName, id);
  const meta = generateRaceMeta(type, sourceName);

  // Generate slug
  const slug = `${organizer}-${type}-${date.getTime()}-${faker.string.alphanumeric(
    6,
  )}`;

  return {
    slug,
    organizer,
    race_definition: type,
    title,
    occurred_at: date.toISOString(),
    link,
    text: null,
    points: RACE_TYPES[type].points,
    meta,
  };
}

/**
 * Generate races for a organizer
 */
export function generateRacesForOrganizer(
  organizer: string,
  count: number,
  daysBack: number,
  sourceNames: string[],
): Race[] {
  const races: Race[] = [];
  const now = new Date();
  const startDate = new Date(now);
  startDate.setDate(startDate.getDate() - daysBack);

  const raceTypes = Object.keys(RACE_TYPES) as Array<keyof typeof RACE_TYPES>;

  for (let i = 0; i < count; i++) {
    // Generate date with bias towards recent dates
    const randomFactor = Math.pow(Math.random(), 0.7);
    const timeRange = now.getTime() - startDate.getTime();
    const raceTime = startDate.getTime() + timeRange * randomFactor;
    const date = new Date(raceTime);

    const type = faker.helpers.arrayElement(raceTypes);
    const sourceName = faker.helpers.arrayElement(sourceNames);

    races.push(generateRace(organizer, type, sourceName, date));
  }

  races.sort(
    (a, b) =>
      new Date(a.occurred_at).getTime() - new Date(b.occurred_at).getTime(),
  );

  return races;
}

/**
 * Generate races for all organizers
 */
export function generateRaces(
  organizers: string[],
  minRacesPerOrganizer: number,
  maxRacesPerOrganizer: number,
  daysBack: number,
  sourceNames: string[],
): Map<string, Race[]> {
  const racesByOrganizer = new Map<string, Race[]>();

  for (const organizer of organizers) {
    const raceCount = faker.number.int({
      min: minRacesPerOrganizer,
      max: maxRacesPerOrganizer,
    });

    const races = generateRacesForOrganizer(
      organizer,
      raceCount,
      daysBack,
      sourceNames,
    );

    racesByOrganizer.set(organizer, races);
  }

  return racesByOrganizer;
}
