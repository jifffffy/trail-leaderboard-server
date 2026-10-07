/**
 * Generate realistic dummy organizers
 */

import { faker } from "@faker-js/faker";
import type { Organizer } from "@starter/leaderboard-api";

/**
 * Generate a username
 */
function generateUsername(): string {
  const style = faker.number.int({ min: 0, max: 2 });

  switch (style) {
    case 0:
      // firstname-lastname
      return `${faker.person.firstName().toLowerCase()}-${faker.person
        .lastName()
        .toLowerCase()}`;
    case 1:
      // firstname + number
      return `${faker.person.firstName().toLowerCase()}${faker.number.int({
        min: 1,
        max: 999,
      })}`;
    default:
      // Random word combination
      return faker.internet
        .username()
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, "-");
  }
}

/**
 * Generate a realistic bio
 */
function generateBio(): string {
  const templates = [
    `${faker.person.jobTitle()} at ${faker.company.name()}. ${faker.hacker.phrase()}.`,
    `Open source enthusiast. ${faker.person.jobTitle()}. ${faker.hacker.phrase()}.`,
    `${faker.person.jobDescriptor()} ${faker.person.jobTitle()}. Love ${faker.hacker.noun()} and ${faker.hacker.noun()}.`,
    `Building ${faker.hacker.adjective()} solutions for ${faker.hacker.noun()}. ${faker.person.jobTitle()}.`,
    `${faker.person.jobTitle()} | ${faker.hacker.phrase()} | Coffee addict`,
  ];

  return faker.helpers.arrayElement(templates);
}

/**
 * Generate a single organizer
 */
export function generateOrganizer(): Organizer {
  const username = generateUsername();
  const firstName = faker.person.firstName();
  const lastName = faker.person.lastName();
  const name = `${firstName} ${lastName}`;

  // Generate avatar URL using DiceBear API
  const avatarStyle = faker.helpers.arrayElement([
    "adventurer",
    "avataaars",
    "bottts",
    "lorelei",
    "micah",
    "personas",
  ]);
  const avatar_url = `https://api.dicebear.com/7.x/${avatarStyle}/svg?seed=${username}`;

  // Generate joining date (between 2 years ago and 6 months ago)
  const now = new Date();
  const twoYearsAgo = new Date(now);
  twoYearsAgo.setFullYear(now.getFullYear() - 2);
  const sixMonthsAgo = new Date(now);
  sixMonthsAgo.setMonth(now.getMonth() - 6);
  const joining_date = faker.date
    .between({ from: twoYearsAgo, to: sixMonthsAgo })
    .toISOString();

  return {
    username,
    name,
    title: faker.person.jobTitle(),
    avatar_url,
    bio: generateBio(),
    joining_date,
    meta: null,
  };
}

/**
 * Generate multiple organizers
 */
export function generateOrganizers(count: number): Organizer[] {
  const organizers: Organizer[] = [];
  const usernames = new Set<string>();

  while (organizers.length < count) {
    const organizer = generateOrganizer();

    // Ensure unique usernames
    if (!usernames.has(organizer.username)) {
      usernames.add(organizer.username);
      organizers.push(organizer);
    }
  }

  return organizers;
}
