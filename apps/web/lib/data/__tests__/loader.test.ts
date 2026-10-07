/**
 * Data loader tests
 */

import {
  activityDefinitionQueries,
  activityQueries,
  contributorQueries,
  createDatabase,
  initializeSchema,
  type Database,
} from "@starter/leaderboard-api";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  getActivities,
  getAllActivityDefinitions,
  getAllContributors,
  getAllContributorsWithAvatars,
  getAllContributorUsernames,
  getContributor,
  getContributorProfile,
  getContributorStats,
  listActivityDefinitions,
} from "../loader";

// Mock the database client
vi.mock("../../../lib/db/client", () => ({
  getDatabase: () => db,
  closeDatabase: vi.fn(),
}));

let db: Database;

describe("Data Loader", () => {
  beforeEach(async () => {
    db = createDatabase(":memory:");
    await initializeSchema(db);

    // Set up test data
    await contributorQueries.upsert(db, {
      username: "alice",
      name: "Alice Smith",
      title: "Engineer",
      avatar_url: "https://example.com/alice.png",
      bio: "Alice is a software engineer",
      joining_date: "2020-01-01",
      meta: null,
    });

    await contributorQueries.upsert(db, {
      username: "bob",
      name: "Bob Jones",
      title: null,
      avatar_url: "https://example.com/bob.png",
      bio: null,
      joining_date: "2021-01-01",
      meta: null,
    });

    await activityDefinitionQueries.insertOrIgnore(db, {
      slug: "entry_created",
      name: "Entry Created",
      description: "Created an entry",
      points: 10,
      icon: "plus-circle",
    });

    await activityDefinitionQueries.insertOrIgnore(db, {
      slug: "comment_added",
      name: "Comment Added",
      description: "Added a comment",
      points: 5,
      icon: "message-square",
    });

    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);

    await activityQueries.upsert(db, {
      slug: "alice-1",
      contributor: "alice",
      activity_definition: "entry_created",
      title: "First entry",
      occurred_at: now.toISOString(),
      link: "https://example.com/entries/1",
      text: null,
      points: 10,
      meta: null,
    });

    await activityQueries.upsert(db, {
      slug: "alice-2",
      contributor: "alice",
      activity_definition: "entry_created",
      title: "Second entry",
      occurred_at: yesterday.toISOString(),
      link: "https://example.com/entries/2",
      text: null,
      points: 10,
      meta: null,
    });

    await activityQueries.upsert(db, {
      slug: "bob-1",
      contributor: "bob",
      activity_definition: "comment_added",
      title: "A comment",
      occurred_at: now.toISOString(),
      link: "https://example.com/entries/1#c",
      text: null,
      points: 5,
      meta: null,
    });
  });

  afterEach(async () => {
    await db.close();
  });

  describe("getAllContributors", () => {
    it("should return all contributors", async () => {
      const contributors = await getAllContributors();
      expect(contributors).toHaveLength(2);
      expect(contributors.map((c) => c.username).sort()).toEqual([
        "alice",
        "bob",
      ]);
    });
  });

  describe("getContributor", () => {
    it("should return a specific contributor", async () => {
      const contributor = await getContributor("alice");
      expect(contributor).not.toBeNull();
      expect(contributor?.name).toBe("Alice Smith");
    });

    it("should return null for non-existent contributor", async () => {
      const contributor = await getContributor("nonexistent");
      expect(contributor).toBeNull();
    });
  });

  describe("getAllActivityDefinitions", () => {
    it("should return all activity definitions", async () => {
      const definitions = await getAllActivityDefinitions();
      expect(definitions).toHaveLength(2);
      expect(definitions.map((d) => d.slug).sort()).toEqual([
        "comment_added",
        "entry_created",
      ]);
    });
  });

  describe("getActivities", () => {
    it("should return all activities", async () => {
      const activities = await getActivities();
      expect(activities).toHaveLength(3);
    });

    it("should filter by contributor", async () => {
      const activities = await getActivities({ contributor: "alice" });
      expect(activities).toHaveLength(2);
      expect(activities.every((a) => a.contributor === "alice")).toBe(true);
    });

    it("should limit results", async () => {
      const activities = await getActivities({ limit: 2 });
      expect(activities).toHaveLength(2);
    });
  });

  describe("getContributorStats", () => {
    it("should return contributor stats", async () => {
      const stats = await getContributorStats("alice");

      expect(stats.totalPoints).toBe(20); // 2 entries x 10 points
      expect(stats.activityCount).toBe(2);
      expect(stats.activities).toHaveLength(2);
    });
  });

  describe("getAllContributorUsernames", () => {
    it("should return all usernames", async () => {
      const usernames = await getAllContributorUsernames();
      expect(usernames).toHaveLength(2);
      expect(usernames.sort()).toEqual(["alice", "bob"]);
    });
  });

  describe("getContributorProfile", () => {
    it("should return complete contributor profile", async () => {
      const profile = await getContributorProfile("alice");

      expect(profile.contributor).not.toBeNull();
      expect(profile.contributor?.username).toBe("alice");
      expect(profile.totalPoints).toBe(20);
      expect(profile.activities).toHaveLength(2);
      expect(Object.keys(profile.activityByDate).length).toBeGreaterThan(0);
    });

    it("should return null for non-existent contributor", async () => {
      const profile = await getContributorProfile("nonexistent");

      expect(profile.contributor).toBeNull();
      expect(profile.activities).toHaveLength(0);
      expect(profile.totalPoints).toBe(0);
    });

    it("should enrich activities with definition names", async () => {
      const profile = await getContributorProfile("alice");

      expect(profile.activities[0]).toHaveProperty("activity_name");
      expect(profile.activities[0].activity_name).toBe("Entry Created");
    });
  });

  describe("listActivityDefinitions", () => {
    it("should list all activity definitions", async () => {
      const definitions = await listActivityDefinitions();
      expect(definitions).toHaveLength(2);
      expect(definitions[0]).toHaveProperty("slug");
      expect(definitions[0]).toHaveProperty("name");
    });
  });

  describe("getAllContributorsWithAvatars", () => {
    it("should return contributors with avatars and points", async () => {
      const contributors = await getAllContributorsWithAvatars();

      expect(contributors).toHaveLength(2);
      expect(contributors[0]).toHaveProperty("username");
      expect(contributors[0]).toHaveProperty("avatar_url");
      expect(contributors[0]).toHaveProperty("totalPoints");
    });

    it("should sort by total points descending", async () => {
      const contributors = await getAllContributorsWithAvatars();

      expect(contributors[0].username).toBe("alice");
      expect(contributors[0].totalPoints).toBeGreaterThan(
        contributors[1].totalPoints,
      );
    });
  });
});
