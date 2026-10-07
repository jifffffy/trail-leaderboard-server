import type { Database, Logger } from "@starter/leaderboard-api";
import { createDatabase, initializeSchema } from "@starter/leaderboard-api";
import { mkdtemp, rm, writeFile } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { bandForDistance, DEFAULT_RACE_DEFINITIONS } from "../config";
import plugin from "../index";
import { RaceArticleSchema } from "../schema";

const ARTICLE = `---
organizer:
  name: 耐吉赛事
  slug: naiji-saishi
  url: https://example.com/naiji
  logo_url: https://example.com/naiji.png
  bio: 专注越野赛事
event:
  title: 2026富川（西岭药谷）古明城越野赛
  slug: fuchuan-gumingcheng-2026
  date: 2026-11-08
  location: 广西富川古明城
  url: https://mp.weixin.qq.com/s/JSD56r2gue_EsI1Eu-uqiQ
categories:
  - name: 橙就巅峰
    distance_km: 50
    elevation_gain_m: 2890
    cutoff_hours: 15
    itra_points: 3
    level: L1
  - name: 橙风破浪
    distance_km: 35
    elevation_gain_m: 2154
    cutoff_hours: 11
    itra_points: 2
    level: M1
  - name: 橙胜追击
    distance_km: 18
    elevation_gain_m: 325
    cutoff_hours: 4
    level: S1
  - name: 橙意满满
    distance_km: 6
---
# 跑山好时节

11月的岭南，刚褪去暑热，正是跑山的黄金时节。
`;

const SECOND_ARTICLE = `---
organizer:
  name: 耐吉赛事
  slug: naiji-saishi
event:
  title: 2027某某越野赛
  slug: moumou-2027
  date: 2027-03-01
categories:
  - name: 全程
    distance_km: 42
---
第二场赛事。
`;

const logger: Logger = {
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
};

const orgConfig = {
  name: "Test Org",
  description: "Test",
  url: "https://example.com",
  logo_url: "https://example.com/logo.png",
};

