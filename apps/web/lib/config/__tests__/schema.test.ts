/**
 * Config schema validation tests
 */

import { describe, expect, it } from "vitest";
import { ConfigSchema, LeaderboardConfigSchema } from "../schema";

const baseConfig = {
  org: {
    name: "Test Org",
    description: "A test organization",
    url: "https://example.com",
    logo_url: "https://example.com/logo.png",
  },
  meta: {
    title: "Test Site",
    description: "Test site description",
    image_url: "https://example.com/image.png",
    site_url: "https://example.com",
    favicon_url: "https://example.com/favicon.ico",
  },
  leaderboard: {},
};

describe("ConfigSchema", () => {
  it("should validate a valid config", () => {
    const result = ConfigSchema.safeParse(baseConfig);
    expect(result.success).toBe(true);
  });

  it("should reject invalid URLs", () => {
    const invalidConfig = {
      ...baseConfig,
      org: {
        ...baseConfig.org,
        url: "not-a-url",
      },
    };

    const result = ConfigSchema.safeParse(invalidConfig);
    expect(result.success).toBe(false);
  });

  it("should allow optional fields", () => {
    const configWithOptionals = {
      ...baseConfig,
      org: {
        ...baseConfig.org,
        start_date: "2020-01-01",
      },
      leaderboard: {
        theme: "dark",
        plugins: {
          test: {
            source: "https://example.com/plugin.js",
            config: {
              apiKey: "test",
            },
          },
        },
      },
    };

    const result = ConfigSchema.safeParse(configWithOptionals);
    expect(result.success).toBe(true);
  });
});

describe("LeaderboardConfigSchema", () => {
  it("should validate plugins configuration", () => {
    const config = {
      plugins: {
        example: {
          name: "Example Plugin",
          source: "https://example.com/manifest.js",
          config: {
            token: "test",
          },
        },
      },
    };

    const result = LeaderboardConfigSchema.safeParse(config);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.plugins?.example.source).toBe(
        "https://example.com/manifest.js",
      );
    }
  });

  it("should allow file:// URLs for plugin sources", () => {
    const config = {
      plugins: {
        local: {
          source: "file://./plugins/local.js",
        },
      },
    };

    const result = LeaderboardConfigSchema.safeParse(config);
    expect(result.success).toBe(true);
  });

  it("should validate data explorer configuration", () => {
    const config = {
      data_explorer: {
        enabled: true,
        source: "/data.db",
      },
    };

    const result = LeaderboardConfigSchema.safeParse(config);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.data_explorer?.enabled).toBe(true);
    }
  });
});
