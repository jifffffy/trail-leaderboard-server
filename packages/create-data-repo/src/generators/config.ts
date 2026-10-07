/**
 * Generate config.yaml from collected configuration
 */

import yaml from "js-yaml";
import type { DataRepoConfig } from "../types";

/**
 * Generate config.yaml content
 */
export function generateConfigYaml(config: DataRepoConfig): string {
  const yamlConfig: any = {
    org: {
      name: config.orgName,
      description: config.orgDescription,
      url: config.orgUrl,
      logo_url: config.orgLogoUrl,
    },
    meta: {
      title: config.metaTitle,
      description: config.metaDescription,
      image_url: config.metaImageUrl,
      site_url: config.metaSiteUrl,
      favicon_url: config.metaFaviconUrl,
    },
    leaderboard: {},
  };

  // Add optional org fields
  if (config.orgStartDate) {
    yamlConfig.org.start_date = config.orgStartDate;
  }

  // Add optional theme
  if (config.themeUrl) {
    yamlConfig.leaderboard.theme = config.themeUrl;
  }

  // Generate YAML string
  let yamlString = yaml.dump(yamlConfig, {
    indent: 2,
    lineWidth: -1,
    noRefs: true,
    sortKeys: false,
  });

  // Add commented-out plugin examples
  yamlString += "\n  # Plugin configurations (uncomment and configure):\n";
  yamlString += "  # plugins:\n";
  yamlString += "  #   my-source:\n";
  yamlString += "  #     source: https://example.com/plugins/my-source.js\n";
  yamlString += "  #     config:\n";
  yamlString += "  #       apiToken: ${{ env.MY_API_TOKEN }}\n";
  yamlString += "  #\n";
  yamlString += "  # Optional: Specify aggregates to display\n";
  yamlString += "  # aggregates:\n";
  yamlString += "  #   global:\n";
  yamlString += "  #     - total_races\n";
  yamlString += "  #     - count_organizers\n";
  yamlString += "  #   organizer:\n";
  yamlString += "  #     - total_race_points\n";
  yamlString += "  #     - race_count\n";
  yamlString += "  #\n";
  yamlString += "  # Optional: Define badges and evaluation rules\n";
  yamlString += "  # badges:\n";
  yamlString += "  #   definitions:\n";
  yamlString += "  #     - slug: race_milestone\n";
  yamlString += "  #       name: Race Milestone\n";
  yamlString +=
    '  #       description: "Awarded for reaching race count milestones"\n';
  yamlString += "  #       variants:\n";
  yamlString += "  #         bronze:\n";
  yamlString += '  #           description: "10+ races"\n';
  yamlString += '  #           svg_url: "https://example.com/bronze.svg"\n';
  yamlString += "  #         silver:\n";
  yamlString += '  #           description: "50+ races"\n';
  yamlString += '  #           svg_url: "https://example.com/silver.svg"\n';
  yamlString += "  #   rules:\n";
  yamlString += "  #     - type: threshold\n";
  yamlString += "  #       badge_slug: race_milestone\n";
  yamlString += "  #       enabled: true\n";
  yamlString += "  #       aggregate_slug: race_count\n";
  yamlString += "  #       thresholds:\n";
  yamlString += "  #         - variant: bronze\n";
  yamlString += "  #           value: 10\n";
  yamlString += "  #         - variant: silver\n";
  yamlString += "  #           value: 50\n";

  return yamlString;
}