describe("RaceArticleSchema", () => {
  it("accepts a well-formed article", () => {
    const parsed = RaceArticleSchema.safeParse({
      organizer: { name: "耐吉赛事", slug: "naiji-saishi" },
      event: { title: "某越野赛", slug: "mou-2027", date: "2027-01-01" },
      categories: [{ name: "全程", distance_km: 42 }],
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects an invalid date and missing categories", () => {
    const parsed = RaceArticleSchema.safeParse({
      organizer: { name: "耐吉赛事", slug: "naiji-saishi" },
      event: { title: "某越野赛", slug: "mou-2027", date: "2027/01/01" },
      categories: [],
    });
    expect(parsed.success).toBe(false);
  });
});

describe("bandForDistance", () => {
  it("maps distances to the highest matching band", () => {
    const bands = DEFAULT_RACE_DEFINITIONS;
    expect(bandForDistance(50, bands).slug).toBe("race_ultra");
    expect(bandForDistance(35, bands).slug).toBe("race_long");
    expect(bandForDistance(18, bands).slug).toBe("race_short");
    expect(bandForDistance(6, bands).slug).toBe("race_fun");
  });
});

describe("race-articles plugin", () => {
  let db: Database;
  let articlesDir: string;

  beforeEach(async () => {
    db = createDatabase(":memory:");
    await initializeSchema(db);
    articlesDir = await mkdtemp(join(tmpdir(), "race-articles-"));
  });

  afterEach(async () => {
    await db.close();
    await rm(articlesDir, { recursive: true, force: true });
  });

  it("registers race definitions during setup", async () => {
    await plugin.setup!({ db, config: {}, orgConfig, logger });
    const result = await db.execute(
      "SELECT slug FROM race_definition ORDER BY slug",
    );
    expect(result.rows.map((r) => r.slug)).toEqual([
      "race_fun",
      "race_long",
      "race_short",
      "race_ultra",
    ]);
  });

  it("creates an organizer organizer and one race per event", async () => {
    await writeFile(join(articlesDir, "fuchuan.md"), ARTICLE, "utf8");
    await plugin.setup!({ db, config: {}, orgConfig, logger });
    await plugin.scrape!({ db, config: { articlesDir }, orgConfig, logger });

    const organizers = await db.execute(
      "SELECT username, name, avatar_url, bio FROM organizer",
    );
    expect(organizers.rows).toHaveLength(1);
    expect(organizers.rows[0]).toMatchObject({
      username: "naiji-saishi",
      name: "耐吉赛事",
      avatar_url: "https://example.com/naiji.png",
      bio: "专注越野赛事",
    });

    const races = await db.execute(
      "SELECT slug, race_definition, occurred_at, meta FROM race",
    );
    expect(races.rows).toHaveLength(1);
    const race = races.rows[0] as {
      slug: string;
      race_definition: string;
      occurred_at: string;
      meta: string;
    };
    expect(race.slug).toBe("fuchuan-gumingcheng-2026");
    // Band comes from the longest category (50km -> ultra).
    expect(race.race_definition).toBe("race_ultra");
    expect(race.occurred_at).toBe("2026-11-08T00:00:00.000Z");

    const meta = JSON.parse(race.meta);
    expect(meta).toMatchObject({
      event_title: "2026富川（西岭药谷）古明城越野赛",
      organizer_slug: "naiji-saishi",
      category_count: 4,
    });
    expect(meta.categories).toHaveLength(4);
    expect(meta.categories[0]).toMatchObject({
      name: "橙就巅峰",
      distance_km: 50,
      elevation_gain_m: 2890,
      itra_points: 3,
    });
  });

  it("merges organizer data across events", async () => {
    await writeFile(join(articlesDir, "a-fuchuan.md"), ARTICLE, "utf8");
    await writeFile(join(articlesDir, "b-moumou.md"), SECOND_ARTICLE, "utf8");
    await plugin.setup!({ db, config: {}, orgConfig, logger });
    await plugin.scrape!({ db, config: { articlesDir }, orgConfig, logger });

    const organizers = await db.execute(
      "SELECT username, name, avatar_url, bio FROM organizer",
    );
    expect(organizers.rows).toHaveLength(1);
    expect(organizers.rows[0]).toMatchObject({
      username: "naiji-saishi",
      avatar_url: "https://example.com/naiji.png",
      bio: "专注越野赛事",
    });

    const races = await db.execute("SELECT COUNT(*) as count FROM race");
    expect((races.rows[0] as { count: number }).count).toBe(2);
  });

  it("removes races deleted from the corpus on re-scrape", async () => {
    const first = join(articlesDir, "a-fuchuan.md");
    await writeFile(first, ARTICLE, "utf8");
    await writeFile(join(articlesDir, "b-moumou.md"), SECOND_ARTICLE, "utf8");
    await plugin.setup!({ db, config: {}, orgConfig, logger });
    await plugin.scrape!({ db, config: { articlesDir }, orgConfig, logger });

    let count = await db.execute("SELECT COUNT(*) as count FROM race");
    expect((count.rows[0] as { count: number }).count).toBe(2);

    // Deleting a source file must remove its race on the next run.
    await rm(first);
    await plugin.scrape!({ db, config: { articlesDir }, orgConfig, logger });

    count = await db.execute("SELECT COUNT(*) as count FROM race");
    expect((count.rows[0] as { count: number }).count).toBe(1);
    const organizers = await db.execute(
      "SELECT COUNT(*) as count FROM organizer",
    );
    expect((organizers.rows[0] as { count: number }).count).toBe(1);
  });

  it("skips invalid files without failing the run", async () => {
    await writeFile(
      join(articlesDir, "broken.md"),
      "---\norganizer:\n  name: X\n---\nbody",
      "utf8",
    );
    await plugin.setup!({ db, config: {}, orgConfig, logger });
    await expect(
      plugin.scrape!({ db, config: { articlesDir }, orgConfig, logger }),
    ).resolves.toBeUndefined();

    const result = await db.execute("SELECT COUNT(*) as count FROM organizer");
    expect((result.rows[0] as { count: number }).count).toBe(0);
  });

  it("is a no-op when the articles directory is missing", async () => {
    await plugin.setup!({ db, config: {}, orgConfig, logger });
    await plugin.scrape!({
      db,
      config: { articlesDir: join(articlesDir, "does-not-exist") },
      orgConfig,
      logger,
    });

    const result = await db.execute("SELECT COUNT(*) as count FROM organizer");
    expect((result.rows[0] as { count: number }).count).toBe(0);
  });
});
