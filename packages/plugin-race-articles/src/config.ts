/**
 * Configuration for the race-articles plugin.
 *
 * The plugin never fetches anything itself: article files are authored/fetched
 * offline and stored in the data repo. This config only points at that directory
 * and describes how distances map to race definitions.
 */

/**
 * A distance band maps a race category distance to an race_definition row.
 * Bands are evaluated from the highest `minKm` down, so the first band whose
 * `minKm` is <= the category distance wins.
 */
export interface DistanceBand {
  /** race_definition.slug */
  slug: string;
  /** Human-readable name shown in the UI */
  name: string;
  description: string;
  /** lucide-react icon name in kebab-case (see setup-icons.ts) */
  icon: string;
  /** Inclusive lower bound in kilometers */
  minKm: number;
  /** Default points for a category in this band */
  points: number;
}

export interface RaceArticlesConfig {
  /**
   * Directory holding article files (`.md`, `.markdown`, `.txt`), relative to
   * the data dir (`LEADERBOARD_DATA_DIR`) unless absolute.
   */
  articlesDir?: string;
  /** Override the default distance bands (rarely needed). */
  raceDefinitions?: DistanceBand[];
}

export const DEFAULT_RACE_DEFINITIONS: DistanceBand[] = [
  {
    slug: "race_ultra",
    name: "Ultra Trail",
    description: "Trail race category of 50 km or more",
    icon: "mountain-snow",
    minKm: 50,
    points: 30,
  },
  {
    slug: "race_long",
    name: "Long Trail",
    description: "Trail race category between 30 and 49 km",
    icon: "mountain",
    minKm: 30,
    points: 20,
  },
  {
    slug: "race_short",
    name: "Short Trail",
    description: "Trail race category between 15 and 29 km",
    icon: "footprints",
    minKm: 15,
    points: 10,
  },
  {
    slug: "race_fun",
    name: "Fun Run",
    description: "Trail race category under 15 km",
    icon: "smile",
    minKm: 0,
    points: 5,
  },
];

export const DEFAULT_CONFIG = {
  articlesDir: "sources/races",
} as const;

/**
 * Normalize plugin config, applying defaults.
 */
export function mergeConfig(
  config?: RaceArticlesConfig,
): Required<RaceArticlesConfig> {
  return {
    articlesDir: config?.articlesDir ?? DEFAULT_CONFIG.articlesDir,
    raceDefinitions: config?.raceDefinitions ?? DEFAULT_RACE_DEFINITIONS,
  };
}

/**
 * Resolve the distance band for a category distance, evaluating the highest
 * `minKm` first.
 */
export function bandForDistance(
  distanceKm: number,
  bands: DistanceBand[],
): DistanceBand {
  const sorted = [...bands].sort((a, b) => b.minKm - a.minKm);
  return (
    sorted.find((band) => distanceKm >= band.minKm) ??
    sorted[sorted.length - 1]!
  );
}
