/**
 * Tests for dummy plugin
 */

import { faker } from "@faker-js/faker";
import type { Database } from "@starter/leaderboard-api";
import { createDatabase, initializeSchema } from "@starter/leaderboard-api";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { DEFAULT_CONFIG, mergeConfig } from "../config";
import plugin from "../index";
import { generateOrganizer, generateOrganizers } from "../organizers";
import {
  RACE_TYPES,
  generateRace,
  generateRaces,
  generateRacesForOrganizer,
} from "../races";

describe("Dummy Plugin", () => {
  describe("Configuration", () => {
    it("should merge configs correctly", () => {
      const config = mergeConfig({
        organizers: {
          count: 20,
        },
      });

      expect(config.organizers.count).toBe(20);
      expect(config.organizers.minRacesPerOrganizer).toBe(
        DEFAULT_CONFIG.organizers.minRacesPerOrganizer,
      );
      expect(config.races.daysBack).toBe(DEFAULT_CONFIG.races.daysBack);
    });

    it("should handle empty config", () => {
      const config = mergeConfig();

      expect(config.organizers.count).toBe(DEFAULT_CONFIG.organizers.count);
      expect(config.races.daysBack).toBe(DEFAULT_CONFIG.races.daysBack);
    });

    it("should handle seed configuration", () => {
      const config = mergeConfig({
        races: {
          seed: 12345,
        },
      });

      expect(config.races.seed).toBe(12345);
    });

    it("should default source names", () => {
      const config = mergeConfig();

      expect(config.sources).toEqual(DEFAULT_CONFIG.sources);
    });
  });

  describe("Organizer Generation", () => {
    it("should generate a single organizer", () => {
      const organizer = generateOrganizer();

      expect(organizer).toBeDefined();
      expect(organizer.username).toBeTruthy();
      expect(organizer.name).toBeTruthy();
      expect(organizer.avatar_url).toBeTruthy();
      expect(organizer.joining_date).toBeTruthy();
    });

    it("should generate unique usernames", () => {
      const organizers = generateOrganizers(30);
      const usernames = organizers.map((c) => c.username);
      const uniqueUsernames = new Set(usernames);

      expect(uniqueUsernames.size).toBe(30);
    });
  });

  describe("Race Generation", () => {
    it("should generate a single race", () => {
      const race = generateRace(
        "testuser",
        "entry_created",
        "source-a",
        new Date(),
      );

      expect(race).toBeDefined();
      expect(race.organizer).toBe("testuser");
      expect(race.race_definition).toBe("entry_created");
      expect(race.points).toBe(RACE_TYPES.entry_created.points);
      expect(race.title).toBeTruthy();
      expect(race.link).toContain("example.com");
    });

    it("should generate races for a organizer", () => {
      const races = generateRacesForOrganizer("testuser", 10, 30, [
        "source-a",
        "source-b",
      ]);

      expect(races).toHaveLength(10);
      expect(races.every((a) => a.organizer === "testuser")).toBe(true);
    });

    it("should generate races with valid timestamps", () => {
      const now = new Date();
      const daysBack = 30;
      const races = generateRacesForOrganizer("testuser", 20, daysBack, [
        "source-a",
      ]);

      const startDate = new Date(now);
      startDate.setDate(startDate.getDate() - daysBack);

      for (const race of races) {
        const raceDate = new Date(race.occurred_at);
        expect(raceDate.getTime()).toBeGreaterThanOrEqual(startDate.getTime());
        expect(raceDate.getTime()).toBeLessThanOrEqual(now.getTime());
      }
    });

    it("should generate races sorted by date", () => {
      const races = generateRacesForOrganizer("testuser", 15, 60, ["source-a"]);

      for (let i = 1; i < races.length; i++) {
        const prevDate = new Date(races[i - 1].occurred_at);
        const currDate = new Date(races[i].occurred_at);
        expect(currDate.getTime()).toBeGreaterThanOrEqual(prevDate.getTime());
      }
    });

    it("should generate races for multiple organizers", () => {
      const organizers = ["user1", "user2", "user3"];
      const racesMap = generateRaces(organizers, 5, 10, 30, [
        "source-a",
        "source-b",
      ]);

      expect(racesMap.size).toBe(3);
      expect(racesMap.has("user1")).toBe(true);
      expect(racesMap.has("user2")).toBe(true);
      expect(racesMap.has("user3")).toBe(true);

      for (const [, races] of racesMap) {
        expect(races.length).toBeGreaterThanOrEqual(5);
        expect(races.length).toBeLessThanOrEqual(10);
      }
    });

    it("should generate all race types", () => {
      const organizers = ["user1"];
      const racesMap = generateRaces(organizers, 100, 100, 90, ["source-a"]);

      const races = racesMap.get("user1")!;
      const types = new Set(races.map((a) => a.race_definition));

      // With 100 races, we should have good variety
      expect(types.size).toBeGreaterThan(5);
    });

    it("should use reproducible seed", () => {
      // Test that using the same seed produces the same race type
      faker.seed(12345);
      const type1 = faker.helpers.arrayElement(
        Object.keys(RACE_TYPES) as Array<keyof typeof RACE_TYPES>,
      );

      faker.seed(12345);
      const type2 = faker.helpers.arrayElement(
        Object.keys(RACE_TYPES) as Array<keyof typeof RACE_TYPES>,
      );

      expect(type1).toBe(type2);
    });
  });

  describe("Plugin Integration", () => {
    let db: Database;

    beforeEach(async () => {
      db = createDatabase(":memory:");
      await initializeSchema(db);
    });

    afterEach(async () => {
      await db.close();
    });

    it("should have correct plugin metadata", () => {
      expect(plugin.name).toBe("@starter/plugin-dummy");
      expect(plugin.version).toBeTruthy();
      expect(plugin.setup).toBeDefined();
      expect(plugin.scrape).toBeDefined();
    });

    it("should setup race definitions", async () => {
      const logger = {
        info: () => {},
        warn: () => {},
        error: () => {},
        debug: () => {},
      };

      await plugin.setup!({
        db,
        config: {},
        orgConfig: {
          name: "Test Org",
          description: "Test",
          url: "https://test.com",
          logo_url: "https://test.com/logo.png",
        },
        logger,
      });

      // Check that race definitions were created
      const result = await db.execute(
        "SELECT COUNT(*) as count FROM race_definition",
      );
      const count = (result.rows[0] as { count: number }).count;

      expect(count).toBe(Object.keys(RACE_TYPES).length);
    });

    it("should generate data on scrape", async () => {
      const logger = {
        info: () => {},
        warn: () => {},
        error: () => {},
        debug: () => {},
      };

      // Setup first
      await plugin.setup!({
        db,
        config: {},
        orgConfig: {
          name: "Test Org",
          description: "Test",
          url: "https://test.com",
          logo_url: "https://test.com/logo.png",
        },
        logger,
      });

      // Then scrape
      await plugin.scrape!({
        db,
        config: {
          organizers: {
            count: 10,
            minRacesPerOrganizer: 5,
            maxRacesPerOrganizer: 15,
          },
          races: {
            daysBack: 30,
            seed: 42,
          },
          sources: ["source-a"],
        },
        orgConfig: {
          name: "Test Org",
          description: "Test",
          url: "https://test.com",
          logo_url: "https://test.com/logo.png",
        },
        logger,
      });

      // Check organizers
      const organizersResult = await db.execute(
        "SELECT COUNT(*) as count FROM organizer",
      );
      const organizerCount = (organizersResult.rows[0] as { count: number })
        .count;
      expect(organizerCount).toBe(10);

      // Check races
      const racesResult = await db.execute(
        "SELECT COUNT(*) as count FROM race",
      );
      const raceCount = (racesResult.rows[0] as { count: number }).count;
      expect(raceCount).toBeGreaterThanOrEqual(50); // 10 * 5 minimum
      expect(raceCount).toBeLessThanOrEqual(150); // 10 * 15 maximum
    });
  });
});
