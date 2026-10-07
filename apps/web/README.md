# @starter/web

Next.js static site for the starter. Data is read from the LibSQL database at build
time and exported as a fully static site.

## Development

Run from the repository root:

```bash
pnpm dev
```

This runs the `predev` setup scripts (icons, theme, db, assets, avatars) before
starting Next.js.

## Build

```bash
pnpm --filter @starter/web build
```

Output is written to `apps/web/out/`.

See the [root README](../../README.md) for full setup instructions.
