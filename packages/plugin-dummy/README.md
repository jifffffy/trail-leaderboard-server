# @starter/plugin-dummy

Dummy data generator plugin for local development. This plugin generates example
organizers and races using Faker.js, making it easy to develop and test the
site without needing real data.

## Features

- 🎭 **Example Organizers**: Generates organizers with usernames, bios, and avatars
- 📊 **Example Races**: Simulates entries, reviews, comments, and milestones
- ⚙️ **Highly Configurable**: Control number of organizers, race frequency, and time periods
- 🎲 **Reproducible**: Use seed values for consistent data generation
- 📈 **Varied Race Levels**: Some organizers are very active, others occasional

## Race Types

The plugin generates the following race types:

| Race                | Points | Description               |
| ------------------- | ------ | ------------------------- |
| `entry_created`     | 5      | Created a new entry       |
| `entry_updated`     | 2      | Updated an existing entry |
| `entry_reviewed`    | 3      | Reviewed an entry         |
| `entry_published`   | 20     | Published an entry        |
| `comment_added`     | 1      | Added a comment           |
| `milestone_reached` | 12     | Reached a milestone       |
| `reference_added`   | 4      | Added a reference         |
| `attachment_added`  | 3      | Attached a file           |

## Configuration

```yaml
leaderboard:
  plugins:
    dummy:
      source: "@starter/plugin-dummy"
      config:
        organizers:
          count: 50 # Number of organizers
          minRacesPerOrganizer: 5 # Minimum races per person
          maxRacesPerOrganizer: 100 # Maximum races per person
        races:
          daysBack: 90 # Generate races for last N days
          seed: 12345 # Optional: for reproducible data
        sources:
          - "source-a"
          - "source-b"
```

## Usage

### With Setup Script

The easiest way to use this plugin is with the development setup script:

```bash
pnpm setup:dev
```

### Manual Configuration

1. Add the plugin to your `config.yaml`:

```yaml
leaderboard:
  plugins:
    dummy:
      source: "@starter/plugin-dummy"
      config:
        organizers:
          count: 30
        races:
          daysBack: 60
```

2. Run the plugin runner:

```bash
pnpm build:data
```

## Development

```bash
# Build the plugin
pnpm build

# Run tests
pnpm test

# Watch mode
pnpm test:watch
```

## Generated Data

### Organizers

- **Username**: Generated (e.g., `john-doe`, `alice123`)
- **Name**: Realistic full names
- **Title**: Realistic job titles
- **Avatar**: Generated via DiceBear API
- **Bio**: Realistic bios
- **Joining Date**: Spread over past 2 years

### Races

- **Titles**: Realistic example titles
- **Links**: Example URLs
- **Timestamps**: Distributed over specified time period with recency bias
- **Meta**: Includes source names and extra fields

## Examples

### Minimal Configuration

```yaml
leaderboard:
  plugins:
    dummy:
      source: "@starter/plugin-dummy"
```

Uses all defaults: 50 organizers, 5-100 races each, last 90 days.

### Reproducible Data

```yaml
leaderboard:
  plugins:
    dummy:
      source: "@starter/plugin-dummy"
      config:
        races:
          seed: 42 # Same seed = same data every time
```

### Small Test Dataset

```yaml
leaderboard:
  plugins:
    dummy:
      source: "@starter/plugin-dummy"
      config:
        organizers:
          count: 10
          minRacesPerOrganizer: 2
          maxRacesPerOrganizer: 20
        races:
          daysBack: 30
```

## License

MIT
