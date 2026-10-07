#!/usr/bin/env node
/**
 * Seed script for generating dummy data
 */

import { mkdir, writeFile } from "fs/promises";
import matter from "gray-matter";
import { join } from "path";
import type { Organizer, Race, RaceDefinition } from "./types";

const FIRST_NAMES = [
  "Alice",
  "Bob",
  "Charlie",
  "Diana",
  "Eve",
  "Frank",
  "Grace",
  "Henry",
  "Iris",
  "Jack",
  "Kate",
  "Liam",
  "Maya",
  "Noah",
  "Olivia",
  "Peter",
  "Quinn",
  "Rachel",
  "Sam",
  "Tara",
  "Uma",
  "Victor",
  "Wendy",
  "Xander",
  "Yara",
  "Zane",
];

const LAST_NAMES = [
  "Smith",
  "Johnson",
  "Williams",
  "Brown",
  "Jones",
  "Garcia",
  "Miller",
  "Davis",
  "Rodriguez",
  "Martinez",
  "Hernandez",
  "Lopez",
  "Gonzalez",
  "Wilson",
  "Anderson",
  "Thomas",
  "Taylor",
  "Moore",
  "Jackson",
  "Martin",
];

const RACE_DEFS: RaceDefinition[] = [
  {
    slug: "entry_created",
    name: "Entry Created",
    description: "Created a new entry",
    points: 5,
    icon: "plus-circle",
  },
  {
    slug: "entry_updated",
    name: "Entry Updated",
    description: "Updated an existing entry",
    points: 2,
    icon: "pencil",
  },
  {
    slug: "entry_published",
    name: "Entry Published",
    description: "Published an entry",
    points: 15,
    icon: "send",
  },
  {
    slug: "entry_reviewed",
    name: "Entry Reviewed",
    description: "Reviewed an entry",
    points: 3,
    icon: "eye",
  },
  {
    slug: "comment_added",
    name: "Comment Added",
    description: "Added a comment",
    points: 1,
    icon: "message-square",
  },
  {
    slug: "milestone_reached",
    name: "Milestone Reached",
    description: "Reached a milestone",
    points: 12,
    icon: "flag",
  },
  {
    slug: "reference_added",
    name: "Reference Added",
    description: "Added a reference",
    points: 4,
    icon: "link",
  },
  {
    slug: "attachment_added",
    name: "Attachment Added",
    description: "Attached a file",
    points: 3,
    icon: "paperclip",
  },
];

const BIO_TEMPLATES = [
  "is a passionate developer specializing in {tech1} and {tech2}. Contributes regularly to open source projects.",
  "has been working on distributed systems and {tech1} for over {years} years. Enjoys solving complex problems.",
  "is an advocate for clean code and best practices. Specializes in {tech1}, {tech2}, and system architecture.",
  "brings expertise in {tech1} and {tech2} to the team. Known for thorough code reviews and mentorship.",
  "focuses on performance optimization and {tech1}. Has contributed to multiple high-impact projects.",
];

const TECH_STACK = [
  "TypeScript",
  "Python",
  "Go",
  "Rust",
  "Kubernetes",
  "PostgreSQL",
  "React",
  "Node.js",
  "Docker",
  "AWS",
  "GraphQL",
  "Redis",
  "MongoDB",
  "Next.js",
  "TailwindCSS",
  "WebAssembly",
];

function randomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateUsername(firstName: string, lastName: string): string {
  return `${firstName.toLowerCase()}${lastName.toLowerCase()[0]}${randomInt(
    1,
    99,
  )}`;
}

function generateBio(name: string): string {
  const template = randomElement(BIO_TEMPLATES);
  const tech1 = randomElement(TECH_STACK);
  const tech2 = randomElement(TECH_STACK.filter((t) => t !== tech1));
  const years = randomInt(2, 10);

  return `${name} ${template
    .replace("{tech1}", tech1)
    .replace("{tech2}", tech2)
    .replace("{years}", years.toString())}`;
}

