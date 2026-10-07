### Description

<!-- Provide a clear and concise description of your changes -->

### What

<!-- What changes are you making? -->

### Why

<!-- Why are these changes needed? What problem does this solve? -->

- Resolves #issue-number

### How

<!-- How did you implement these changes? What approach did you take? -->

---

## Type of Change

<!-- Check all that apply by replacing [ ] with [x] -->

- [ ] 🐛 Bug fix (non-breaking change which fixes an issue)
- [ ] ✨ New feature (non-breaking change which adds functionality)
- [ ] 💥 Breaking change
- [ ] ♻️ Refactoring (no functional changes)
- [ ] ⚡ Performance improvement
- [ ] ✅ Test coverage improvement
- [ ] 🔧 Chore/maintenance

---

## Packages Affected

<!-- Check all packages that are modified in this PR -->

- [ ] `@starter/leaderboard-api`
- [ ] `@starter/plugin-runner`
- [ ] `@starter/plugin-dummy`
- [ ] `@starter/mcp-server`
- [ ] `create-starter-plugin`
- [ ] `create-starter-data-repo`
- [ ] `@starter/web` (Next.js app)
- [ ] Root configuration

---

## Quality Checklist

- [ ] **Tests added/updated** and `pnpm test` passes
- [ ] **Build succeeds**: `pnpm build:packages` completes without errors
- [ ] **TypeScript types correct**: no type errors
- [ ] **Linting passes**: `pnpm --filter @starter/web lint` (for web app changes)
- [ ] README updated if there are user-facing changes
- [ ] Plugin follows the API contract in [`packages/api/src/types.ts`](../packages/api/src/types.ts) (if applicable)

---

## Screenshots / Videos

<!-- For UI changes: include before/after screenshots -->
