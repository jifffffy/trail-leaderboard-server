/**
 * Configuration types for dummy plugin
 */

export interface DummyPluginConfig {
  organizers?: {
    count?: number;
    minRacesPerOrganizer?: number;
    maxRacesPerOrganizer?: number;
  };
  races?: {
    daysBack?: number;
    seed?: number;
  };
  sources?: string[];
}

export const DEFAULT_CONFIG = {
  organizers: {
    count: 50,
    minRacesPerOrganizer: 5,
    maxRacesPerOrganizer: 100,
  },
  races: {
    daysBack: 90,
    seed: undefined as number | undefined,
  },
  sources: ["source-a", "source-b", "source-c", "source-d"],
};

export function mergeConfig(config?: Partial<DummyPluginConfig>) {
  return {
    organizers: {
      ...DEFAULT_CONFIG.organizers,
      ...config?.organizers,
    },
    races: {
      ...DEFAULT_CONFIG.races,
      ...config?.races,
    },
    sources: config?.sources ?? DEFAULT_CONFIG.sources,
  };
}
