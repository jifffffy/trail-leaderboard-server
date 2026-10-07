/**
 * Strict input contract for race article files.
 *
 * Files carry all required data in YAML frontmatter. Nothing is parsed out of
 * the prose body, so the plugin never needs parser changes as new sites appear —
 * the content author is responsible for filling these fields.
 */

import { z } from "zod";

/** The organizer (组办方) that hosts races. Becomes an `organizer` row. */
export const OrganizerSchema = z.object({
  /** Display name, e.g. "耐吉赛事". */
  name: z.string().min(1),
  /** Stable username/slug for this organizer, e.g. "naiji-saishi". */
  slug: z.string().min(1),
  url: z.string().optional(),
  logo_url: z.string().optional(),
  bio: z.string().optional(),
});

/** The event (赛事). */
export const EventSchema = z.object({
  title: z.string().min(1),
  /** Stable slug for this event, e.g. "fuchuan-gumingcheng-2026". */
  slug: z.string().min(1),
  /** Race date, `YYYY-MM-DD`. */
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date must be YYYY-MM-DD"),
  location: z.string().optional(),
  url: z.string().optional(),
  cover_url: z.string().optional(),
});

/** A distance category (组别). Becomes a `race` row. */
export const CategorySchema = z.object({
  name: z.string().min(1),
  /** Distance in kilometers, e.g. 50. */
  distance_km: z.number().positive(),
  elevation_gain_m: z.number().nonnegative().optional(),
  cutoff_hours: z.number().positive().optional(),
  itra_points: z.number().nonnegative().optional(),
  /** Race level label, e.g. "L1", "M1", "S1". */
  level: z.string().optional(),
  description: z.string().optional(),
});

export const RaceArticleSchema = z.object({
  organizer: OrganizerSchema,
  event: EventSchema,
  categories: z.array(CategorySchema).min(1),
});

export type ArticleOrganizer = z.infer<typeof OrganizerSchema>;
export type RaceEvent = z.infer<typeof EventSchema>;
export type Category = z.infer<typeof CategorySchema>;
export type RaceArticle = z.infer<typeof RaceArticleSchema>;