function generateOrganizer(): Organizer {
  const firstName = randomElement(FIRST_NAMES);
  const lastName = randomElement(LAST_NAMES);
  const username = generateUsername(firstName, lastName);
  const name = `${firstName} ${lastName}`;

  const joiningDate = new Date(
    Date.now() - randomInt(30, 365 * 3) * 24 * 60 * 60 * 1000,
  )
    .toISOString()
    .split("T")[0];

  return {
    username,
    name,
    title:
      Math.random() > 0.3
        ? randomElement([
            "Engineer",
            "Senior Engineer",
            "Tech Lead",
            "Architect",
          ])
        : null,
    avatar_url: `https://api.dicebear.com/7.x/shapes/svg?seed=${username}`,
    bio: generateBio(name),
    joining_date: joiningDate,
    meta: {
      timezone: randomElement(["PST", "EST", "UTC", "IST", "CET"]),
      team: randomElement(["backend", "frontend", "devops", "fullstack"]),
    },
  };
}

function generateRace(
  organizer: string,
  raceDef: RaceDefinition,
  index: number,
): Race {
  const daysAgo = randomInt(0, 180);
  const occurredAt = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);

  return {
    slug: `${organizer}-${raceDef.slug}-${index}`,
    organizer,
    race_definition: raceDef.slug,
    title: `${raceDef.name} #${index}`,
    occurred_at: occurredAt.toISOString(),
    link: `https://example.com/entries/${randomInt(1, 9999)}`,
    text: null,
    points: raceDef.points,
    meta: {
      source: randomElement(["source-a", "source-b", "source-c"]),
    },
  };
}

async function writeOrganizerMarkdown(
  outputDir: string,
  organizer: Organizer,
): Promise<void> {
  const { username, bio, ...frontmatter } = organizer;

  const content = matter.stringify(bio || "", {
    ...frontmatter,
    username,
  });

  const filePath = join(outputDir, "organizers", `${username}.md`);
  await writeFile(filePath, content, "utf8");
}

async function writeRacesJsonl(
  outputDir: string,
  username: string,
  races: Race[],
): Promise<void> {
  const content = races.map((a) => JSON.stringify(a)).join("\n");
  const filePath = join(outputDir, "races", `${username}.jsonl`);
  await writeFile(filePath, content + "\n", "utf8");
}

async function main() {
  const args = process.argv.slice(2);
  const outputDir =
    args.find((arg) => arg.startsWith("--output="))?.split("=")[1] ||
    "./test-data";

  console.log(`Generating seed data to: ${outputDir}`);

  // Create directories
  await mkdir(join(outputDir, "organizers"), { recursive: true });
  await mkdir(join(outputDir, "races"), { recursive: true });

  // Generate organizers
  const numOrganizers = randomInt(15, 30);
  const organizers: Organizer[] = [];

  for (let i = 0; i < numOrganizers; i++) {
    const organizer = generateOrganizer();
    organizers.push(organizer);
    await writeOrganizerMarkdown(outputDir, organizer);
  }

  console.log(`✓ Generated ${organizers.length} organizers`);

  // Generate races for each organizer
  let totalRaces = 0;

  for (const organizer of organizers) {
    const numRaces = randomInt(5, 50);
    const races: Race[] = [];

    for (let i = 0; i < numRaces; i++) {
      const raceDef = randomElement(RACE_DEFS);
      const race = generateRace(organizer.username, raceDef, i);
      races.push(race);
    }

    // Sort by date
    races.sort((a, b) => a.occurred_at.localeCompare(b.occurred_at));

    await writeRacesJsonl(outputDir, organizer.username, races);
    totalRaces += races.length;
  }

  console.log(`✓ Generated ${totalRaces} races`);

  // Write race definitions info (for reference only)
  const defsPath = join(outputDir, "race_definitions.json");
  await writeFile(defsPath, JSON.stringify(RACE_DEFS, null, 2), "utf8");
  console.log(`✓ Wrote ${RACE_DEFS.length} race definitions to ${defsPath}`);

  console.log("\n✅ Seed data generation complete!");
  console.log(`\nTo use this data:`);
  console.log(`  1. Set LEADERBOARD_DATA_DIR=${outputDir}`);
  console.log(`  2. Run the plugin-runner to import data`);
}

main().catch((error) => {
  console.error("Error generating seed data:", error);
  process.exit(1);
});
