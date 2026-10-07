import { getConfig } from "@/lib/config/get-config";
import { getAllContributorUsernames } from "@/lib/data/loader";
import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const config = getConfig();
  const baseUrl = config.meta.site_url.replace(/\/$/, "");

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${baseUrl}/`, changeFrequency: "daily", priority: 1.0 },
    { url: `${baseUrl}/people/`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${baseUrl}/data/`, changeFrequency: "daily", priority: 0.6 },
  ];

  const usernames = await getAllContributorUsernames();
  const contributorRoutes: MetadataRoute.Sitemap = usernames.map(
    (username) => ({
      url: `${baseUrl}/${username}/`,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    }),
  );

  return [...staticRoutes, ...contributorRoutes];
}
