#!/usr/bin/env node
/**
 * Seed script for generating dummy data
 */

import { mkdir, writeFile } from "fs/promises";
import matter from "gray-matter";
import { join } from "path";
import type { Activity, ActivityDefinition, Contributor } from "./types";

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

const ACTIVITY_DEFS: ActivityDefinition[] = [
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

function generateContributor(): Contributor {
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

function generateActivity(
  contributor: string,
  activityDef: ActivityDefinition,
  index: number,
): Activity {
  const daysAgo = randomInt(0, 180);
  const occurredAt = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);

  return {
    slug: `${contributor}-${activityDef.slug}-${index}`,
    contributor,
    activity_definition: activityDef.slug,
    title: `${activityDef.name} #${index}`,
    occurred_at: occurredAt.toISOString(),
    link: `https://example.com/entries/${randomInt(1, 9999)}`,
    text: null,
    points: activityDef.points,
    meta: {
      source: randomElement(["source-a", "source-b", "source-c"]),
    },
  };
}

async function writeContributorMarkdown(
  outputDir: string,
  contributor: Contributor,
): Promise<void> {
  const { username, bio, ...frontmatter } = contributor;

  const content = matter.stringify(bio || "", {
    ...frontmatter,
    username,
  });

  const filePath = join(outputDir, "contributors", `${username}.md`);
  await writeFile(filePath, content, "utf8");
}

async function writeActivitiesJsonl(
  outputDir: string,
  username: string,
  activities: Activity[],
): Promise<void> {
  const content = activities.map((a) => JSON.stringify(a)).join("\n");
  const filePath = join(outputDir, "activities", `${username}.jsonl`);
  await writeFile(filePath, content + "\n", "utf8");
}

async function main() {
  const args = process.argv.slice(2);
  const outputDir =
    args.find((arg) => arg.startsWith("--output="))?.split("=")[1] ||
    "./test-data";

  console.log(`Generating seed data to: ${outputDir}`);

  // Create directories
  await mkdir(join(outputDir, "contributors"), { recursive: true });
  await mkdir(join(outputDir, "activities"), { recursive: true });

  // Generate contributors
  const numContributors = randomInt(15, 30);
  const contributors: Contributor[] = [];

  for (let i = 0; i < numContributors; i++) {
    const contributor = generateContributor();
    contributors.push(contributor);
    await writeContributorMarkdown(outputDir, contributor);
  }

  console.log(`✓ Generated ${contributors.length} contributors`);

  // Generate activities for each contributor
  let totalActivities = 0;

  for (const contributor of contributors) {
    const numActivities = randomInt(5, 50);
    const activities: Activity[] = [];

    for (let i = 0; i < numActivities; i++) {
      const activityDef = randomElement(ACTIVITY_DEFS);
      const activity = generateActivity(contributor.username, activityDef, i);
      activities.push(activity);
    }

    // Sort by date
    activities.sort((a, b) => a.occurred_at.localeCompare(b.occurred_at));

    await writeActivitiesJsonl(outputDir, contributor.username, activities);
    totalActivities += activities.length;
  }

  console.log(`✓ Generated ${totalActivities} activities`);

  // Write activity definitions info (for reference only)
  const defsPath = join(outputDir, "activity_definitions.json");
  await writeFile(defsPath, JSON.stringify(ACTIVITY_DEFS, null, 2), "utf8");
  console.log(
    `✓ Wrote ${ACTIVITY_DEFS.length} activity definitions to ${defsPath}`,
  );

  console.log("\n✅ Seed data generation complete!");
  console.log(`\nTo use this data:`);
  console.log(`  1. Set LEADERBOARD_DATA_DIR=${outputDir}`);
  console.log(`  2. Run the plugin-runner to import data`);
}

main().catch((error) => {
  console.error("Error generating seed data:", error);
  process.exit(1);
});
