/**
 * Interactive prompts for collecting data repository configuration
 */

import prompts from "prompts";
import type { DataRepoConfig } from "./types";
import {
  validateOptionalDate,
  validateRequired,
  validateUrl,
} from "./validation";

/**
 * Collect complete configuration through interactive prompts
 */
export async function collectConfig(): Promise<DataRepoConfig> {
  console.log("📋 Organization Information\n");

  // Organization information
  const orgInfo = await prompts([
    {
      type: "text",
      name: "orgName",
      message: "Organization name:",
      validate: validateRequired,
    },
    {
      type: "text",
      name: "orgDescription",
      message: "Organization description:",
      validate: validateRequired,
    },
    {
      type: "text",
      name: "orgUrl",
      message: "Organization website URL:",
      validate: validateUrl,
    },
    {
      type: "text",
      name: "orgLogoUrl",
      message: "Organization logo URL:",
      validate: validateUrl,
    },
    {
      type: "text",
      name: "orgStartDate",
      message: "Organization start date (YYYY-MM-DD, optional):",
      validate: validateOptionalDate,
    },
  ]);

  // Check if user cancelled
  if (!orgInfo.orgName) {
    console.error("\nSetup cancelled.");
    process.exit(1);
  }

  console.log("\n🌐 Site Metadata & SEO\n");

  // Meta/SEO information
  const metaInfo = await prompts([
    {
      type: "text",
      name: "metaTitle",
      message: "Site title:",
      initial: `${orgInfo.orgName} Site`,
      validate: validateRequired,
    },
    {
      type: "text",
      name: "metaDescription",
      message: "Site description:",
      initial: `${orgInfo.orgName} activity site`,
      validate: validateRequired,
    },
    {
      type: "text",
      name: "metaImageUrl",
      message: "OG image URL (for social sharing):",
      initial: orgInfo.orgLogoUrl,
      validate: validateUrl,
    },
    {
      type: "text",
      name: "metaSiteUrl",
      message: "Public site URL (where the site will be hosted):",
      validate: validateUrl,
    },
    {
      type: "text",
      name: "metaFaviconUrl",
      message: "Favicon URL:",
      initial: orgInfo.orgLogoUrl,
      validate: validateUrl,
    },
  ]);

  console.log("\n⚙️  Site Configuration\n");

  const leaderboardInfo = await prompts({
    type: "confirm",
    name: "addTheme",
    message: "Use custom theme CSS?",
    initial: false,
  });

  let themeUrl: string | undefined;
  if (leaderboardInfo.addTheme) {
    const themePrompt = await prompts({
      type: "text",
      name: "themeUrl",
      message: "Theme CSS URL:",
      validate: validateUrl,
    });
    themeUrl = themePrompt.themeUrl;
  }

  // Return complete configuration
  return {
    orgName: orgInfo.orgName,
    orgDescription: orgInfo.orgDescription,
    orgUrl: orgInfo.orgUrl,
    orgLogoUrl: orgInfo.orgLogoUrl,
    orgStartDate: orgInfo.orgStartDate || undefined,
    metaTitle: metaInfo.metaTitle,
    metaDescription: metaInfo.metaDescription,
    metaImageUrl: metaInfo.metaImageUrl,
    metaSiteUrl: metaInfo.metaSiteUrl,
    metaFaviconUrl: metaInfo.metaFaviconUrl,
    themeUrl,
  };
}
