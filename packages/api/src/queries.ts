/**
 * Reusable query builders and helpers
 */

import type {
  AggregateValue,
  BadgeDefinition,
  Database,
  GlobalAggregate,
  Organizer,
  OrganizerAggregate,
  OrganizerAggregateDefinition,
  OrganizerBadge,
  Race,
  RaceDefinition,
} from "./types";

/**
 * Helper to parse organizer JSON fields
 */
function parseOrganizer(row: any): Organizer {
  return {
    ...row,
    meta: row.meta ? JSON.parse(row.meta as string) : null,
  } as Organizer;
}

/**
 * Organizer queries
 */
export const organizerQueries = {
  /**
   * Get all organizers
   */
  async getAll(db: Database): Promise<Organizer[]> {
    const result = await db.execute(
      "SELECT * FROM organizer ORDER BY username",
    );
    return result.rows.map(parseOrganizer);
  },

  /**
   * Get organizer by username
   */
  async getByUsername(
    db: Database,
    username: string,
  ): Promise<Organizer | null> {
    const result = await db.execute(
      "SELECT * FROM organizer WHERE username = ?",
      [username],
    );
    return result.rows[0] ? parseOrganizer(result.rows[0]) : null;
  },

  /**
   * Insert or ignore organizer (used by plugins)
   */
  async insertOrIgnore(db: Database, organizer: Organizer): Promise<void> {
    await db.execute(
      `INSERT OR IGNORE INTO organizer (
        username, name, title, avatar_url, bio, joining_date, meta
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        organizer.username,
        organizer.name,
        organizer.title,
        organizer.avatar_url,
        organizer.bio,
        organizer.joining_date,
        organizer.meta ? JSON.stringify(organizer.meta) : null,
      ],
    );
  },

  /**
   * Insert or update organizer
   */
  async upsert(db: Database, organizer: Organizer): Promise<void> {
    await db.execute(
      `INSERT INTO organizer (
        username, name, title, avatar_url, bio, joining_date, meta
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(username) DO UPDATE SET
        name = excluded.name,
        title = excluded.title,
        avatar_url = excluded.avatar_url,
        bio = excluded.bio,
        joining_date = excluded.joining_date,
        meta = excluded.meta`,
      [
        organizer.username,
        organizer.name,
        organizer.title,
        organizer.avatar_url,
        organizer.bio,
        organizer.joining_date,
        organizer.meta ? JSON.stringify(organizer.meta) : null,
      ],
    );
  },

  /**
   * Delete organizer
   */
  async delete(db: Database, username: string): Promise<void> {
    await db.execute("DELETE FROM organizer WHERE username = ?", [username]);
  },

  /**
   * Count total organizers
   */
  async count(db: Database): Promise<number> {
    const result = await db.execute("SELECT COUNT(*) as count FROM organizer");
    return (result.rows[0] as { count: number }).count;
  },

  /**
   * Get all organizer usernames (optimized - returns only usernames)
   */
  async getAllUsernames(db: Database): Promise<string[]> {
    const result = await db.execute(
      "SELECT username FROM organizer ORDER BY username",
    );
    return result.rows.map((row: any) => row.username as string);
  },

  /**
   * Get organizers with total points.
   * Optimized with JOIN and GROUP BY to avoid N+1 queries
   */
  async getLeaderboardWithPoints(db: Database): Promise<
    Array<{
      username: string;
      name: string | null;
      avatar_url: string | null;
      totalPoints: number;
    }>
  > {
    const sql = `
      SELECT 
        c.username,
        c.name,
        c.avatar_url,
        COALESCE(SUM(COALESCE(a.points, ad.points, 0)), 0) as totalPoints
      FROM organizer c
      LEFT JOIN race a ON c.username = a.organizer
      LEFT JOIN race_definition ad ON a.race_definition = ad.slug
      GROUP BY c.username
      ORDER BY totalPoints DESC
    `;

    const result = await db.execute(sql);
    return result.rows as unknown as Array<{
      username: string;
      name: string | null;
      avatar_url: string | null;
      totalPoints: number;
    }>;
  },

  /**
   * Get organizers who were active within a date range.
   * Returns them sorted by points earned in that period.
   */
  async getActiveOrganizers(
    db: Database,
    startDate: string,
    endDate: string,
  ): Promise<
    Array<{
      username: string;
      name: string | null;
      avatar_url: string | null;
      total_points: number;
    }>
  > {
    const sql = `
      SELECT
        c.username,
        c.name,
        c.avatar_url,
        COALESCE(SUM(COALESCE(a.points, ad.points, 0)), 0) as total_points
      FROM race a
      JOIN organizer c ON a.organizer = c.username
      LEFT JOIN race_definition ad ON a.race_definition = ad.slug
      WHERE a.occurred_at >= ? AND a.occurred_at <= ?
      GROUP BY c.username
      ORDER BY total_points DESC
    `;

    const result = await db.execute(sql, [startDate, endDate]);
    return result.rows as unknown as Array<{
      username: string;
      name: string | null;
      avatar_url: string | null;
      total_points: number;
    }>;
  },
};

/**
 * Race definition queries
 */
export const raceDefinitionQueries = {
  /**
   * Get all race definitions
   */
  async getAll(db: Database): Promise<RaceDefinition[]> {
    const result = await db.execute(
      "SELECT * FROM race_definition ORDER BY slug",
    );
    return result.rows as unknown as RaceDefinition[];
  },

  /**
   * Get race definition by slug
   */
  async getBySlug(db: Database, slug: string): Promise<RaceDefinition | null> {
    const result = await db.execute(
      "SELECT * FROM race_definition WHERE slug = ?",
      [slug],
    );
    return (result.rows[0] as unknown as RaceDefinition) || null;
  },

  /**
   * Insert or ignore race definition (used by plugins)
   */
  async insertOrIgnore(
    db: Database,
    definition: RaceDefinition,
  ): Promise<void> {
    await db.execute(
      `INSERT OR IGNORE INTO race_definition (slug, name, description, points, icon)
       VALUES (?, ?, ?, ?, ?)`,
      [
        definition.slug,
        definition.name,
        definition.description,
        definition.points,
        definition.icon,
      ],
    );
  },

  /**
   * Insert or update race definition
   */
  async upsert(db: Database, definition: RaceDefinition): Promise<void> {
    await db.execute(
      `INSERT INTO race_definition (slug, name, description, points, icon)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(slug) DO UPDATE SET
         name = excluded.name,
         description = excluded.description,
         points = excluded.points,
         icon = excluded.icon`,
      [
        definition.slug,
        definition.name,
        definition.description,
        definition.points,
        definition.icon,
      ],
    );
  },

  /**
   * Count total race definitions
   */
  async count(db: Database): Promise<number> {
    const result = await db.execute(
      "SELECT COUNT(*) as count FROM race_definition",
    );
    return (result.rows[0] as { count: number }).count;
  },
};

/**
 * Helper to parse race JSON fields
 */
function parseRace(row: any): Race {
  return {
    ...row,
    meta: row.meta ? JSON.parse(row.meta as string) : null,
  } as Race;
}

/**
 * Race queries
 */
export const raceQueries = {
  /**
   * Get all races
   */
  async getAll(db: Database, limit?: number, offset?: number): Promise<Race[]> {
    let sql = `
      SELECT 
        a.*,
        COALESCE(a.points, ad.points, 0) as points
      FROM race a
      LEFT JOIN race_definition ad ON a.race_definition = ad.slug
      ORDER BY a.occurred_at DESC
    `;
    const params: unknown[] = [];

    if (limit !== undefined) {
      sql += " LIMIT ?";
      params.push(limit);
    }

    if (offset !== undefined) {
      sql += " OFFSET ?";
      params.push(offset);
    }

    const result = await db.execute(sql, params);
    return result.rows.map(parseRace);
  },

  /**
   * Get races by organizer
   */
  async getByOrganizer(
    db: Database,
    username: string,
    limit?: number,
  ): Promise<Race[]> {
    let sql = `
      SELECT 
        a.*,
        COALESCE(a.points, ad.points, 0) as points
      FROM race a
      LEFT JOIN race_definition ad ON a.race_definition = ad.slug
      WHERE a.organizer = ?
      ORDER BY a.occurred_at DESC
    `;
    const params: unknown[] = [username];

    if (limit !== undefined) {
      sql += " LIMIT ?";
      params.push(limit);
    }

    const result = await db.execute(sql, params);
    return result.rows.map(parseRace);
  },

  /**
   * Get raw races by organizer. No points coalescing.
   */
  async getRawByOrganizer(db: Database, username: string): Promise<Race[]> {
    const result = await db.execute(`SELECT * FROM race WHERE organizer = ?`, [
      username,
    ]);
    return result.rows.map(parseRace);
  },

  /**
   * Get races by date range
   */
  async getByDateRange(
    db: Database,
    startDate: string,
    endDate: string,
  ): Promise<Race[]> {
    const result = await db.execute(
      `SELECT 
        a.*,
        COALESCE(a.points, ad.points, 0) as points
      FROM race a
      LEFT JOIN race_definition ad ON a.race_definition = ad.slug
      WHERE a.occurred_at >= ? AND a.occurred_at <= ?
      ORDER BY a.occurred_at DESC`,
      [startDate, endDate],
    );
    return result.rows.map(parseRace);
  },

  /**
   * Get races by definition
   */
  async getByDefinition(db: Database, definitionSlug: string): Promise<Race[]> {
    const result = await db.execute(
      `SELECT 
        a.*,
        COALESCE(a.points, ad.points, 0) as points
      FROM race a
      LEFT JOIN race_definition ad ON a.race_definition = ad.slug
      WHERE a.race_definition = ?
      ORDER BY a.occurred_at DESC`,
      [definitionSlug],
    );
    return result.rows.map(parseRace);
  },

  /**
   * Get races filtered by multiple race definitions
   * Optimized for streak calculation
   */
  async getByDefinitions(
    db: Database,
    raceDefinitionSlugs: string[],
  ): Promise<Race[]> {
    if (raceDefinitionSlugs.length === 0) {
      return this.getAll(db);
    }

    const placeholders = raceDefinitionSlugs.map(() => "?").join(",");
    const result = await db.execute(
      `SELECT 
        a.*,
        COALESCE(a.points, ad.points, 0) as points
      FROM race a
      LEFT JOIN race_definition ad ON a.race_definition = ad.slug
      WHERE a.race_definition IN (${placeholders})
      ORDER BY a.occurred_at ASC`,
      raceDefinitionSlugs,
    );

    return result.rows.map(parseRace);
  },

  /**
   * Get races by organizer and race definitions
   * Optimized for streak rule evaluation
   */
  async getByOrganizerAndDefinitions(
    db: Database,
    organizer: string,
    raceDefinitionSlugs: string[],
  ): Promise<Race[]> {
    if (raceDefinitionSlugs.length === 0) {
      return this.getByOrganizer(db, organizer);
    }

    const placeholders = raceDefinitionSlugs.map(() => "?").join(",");
    const result = await db.execute(
      `SELECT 
        a.*,
        COALESCE(a.points, ad.points, 0) as points
      FROM race a
      LEFT JOIN race_definition ad ON a.race_definition = ad.slug
      WHERE a.organizer = ? 
        AND a.race_definition IN (${placeholders})
      ORDER BY a.occurred_at ASC`,
      [organizer, ...raceDefinitionSlugs],
    );

    return result.rows.map(parseRace);
  },

  /**
   * Get the date of the Nth race for a organizer (sorted by occurred_at ASC).
   * Used to determine when a organizer crossed an race count threshold.
   * @param offset 0-based offset (e.g., offset=9 returns the 10th race)
   * @param raceDefinition Optional race definition slug to filter by
   */
  async getDateAtOffset(
    db: Database,
    organizer: string,
    offset: number,
    raceDefinition?: string,
  ): Promise<string | null> {
    const params: unknown[] = [organizer];
    let whereClause = "WHERE a.organizer = ?";
    if (raceDefinition) {
      whereClause += " AND a.race_definition = ?";
      params.push(raceDefinition);
    }
    params.push(offset);

    const result = await db.execute(
      `SELECT a.occurred_at
       FROM race a
       ${whereClause}
       ORDER BY a.occurred_at ASC
       LIMIT 1 OFFSET ?`,
      params,
    );

    if (result.rows.length === 0) return null;
    const date = result.rows[0].occurred_at as string;
    return date.split("T")[0];
  },

  /**
   * Get the date when a organizer's cumulative points crossed a threshold.
   * Races are sorted by occurred_at ASC and points are summed progressively.
   */
  async getDateAtPointsThreshold(
    db: Database,
    organizer: string,
    threshold: number,
  ): Promise<string | null> {
    const result = await db.execute(
      `SELECT occurred_at, COALESCE(a.points, ad.points, 0) as points
       FROM race a
       LEFT JOIN race_definition ad ON a.race_definition = ad.slug
       WHERE a.organizer = ?
       ORDER BY a.occurred_at ASC`,
      [organizer],
    );

    let cumulative = 0;
    for (const row of result.rows) {
      cumulative += (row.points as number) || 0;
      if (cumulative >= threshold) {
        const date = row.occurred_at as string;
        return date.split("T")[0];
      }
    }
    return null;
  },

  /**
   * Insert or update race
   */
  async upsert(db: Database, race: Race): Promise<void> {
    await db.execute(
      `INSERT INTO race (
        slug, organizer, race_definition, title, occurred_at, link, text, points, meta
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(slug) DO UPDATE SET
        organizer = excluded.organizer,
        race_definition = excluded.race_definition,
        title = excluded.title,
        occurred_at = excluded.occurred_at,
        link = excluded.link,
        text = excluded.text,
        points = excluded.points,
        meta = excluded.meta`,
      [
        race.slug,
        race.organizer,
        race.race_definition,
        race.title,
        race.occurred_at,
        race.link,
        race.text,
        race.points,
        race.meta ? JSON.stringify(race.meta) : null,
      ],
    );
  },

  /**
   * Insert or update multiple races
   */
  async upsertMany(db: Database, races: Race[]): Promise<void> {
    await db.batch(
      races.map((race) => ({
        sql: `INSERT INTO race (
        slug, organizer, race_definition, title, occurred_at, link, text, points, meta
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(slug) DO UPDATE SET
        organizer = excluded.organizer,
        race_definition = excluded.race_definition,
        title = excluded.title,
        occurred_at = excluded.occurred_at,
        link = excluded.link,
        text = excluded.text,
        points = excluded.points,
        meta = excluded.meta`,
        params: [
          race.slug,
          race.organizer,
          race.race_definition,
          race.title,
          race.occurred_at,
          race.link,
          race.text,
          race.points,
          race.meta ? JSON.stringify(race.meta) : null,
        ],
      })),
    );
  },

  /**
   * Delete race
   */
  async delete(db: Database, slug: string): Promise<void> {
    await db.execute("DELETE FROM race WHERE slug = ?", [slug]);
  },

  /**
   * Count total races
   */
  async count(db: Database): Promise<number> {
    const result = await db.execute("SELECT COUNT(*) as count FROM race");
    return (result.rows[0] as { count: number }).count;
  },

  /**
   * Get total points by organizer
   */
  async getTotalPointsByOrganizer(
    db: Database,
    username: string,
  ): Promise<number> {
    const result = await db.execute(
      `SELECT COALESCE(SUM(COALESCE(a.points, ad.points, 0)), 0) as total 
       FROM race a
       LEFT JOIN race_definition ad ON a.race_definition = ad.slug
       WHERE a.organizer = ?`,
      [username],
    );
    return (result.rows[0] as { total: number }).total;
  },

  /**
   * Get leaderboard (organizers ranked by points)
   */
  async getLeaderboard(
    db: Database,
    limit?: number,
    startDate?: string,
    endDate?: string,
  ): Promise<
    Array<{ organizer: string; total_points: number; race_count: number }>
  > {
    let sql = `
      SELECT 
        a.organizer,
        COALESCE(SUM(COALESCE(a.points, ad.points, 0)), 0) as total_points,
        COUNT(*) as race_count
      FROM race a
      LEFT JOIN race_definition ad ON a.race_definition = ad.slug
    `;
    const params: unknown[] = [];

    if (startDate && endDate) {
      sql += " WHERE a.occurred_at >= ? AND a.occurred_at <= ?";
      params.push(startDate, endDate);
    }

    sql += " GROUP BY a.organizer ORDER BY total_points DESC";

    if (limit !== undefined) {
      sql += " LIMIT ?";
      params.push(limit);
    }

    const result = await db.execute(sql, params);
    return result.rows as unknown as Array<{
      organizer: string;
      total_points: number;
      race_count: number;
    }>;
  },

  /**
   * Get leaderboard with organizer details (optimized with JOIN)
   */
  async getLeaderboardEnriched(
    db: Database,
    limit?: number,
    startDate?: string,
    endDate?: string,
  ): Promise<
    Array<{
      username: string;
      name: string | null;
      avatar_url: string | null;
      total_points: number;
      race_count: number;
    }>
  > {
    let sql = `
      SELECT 
        a.organizer as username,
        c.name,
        c.avatar_url,
        COALESCE(SUM(COALESCE(a.points, ad.points, 0)), 0) as total_points,
        COUNT(*) as race_count
      FROM race a
      LEFT JOIN organizer c ON a.organizer = c.username
      LEFT JOIN race_definition ad ON a.race_definition = ad.slug
    `;
    const params: unknown[] = [];

    if (startDate && endDate) {
      sql += " WHERE a.occurred_at >= ? AND a.occurred_at <= ?";
      params.push(startDate, endDate);
    }

    sql += " GROUP BY a.organizer ORDER BY total_points DESC";

    if (limit !== undefined) {
      sql += " LIMIT ?";
      params.push(limit);
    }

    const result = await db.execute(sql, params);
    return result.rows as unknown as Array<{
      username: string;
      name: string | null;
      avatar_url: string | null;
      total_points: number;
      race_count: number;
    }>;
  },

  /**
   * Get recent races with enriched organizer and definition details
   * Optimized with JOINs to avoid separate queries
   */
  async getRecentRacesEnriched(
    db: Database,
    startDate: string,
    endDate: string,
  ): Promise<
    Array<{
      slug: string;
      organizer: string;
      organizer_name: string | null;
      organizer_avatar_url: string | null;
      race_definition: string;
      race_name: string;
      race_description: string | null;
      title: string | null;
      occurred_at: string;
      link: string | null;
      text: string | null;
      points: number | null;
    }>
  > {
    const sql = `
      SELECT 
        a.slug,
        a.organizer,
        c.name as organizer_name,
        c.avatar_url as organizer_avatar_url,
        a.race_definition,
        ad.name as race_name,
        ad.description as race_description,
        a.title,
        a.occurred_at,
        a.link,
        a.text,
        COALESCE(a.points, ad.points, 0) as points
      FROM race a
      JOIN race_definition ad ON a.race_definition = ad.slug
      LEFT JOIN organizer c ON a.organizer = c.username
      WHERE a.occurred_at >= ? AND a.occurred_at <= ?
      ORDER BY a.race_definition, a.occurred_at DESC
    `;

    const result = await db.execute(sql, [startDate, endDate]);
    return result.rows as unknown as Array<{
      slug: string;
      organizer: string;
      organizer_name: string | null;
      organizer_avatar_url: string | null;
      race_definition: string;
      race_name: string;
      race_description: string | null;
      title: string | null;
      occurred_at: string;
      link: string | null;
      text: string | null;
      points: number | null;
    }>;
  },

  /**
   * Get top organizers by specific race type
   * Optimized with JOIN and GROUP BY
   */
  async getTopByRaceEnriched(
    db: Database,
    raceSlug: string,
    startDate?: string,
    endDate?: string,
    limit: number = 10,
  ): Promise<
    Array<{
      username: string;
      name: string | null;
      avatar_url: string | null;
      points: number;
      count: number;
    }>
  > {
    let sql = `
      SELECT 
        a.organizer as username,
        c.name,
        c.avatar_url,
        COALESCE(SUM(COALESCE(a.points, ad.points, 0)), 0) as points,
        COUNT(*) as count
      FROM race a
      LEFT JOIN organizer c ON a.organizer = c.username
      LEFT JOIN race_definition ad ON a.race_definition = ad.slug
      WHERE a.race_definition = ?
    `;
    const params: unknown[] = [raceSlug];

    if (startDate && endDate) {
      sql += " AND a.occurred_at >= ? AND a.occurred_at <= ?";
      params.push(startDate, endDate);
    }

    sql += `
      GROUP BY a.organizer
      ORDER BY points DESC
      LIMIT ?
    `;
    params.push(limit);

    const result = await db.execute(sql, params);
    return result.rows as unknown as Array<{
      username: string;
      name: string | null;
      avatar_url: string | null;
      points: number;
      count: number;
    }>;
  },

  /**
   * Get race count grouped by date for a organizer
   * Optimized with SQL GROUP BY
   */
  async getRaceCountByDate(
    db: Database,
    username: string,
  ): Promise<Array<{ date: string; count: number }>> {
    const sql = `
      SELECT 
        DATE(occurred_at) as date,
        COUNT(*) as count
      FROM race
      WHERE organizer = ?
      GROUP BY DATE(occurred_at)
      ORDER BY date
    `;

    const result = await db.execute(sql, [username]);
    return result.rows as unknown as Array<{ date: string; count: number }>;
  },
};

/**
 * Global aggregate queries
 */
export const globalAggregateQueries = {
  /**
   * Get all global aggregates
   */
  async getAll(db: Database): Promise<GlobalAggregate[]> {
    const result = await db.execute(
      "SELECT * FROM global_aggregate ORDER BY slug",
    );
    return result.rows.map((row: any) => ({
      ...row,
      value: JSON.parse(row.value as string),
      meta: row.meta ? JSON.parse(row.meta as string) : null,
    })) as GlobalAggregate[];
  },

  /**
   * Get global aggregate by slug
   */
  async getBySlug(db: Database, slug: string): Promise<GlobalAggregate | null> {
    const result = await db.execute(
      "SELECT * FROM global_aggregate WHERE slug = ?",
      [slug],
    );
    if (result.rows.length === 0) return null;
    const row: any = result.rows[0];
    return {
      ...row,
      value: JSON.parse(row.value as string),
      meta: row.meta ? JSON.parse(row.meta as string) : null,
    } as GlobalAggregate;
  },

  /**
   * Insert or update global aggregate
   */
  async upsert(db: Database, aggregate: GlobalAggregate): Promise<void> {
    await db.execute(
      `INSERT INTO global_aggregate (slug, name, description, value, hidden, meta)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(slug) DO UPDATE SET
         name = excluded.name,
         description = excluded.description,
         value = excluded.value,
         hidden = excluded.hidden,
         meta = excluded.meta`,
      [
        aggregate.slug,
        aggregate.name,
        aggregate.description,
        JSON.stringify(aggregate.value),
        aggregate.hidden ?? false,
        aggregate.meta ? JSON.stringify(aggregate.meta) : null,
      ],
    );
  },

  /**
   * Get all visible global aggregates (not hidden)
   */
  async getAllVisible(db: Database): Promise<GlobalAggregate[]> {
    const result = await db.execute(
      "SELECT * FROM global_aggregate WHERE hidden = FALSE OR hidden IS NULL ORDER BY slug",
    );
    return result.rows.map((row: any) => ({
      ...row,
      value: JSON.parse(row.value as string),
      meta: row.meta ? JSON.parse(row.meta as string) : null,
    })) as GlobalAggregate[];
  },

  /**
   * Delete global aggregate
   */
  async delete(db: Database, slug: string): Promise<void> {
    await db.execute("DELETE FROM global_aggregate WHERE slug = ?", [slug]);
  },

  /**
   * Get global aggregates by slugs with visibility filtering
   * Optimized with WHERE IN clause
   */
  async getBySlugs(
    db: Database,
    slugs: string[],
  ): Promise<
    Array<Pick<GlobalAggregate, "slug" | "name" | "value" | "description">>
  > {
    if (slugs.length === 0) {
      return [];
    }

    const placeholders = slugs.map(() => "?").join(",");
    const sql = `
      SELECT slug, name, value, description
      FROM global_aggregate
      WHERE slug IN (${placeholders}) 
        AND (hidden = FALSE OR hidden IS NULL)
      ORDER BY slug
    `;

    const result = await db.execute(sql, slugs);
    return result.rows.map((row: any) => ({
      slug: row.slug,
      name: row.name,
      value: JSON.parse(row.value as string),
      description: row.description || null,
    }));
  },
};

/**
 * Organizer aggregate definition queries
 */
export const organizerAggregateDefinitionQueries = {
  /**
   * Get all organizer aggregate definitions
   */
  async getAll(db: Database): Promise<OrganizerAggregateDefinition[]> {
    const result = await db.execute(
      "SELECT * FROM organizer_aggregate_definition ORDER BY slug",
    );
    return result.rows as unknown as OrganizerAggregateDefinition[];
  },

  /**
   * Get organizer aggregate definition by slug
   */
  async getBySlug(
    db: Database,
    slug: string,
  ): Promise<OrganizerAggregateDefinition | null> {
    const result = await db.execute(
      "SELECT * FROM organizer_aggregate_definition WHERE slug = ?",
      [slug],
    );
    return (result.rows[0] as unknown as OrganizerAggregateDefinition) || null;
  },

  /**
   * Insert or ignore organizer aggregate definition
   */
  async insertOrIgnore(
    db: Database,
    definition: OrganizerAggregateDefinition,
  ): Promise<void> {
    await db.execute(
      `INSERT OR IGNORE INTO organizer_aggregate_definition (slug, name, description, hidden)
       VALUES (?, ?, ?, ?)`,
      [
        definition.slug,
        definition.name,
        definition.description,
        definition.hidden ?? false,
      ],
    );
  },

  /**
   * Insert or update organizer aggregate definition
   */
  async upsert(
    db: Database,
    definition: OrganizerAggregateDefinition,
  ): Promise<void> {
    await db.execute(
      `INSERT INTO organizer_aggregate_definition (slug, name, description, hidden)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(slug) DO UPDATE SET
         name = excluded.name,
         description = excluded.description,
         hidden = excluded.hidden`,
      [
        definition.slug,
        definition.name,
        definition.description,
        definition.hidden ?? false,
      ],
    );
  },

  /**
   * Get all visible organizer aggregate definitions (not hidden)
   */
  async getAllVisible(db: Database): Promise<OrganizerAggregateDefinition[]> {
    const result = await db.execute(
      "SELECT * FROM organizer_aggregate_definition WHERE hidden = FALSE OR hidden IS NULL ORDER BY slug",
    );
    return result.rows as unknown as OrganizerAggregateDefinition[];
  },
};

/**
 * Organizer aggregate queries
 */
export const organizerAggregateQueries = {
  /**
   * Get all organizer aggregates
   */
  async getAll(db: Database): Promise<OrganizerAggregate[]> {
    const result = await db.execute(
      "SELECT * FROM organizer_aggregate ORDER BY organizer, aggregate",
    );
    return result.rows.map((row: any) => ({
      ...row,
      value: JSON.parse(row.value as string),
      meta: row.meta ? JSON.parse(row.meta as string) : null,
    })) as OrganizerAggregate[];
  },

  /**
   * Get aggregates for a specific organizer
   */
  async getByOrganizer(
    db: Database,
    username: string,
  ): Promise<OrganizerAggregate[]> {
    const result = await db.execute(
      "SELECT * FROM organizer_aggregate WHERE organizer = ? ORDER BY aggregate",
      [username],
    );
    return result.rows.map((row: any) => ({
      ...row,
      value: JSON.parse(row.value as string),
      meta: row.meta ? JSON.parse(row.meta as string) : null,
    })) as OrganizerAggregate[];
  },

  /**
   * Get a specific aggregate for a organizer
   */
  async getByOrganizerAndAggregate(
    db: Database,
    username: string,
    aggregateSlug: string,
  ): Promise<OrganizerAggregate | null> {
    const result = await db.execute(
      "SELECT * FROM organizer_aggregate WHERE organizer = ? AND aggregate = ?",
      [username, aggregateSlug],
    );
    if (result.rows.length === 0) return null;
    const row: any = result.rows[0];
    return {
      ...row,
      value: JSON.parse(row.value as string),
      meta: row.meta ? JSON.parse(row.meta as string) : null,
    } as OrganizerAggregate;
  },

  /**
   * Insert or update organizer aggregate
   */
  async upsert(db: Database, aggregate: OrganizerAggregate): Promise<void> {
    await db.execute(
      `INSERT INTO organizer_aggregate (aggregate, organizer, value, meta)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(aggregate, organizer) DO UPDATE SET
         value = excluded.value,
         meta = excluded.meta`,
      [
        aggregate.aggregate,
        aggregate.organizer,
        JSON.stringify(aggregate.value),
        aggregate.meta ? JSON.stringify(aggregate.meta) : null,
      ],
    );
  },

  /**
   * Delete organizer aggregate
   */
  async delete(
    db: Database,
    username: string,
    aggregateSlug: string,
  ): Promise<void> {
    await db.execute(
      "DELETE FROM organizer_aggregate WHERE organizer = ? AND aggregate = ?",
      [username, aggregateSlug],
    );
  },

  /**
   * Delete all aggregates for a organizer
   */
  async deleteByOrganizer(db: Database, username: string): Promise<void> {
    await db.execute("DELETE FROM organizer_aggregate WHERE organizer = ?", [
      username,
    ]);
  },

  /**
   * Get organizers where aggregate value meets threshold
   * Optimized for threshold-based badge rules
   */
  async getOrganizersAboveThreshold(
    db: Database,
    aggregateSlug: string,
    minValue: number,
  ): Promise<Array<{ organizer: string; value: number }>> {
    const result = await db.execute(
      `SELECT organizer, value
       FROM organizer_aggregate
       WHERE aggregate = ? 
         AND json_extract(value, '$.value') >= ?
         AND json_extract(value, '$.type') = 'number'
       ORDER BY json_extract(value, '$.value') DESC`,
      [aggregateSlug, minValue],
    );

    return result.rows.map((row: any) => ({
      organizer: row.organizer as string,
      value: JSON.parse(row.value as string).value as number,
    }));
  },

  /**
   * Get organizers with specific aggregate (for composite rules)
   */
  async getOrganizersWithAggregate(
    db: Database,
    aggregateSlug: string,
  ): Promise<Array<{ organizer: string; value: AggregateValue }>> {
    const result = await db.execute(
      `SELECT organizer, value
       FROM organizer_aggregate
       WHERE aggregate = ?`,
      [aggregateSlug],
    );

    return result.rows.map((row: any) => ({
      organizer: row.organizer as string,
      value: JSON.parse(row.value as string) as AggregateValue,
    }));
  },

  /**
   * Get organizer aggregates enriched with definition details
   * Optimized with JOIN and filtering
   */
  async getByOrganizerEnriched(
    db: Database,
    username: string,
    slugs: string[],
  ): Promise<
    Array<{
      aggregate: string;
      name: string;
      value: AggregateValue;
      description: string | null;
    }>
  > {
    if (slugs.length === 0) {
      return [];
    }

    const placeholders = slugs.map(() => "?").join(",");
    const sql = `
      SELECT 
        ca.aggregate,
        cad.name,
        ca.value,
        cad.description
      FROM organizer_aggregate ca
      JOIN organizer_aggregate_definition cad ON ca.aggregate = cad.slug
      WHERE ca.organizer = ?
        AND ca.aggregate IN (${placeholders})
        AND (cad.hidden = FALSE OR cad.hidden IS NULL)
      ORDER BY ca.aggregate
    `;

    const result = await db.execute(sql, [username, ...slugs]);
    return result.rows.map((row: any) => ({
      aggregate: row.aggregate,
      name: row.name,
      value: JSON.parse(row.value as string),
      description: row.description || null,
    }));
  },
};

/**
 * Badge definition queries
 */
export const badgeDefinitionQueries = {
  /**
   * Get all badge definitions
   */
  async getAll(db: Database): Promise<BadgeDefinition[]> {
    const result = await db.execute(
      "SELECT * FROM badge_definition ORDER BY slug",
    );
    return result.rows.map((row: any) => ({
      ...row,
      variants: JSON.parse(row.variants as string),
    })) as BadgeDefinition[];
  },

  /**
   * Get badge definition by slug
   */
  async getBySlug(db: Database, slug: string): Promise<BadgeDefinition | null> {
    const result = await db.execute(
      "SELECT * FROM badge_definition WHERE slug = ?",
      [slug],
    );
    if (result.rows.length === 0) return null;
    const row: any = result.rows[0];
    return {
      ...row,
      variants: JSON.parse(row.variants as string),
    } as BadgeDefinition;
  },

  /**
   * Insert or ignore badge definition
   */
  async insertOrIgnore(db: Database, badge: BadgeDefinition): Promise<void> {
    await db.execute(
      `INSERT OR IGNORE INTO badge_definition (slug, name, description, variants)
       VALUES (?, ?, ?, ?)`,
      [
        badge.slug,
        badge.name,
        badge.description,
        JSON.stringify(badge.variants),
      ],
    );
  },

  /**
   * Insert or update badge definition
   */
  async upsert(db: Database, badge: BadgeDefinition): Promise<void> {
    await db.execute(
      `INSERT INTO badge_definition (slug, name, description, variants)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(slug) DO UPDATE SET
         name = excluded.name,
         description = excluded.description,
         variants = excluded.variants`,
      [
        badge.slug,
        badge.name,
        badge.description,
        JSON.stringify(badge.variants),
      ],
    );
  },
};

/**
 * Organizer badge queries
 */
export const organizerBadgeQueries = {
  /**
   * Get all organizer badges
   */
  async getAll(db: Database): Promise<OrganizerBadge[]> {
    const result = await db.execute(
      "SELECT * FROM organizer_badge ORDER BY achieved_on DESC",
    );
    return result.rows.map((row: any) => ({
      ...row,
      meta: row.meta ? JSON.parse(row.meta as string) : null,
    })) as OrganizerBadge[];
  },

  /**
   * Get badges for a specific organizer
   */
  async getByOrganizer(
    db: Database,
    username: string,
  ): Promise<OrganizerBadge[]> {
    const result = await db.execute(
      "SELECT * FROM organizer_badge WHERE organizer = ? ORDER BY achieved_on DESC",
      [username],
    );
    return result.rows.map((row: any) => ({
      ...row,
      meta: row.meta ? JSON.parse(row.meta as string) : null,
    })) as OrganizerBadge[];
  },

  /**
   * Get a specific badge for a organizer
   */
  async getByOrganizerAndBadge(
    db: Database,
    username: string,
    badgeSlug: string,
    variant?: string,
  ): Promise<OrganizerBadge | null> {
    const query = variant
      ? "SELECT * FROM organizer_badge WHERE organizer = ? AND badge = ? AND variant = ?"
      : "SELECT * FROM organizer_badge WHERE organizer = ? AND badge = ?";
    const params = variant
      ? [username, badgeSlug, variant]
      : [username, badgeSlug];
    const result = await db.execute(query, params);
    if (result.rows.length === 0) return null;
    const row: any = result.rows[0];
    return {
      ...row,
      meta: row.meta ? JSON.parse(row.meta as string) : null,
    } as OrganizerBadge;
  },

  /**
   * Check if a organizer has a specific badge variant
   */
  async exists(
    db: Database,
    username: string,
    badgeSlug: string,
    variant: string,
  ): Promise<boolean> {
    const result = await db.execute(
      "SELECT COUNT(*) as count FROM organizer_badge WHERE organizer = ? AND badge = ? AND variant = ?",
      [username, badgeSlug, variant],
    );
    return (result.rows[0] as { count: number }).count > 0;
  },

  /**
   * Award a badge to a organizer
   */
  async award(db: Database, badge: OrganizerBadge): Promise<void> {
    await db.execute(
      `INSERT OR IGNORE INTO organizer_badge (slug, badge, organizer, variant, achieved_on, meta)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        badge.slug,
        badge.badge,
        badge.organizer,
        badge.variant,
        badge.achieved_on,
        badge.meta ? JSON.stringify(badge.meta) : null,
      ],
    );
  },

  /**
   * Upgrade a badge variant for a organizer
   */
  async upgrade(
    db: Database,
    slug: string,
    newVariant: string,
    meta?: Record<string, unknown>,
    achievedOn?: string,
  ): Promise<void> {
    await db.execute(
      `UPDATE organizer_badge 
       SET variant = ?, achieved_on = ?, meta = ?
       WHERE slug = ?`,
      [
        newVariant,
        achievedOn ?? new Date().toISOString().split("T")[0],
        meta ? JSON.stringify(meta) : null,
        slug,
      ],
    );
  },

  /**
   * Delete a organizer badge
   */
  async delete(db: Database, slug: string): Promise<void> {
    await db.execute("DELETE FROM organizer_badge WHERE slug = ?", [slug]);
  },

  /**
   * Delete all badges for a organizer
   */
  async deleteByOrganizer(db: Database, username: string): Promise<void> {
    await db.execute("DELETE FROM organizer_badge WHERE organizer = ?", [
      username,
    ]);
  },

  /**
   * Get recent badge achievements with enriched details
   * Optimized with JOINs to avoid N+1 queries
   */
  async getRecentEnriched(
    db: Database,
    limit: number = 20,
  ): Promise<
    Array<{
      slug: string;
      badge: string;
      organizer: string;
      variant: string;
      achieved_on: string;
      meta: Record<string, unknown> | null;
      organizer_name: string | null;
      organizer_avatar_url: string | null;
      badge_name: string;
      badge_description: string;
      badge_variants: Record<string, { description: string; svg_url: string }>;
    }>
  > {
    const sql = `
      SELECT 
        cb.slug,
        cb.badge,
        cb.organizer,
        cb.variant,
        cb.achieved_on,
        cb.meta,
        c.name as organizer_name,
        c.avatar_url as organizer_avatar_url,
        bd.name as badge_name,
        bd.description as badge_description,
        bd.variants as badge_variants
      FROM organizer_badge cb
      JOIN organizer c ON cb.organizer = c.username
      JOIN badge_definition bd ON cb.badge = bd.slug
      ORDER BY cb.achieved_on DESC
      LIMIT ?
    `;

    const result = await db.execute(sql, [limit]);
    return result.rows.map((row: any) => ({
      slug: row.slug,
      badge: row.badge,
      organizer: row.organizer,
      variant: row.variant,
      achieved_on: row.achieved_on,
      meta: row.meta ? JSON.parse(row.meta as string) : null,
      organizer_name: row.organizer_name,
      organizer_avatar_url: row.organizer_avatar_url,
      badge_name: row.badge_name,
      badge_description: row.badge_description,
      badge_variants: JSON.parse(row.badge_variants as string),
    }));
  },

  /**
   * Get top badge earners with enriched organizer details
   * Optimized with GROUP BY and JOIN
   */
  async getTopEarnersEnriched(
    db: Database,
    limit: number = 10,
  ): Promise<
    Array<{
      username: string;
      name: string | null;
      avatar_url: string | null;
      badge_count: number;
    }>
  > {
    const sql = `
      SELECT 
        c.username,
        c.name,
        c.avatar_url,
        COUNT(cb.slug) as badge_count
      FROM organizer c
      JOIN organizer_badge cb ON c.username = cb.organizer
      GROUP BY c.username
      ORDER BY badge_count DESC
      LIMIT ?
    `;

    const result = await db.execute(sql, [limit]);
    return result.rows as unknown as Array<{
      username: string;
      name: string | null;
      avatar_url: string | null;
      badge_count: number;
    }>;
  },

  /**
   * Get award counts grouped by badge definition slug
   * Returns how many organizers earned each badge (and each variant)
   */
  async getAwardCountsByBadge(db: Database): Promise<
    Array<{
      badge: string;
      variant: string;
      award_count: number;
    }>
  > {
    const sql = `
      SELECT 
        cb.badge,
        cb.variant,
        COUNT(*) as award_count
      FROM organizer_badge cb
      JOIN organizer c ON cb.organizer = c.username
      GROUP BY cb.badge, cb.variant
      ORDER BY cb.badge, award_count DESC
    `;

    const result = await db.execute(sql);
    return result.rows as unknown as Array<{
      badge: string;
      variant: string;
      award_count: number;
    }>;
  },

  /**
   * Get overall badge statistics
   */
  async getTotalStats(db: Database): Promise<{
    total_awarded: number;
    unique_earners: number;
  }> {
    const sql = `
      SELECT 
        COUNT(cb.slug) as total_awarded,
        COUNT(DISTINCT cb.organizer) as unique_earners
      FROM organizer_badge cb
      JOIN organizer c ON cb.organizer = c.username
    `;

    const result = await db.execute(sql);
    const row = result.rows[0] as any;
    return {
      total_awarded: row?.total_awarded ?? 0,
      unique_earners: row?.unique_earners ?? 0,
    };
  },
};
