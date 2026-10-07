/**
 * Type definitions for data loader
 */

export interface LeaderboardEntry {
  username: string;
  name: string | null;
  avatar_url: string | null;
  total_points: number;
  race_count: number;
  race_breakdown?: Record<string, { count: number; points: number }>;
  daily_race?: Array<{ date: string; count: number; points: number }>;
}

export interface OrganizerRace {
  slug: string;
  organizer: string;
  race_definition: string;
  race_name: string;
  race_description: string | null;
  race_icon: string | null;
  title: string | null;
  occurred_at: string;
  link: string | null;
  text: string | null;
  points: number | null;
  meta: Record<string, unknown> | null;
}
