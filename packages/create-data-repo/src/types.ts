/**
 * Data repository configuration interface
 */
export interface DataRepoConfig {
  // Organization
  orgName: string;
  orgDescription: string;
  orgUrl: string;
  orgLogoUrl: string;
  orgStartDate?: string;

  // Meta/SEO
  metaTitle: string;
  metaDescription: string;
  metaImageUrl: string;
  metaSiteUrl: string;
  metaFaviconUrl: string;

  // Optional theme override URL
  themeUrl?: string;
}
