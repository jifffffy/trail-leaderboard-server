/**
 * Generate README.md for the data repository
 */

import type { DataRepoConfig } from "../types";

/**
 * Generate README content
 */
export function generateReadme(config: DataRepoConfig): string {
  return `# ${config.orgName} Data

This repository contains the data used to build the ${
    config.orgName
  } static site.

## Repository Structure

\`\`\`
.
├── config.yaml       # Site configuration
├── .leaderboard.db   # SQLite database (auto-generated)
├── organizers/     # Organizer profiles (Markdown files)
└── races/       # Race records (JSONL files)
\`\`\`

## Getting Started

### 1. Configure Plugins

Edit \`config.yaml\` and uncomment the plugin configurations you want to use. Make sure to:
- Set the correct plugin source URLs
- Configure environment variables for API tokens
- Update organization-specific settings

### 2. Run Data Collection

\`\`\`bash
# Using the plugin runner (from the main monorepo)
pnpm --filter @starter/plugin-runner scrape --data-dir .
\`\`\`

### 3. Commit Changes

After collection, organizer profiles and races are exported to files:

\`\`\`bash
git add organizers/ races/
git commit -m "Update data"
git push
\`\`\`

## Organizer Profiles

Organizer profiles are stored as Markdown files with YAML frontmatter in the \`organizers/\` directory:

\`\`\`markdown
---
username: alice
name: Alice Smith
title: Engineer
avatar_url: https://example.com/avatar.jpg
joining_date: 2020-01-01
---

Alice is a long-time organizer...
\`\`\`

### Profile Fields

- \`username\` (required) - Unique identifier
- \`name\` - Display name
- \`title\` - Job title or designation
- \`avatar_url\` - Profile picture URL
- \`joining_date\` (YYYY-MM-DD) - Join date
- \`meta\` - Custom metadata

## Races

Races are stored as JSONL (JSON Lines) files in the \`races/\` directory, one file per organizer:

\`\`\`jsonl
{"slug":"alice-1","organizer":"alice","race_definition":"entry_created","title":"Created an entry","occurred_at":"2024-01-15T10:00:00Z","link":"https://example.com/entries/1","points":10}
\`\`\`

### Race Fields

- \`slug\` (required) - Unique identifier
- \`organizer\` (required) - Username
- \`race_definition\` (required) - Race type slug
- \`title\` - Race title
- \`occurred_at\` (required) - ISO 8601 timestamp
- \`link\` - URL to race
- \`text\` - Additional text/description
- \`points\` - Points awarded
- \`meta\` - Custom metadata

## Configuration

The \`config.yaml\` file contains all site configuration:

- **Organization**: Name, description, logo
- **Meta/SEO**: Site title, description, images for social sharing
- **Plugins**: Configure data source plugins
- **Aggregates**: Specify which metrics to display
- **Badges**: Define achievements and evaluation rules
- **Theme**: Optional custom CSS for branding

## Documentation

For more information about the system, see the main repository README.

## License

MIT
`;
}
