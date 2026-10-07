/**
 * Data loader tests
 */

import {
  createDatabase,
  initializeSchema,
  organizerQueries,
  raceDefinitionQueries,
  raceQueries,
  type Database,
} from "@starter/leaderboard-api";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  getAllOrganizers,
  getAllOrganizersWithAvatars,
  getAllOrganizerUsernames,
  getAllRaceDefinitions,
  getOrganizer,
  getOrganizerProfile,
  getOrganizerStats,
  getRaces,
  listRaceDefinitions,
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
    await organizerQueries.upsert(db, {
      username: "alice",
      name: "Alice Smith",
      title: "Engineer",
      avatar_url: "https://example.com/alice.png",
      bio: "Alice is a software engineer",
      joining_date: "2020-01-01",
      meta: null,
    });

    await organizerQueries.upsert(db, {
      username: "bob",
      name: "Bob Jones",
      title: null,
      avatar_url: "https://example.com/bob.png",
      bio: null,
      joining_date: "2021-01-01",
      meta: null,
    });

    await raceDefinitionQueries.insertOrIgnore(db, {
      slug: "entry_created",
      name: "Entry Created",
      description: "Created an entry",
      points: 10,
      icon: "plus-circle",
    });

    await raceDefinitionQueries.insertOrIgnore(db, {
      slug: "comment_added",
      name: "Comment Added",
      description: "Added a comment",
      points: 5,
      icon: "message-square",
    });

    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);

    await raceQueries.upsert(db, {
      slug: "alice-1",
      organizer: "alice",
      race_definition: "entry_created",
      title: "First entry",
      occurred_at: now.toISOString(),
      link: "https://example.com/entries/1",
      text: null,
      points: 10,
      meta: null,
    });

    await raceQueries.upsert(db, {
      slug: "alice-2",
      organizer: "alice",
      race_definition: "entry_created",
      title: "Second entry",
      occurred_at: yesterday.toISOString(),
      link: "https://example.com/entries/2",
      text: null,
      points: 10,
      meta: null,
    });

    await raceQueries.upsert(db, {
      slug: "bob-1",
      organizer: "bob",
      race_definition: "comment_added",
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

  describe("getAllOrganizers", () => {
    it("should return all organizers", async () => {
      const organizers = await getAllOrganizers();
      expect(organizers).toHaveLength(2);
      expect(organizers.map((c) => c.username).sort()).toEqual([
        "alice",
        "bob",
      ]);
    });
  });

  describe("getOrganizer", () => {
    it("should return a specific organizer", async () => {
      const organizer = await getOrganizer("alice");
      expect(organizer).not.toBeNull();
      expect(organizer?.name).toBe("Alice Smith");
    });

    it("should return null for non-existent organizer", async () => {
      const organizer = await getOrganizer("nonexistent");
      expect(organizer).toBeNull();
    });
  });

  describe("getAllRaceDefinitions", () => {
    it("should return all race definitions", async () => {
      const definitions = await getAllRaceDefinitions();
      expect(definitions).toHaveLength(2);
      expect(definitions.map((d) => d.slug).sort()).toEqual([
        "comment_added",
        "entry_created",
      ]);
    });
  });

  describe("getRaces", () => {
    it("should return all races", async () => {
      const races = await getRaces();
      expect(races).toHaveLength(3);
    });

    it("should filter by organizer", async () => {
      const races = await getRaces({ organizer: "alice" });
      expect(races).toHaveLength(2);
      expect(races.every((a) => a.organizer === "alice")).toBe(true);
    });

    it("should limit results", async () => {
      const races = await getRaces({ limit: 2 });
      expect(races).toHaveLength(2);
    });
  });

  describe("getOrganizerStats", () => {
    it("should return organizer stats", async () => {
      const stats = await getOrganizerStats("alice");

      expect(stats.totalPoints).toBe(20); // 2 entries x 10 points
      expect(stats.raceCount).toBe(2);
      expect(stats.races).toHaveLength(2);
    });
  });

  describe("getAllOrganizerUsernames", () => {
    it("should return all usernames", async () => {
      const usernames = await getAllOrganizerUsernames();
      expect(usernames).toHaveLength(2);
      expect(usernames.sort()).toEqual(["alice", "bob"]);
    });
  });

  describe("getOrganizerProfile", () => {
    it("should return complete organizer profile", async () => {
      const profile = await getOrganizerProfile("alice");

      expect(profile.organizer).not.toBeNull();
      expect(profile.organizer?.username).toBe("alice");
      expect(profile.totalPoints).toBe(20);
      expect(profile.races).toHaveLength(2);
      expect(Object.keys(profile.raceByDate).length).toBeGreaterThan(0);
    });

    it("should return null for non-existent organizer", async () => {
      const profile = await getOrganizerProfile("nonexistent");

      expect(profile.organizer).toBeNull();
      expect(profile.races).toHaveLength(0);
      expect(profile.totalPoints).toBe(0);
    });

    it("should enrich races with definition names", async () => {
      const profile = await getOrganizerProfile("alice");

      expect(profile.races[0]).toHaveProperty("race_name");
      expect(profile.races[0].race_name).toBe("Entry Created");
    });
  });

  describe("listRaceDefinitions", () => {
    it("should list all race definitions", async () => {
      const definitions = await listRaceDefinitions();
      expect(definitions).toHaveLength(2);
      expect(definitions[0]).toHaveProperty("slug");
      expect(definitions[0]).toHaveProperty("name");
    });
  });

  describe("getAllOrganizersWithAvatars", () => {
    it("should return organizers with avatars and points", async () => {
      const organizers = await getAllOrganizersWithAvatars();

      expect(organizers).toHaveLength(2);
      expect(organizers[0]).toHaveProperty("username");
      expect(organizers[0]).toHaveProperty("avatar_url");
      expect(organizers[0]).toHaveProperty("totalPoints");
    });

    it("should sort by total points descending", async () => {
      const organizers = await getAllOrganizersWithAvatars();

      expect(organizers[0].username).toBe("alice");
      expect(organizers[0].totalPoints).toBeGreaterThan(
        organizers[1].totalPoints,
      );
    });
  });
});
