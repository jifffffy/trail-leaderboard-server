/**
 * Read-only, JSON-oriented projections of the database.
 *
 * These power the statically-exported `/api/*.json` route handlers, which let
 * external consumers fetch the race data without rendering any HTML.
 *
 * Domain model: `organizer` = organizer (组办方); `race` = race (赛事);
 * distance categories (组别) live in the race's `meta.categories`.
 */

import { getDatabase } from "@/lib/db/client";

export interface OrganizerJson {
  slug: string;
  name: string | null;
  avatar_url: string | null;
  bio: string | null;
  url: string | null;
  race_count: number;
  points: number;
}

export interface CategoryJson {
  name: string | null;
  distance_km: number | null;
  elevation_gain_m: number | null;
  cutoff_hours: number | null;
  itra_points: number | null;
  level: string | null;
  description: string | null;
}

export interface RaceJson {
  slug: string;
  organizer: { slug: string; name: string | null };
  event: {
    title: string | null;
    slug: string | null;
    date: string | null;
    location: string | null;
    url: string | null;
    cover_url: string | null;
  };
  categories: CategoryJson[];
  points: number;
}

function parseJson(value: unknown): Record<string, unknown> {
  if (typeof value !== "string" || !value) return {};
  try {
    return JSON.parse(value) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function asNumber(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function asNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function asNullableString(value: unknown): string | null {
  return typeof value === "string" && value ? value : null;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function toCategory(raw: unknown): CategoryJson {
  const category = (raw ?? {}) as Record<string, unknown>;
  return {
    name: asNullableString(category.name),
    distance_km: asNullableNumber(category.distance_km),
    elevation_gain_m: asNullableNumber(category.elevation_gain_m),
    cutoff_hours: asNullableNumber(category.cutoff_hours),
    itra_points: asNullableNumber(category.itra_points),
    level: asNullableString(category.level),
    description: asNullableString(category.description),
  };
}

/**
 * Organizers (organizers) with their race counts and total points.
 */
export async function getOrganizersJson(): Promise<OrganizerJson[]> {
  const db = getDatabase();
  const result = await db.execute(`
    SELECT
      c.username,
      c.name,
      c.avatar_url,
      c.bio,
      c.meta,
      COUNT(a.slug) AS race_count,
      COALESCE(SUM(COALESCE(a.points, ad.points, 0)), 0) AS points
    FROM organizer c
    LEFT JOIN race a ON a.organizer = c.username
    LEFT JOIN race_definition ad ON a.race_definition = ad.slug
    GROUP BY c.username
    ORDER BY points DESC, c.username ASC
  `);

  return result.rows.map((row) => {
    const meta = parseJson(row.meta);
    return {
      slug: String(row.username),
      name: asNullableString(row.name),
      avatar_url: asNullableString(row.avatar_url),
      bio: asNullableString(row.bio),
      url: asNullableString(meta.url),
      race_count: asNumber(row.race_count),
      points: asNumber(row.points),
    };
  });
}

/**
 * Races (events) with organizer context and their distance categories.
 */
export async function getRacesJson(): Promise<RaceJson[]> {
  const db = getDatabase();
  const result = await db.execute(`
    SELECT
      a.slug,
      a.title,
      a.occurred_at,
      a.link,
      a.points,
      a.meta,
      c.name AS organizer_name,
      ad.points AS definition_points
    FROM race a
    JOIN organizer c ON a.organizer = c.username
    LEFT JOIN race_definition ad ON a.race_definition = ad.slug
    ORDER BY a.occurred_at DESC, a.slug ASC
  `);

  return result.rows.map((row) => {
    const meta = parseJson(row.meta);
    const rawPoints = row.points ?? row.definition_points;
    return {
      slug: String(row.slug),
      organizer: {
        slug: asNullableString(meta.organizer_slug) ?? "",
        name: asNullableString(row.organizer_name),
      },
      event: {
        title:
          asNullableString(meta.event_title) ?? asNullableString(row.title),
        slug: asNullableString(meta.event_slug),
        date: asNullableString(row.occurred_at)?.slice(0, 10) ?? null,
        location: asNullableString(meta.location),
        url: asNullableString(row.link),
        cover_url: asNullableString(meta.cover_url),
      },
      categories: asArray(meta.categories).map(toCategory),
      points: asNumber(rawPoints),
    };
  });
}
