# Healthy Me Deployment Process

This is the canonical release path for `app.withluna.dev`.

## Goals

- Keep code minimal and efficient.
- Write tests before behavior changes, then verify after implementation.
- Use GitHub branches, conventional commits, PRs, and CI checks.
- Do not deploy live until automated checks pass.
- Split workflow improvements into small, reversible parts.

## Local workflow

Start every change from a clean branch:

```bash
git status --short --branch
git checkout -b feat/short-description
```

For behavior changes:

1. Add or update the focused failing test.
2. Run the focused test and confirm it fails for the expected reason.
3. Implement the smallest safe change.
4. Run the focused test again.
5. Run the project checks.

Common commands:

```bash
npm run typecheck
npm run test:unit
npm run build:web:pages
npm run verify
```

Use `npm run verify:full` only when Playwright is ready for the target environment.

## Web build commands

- `npm run build:web` creates the Expo static export in `dist/`.
- `npm run build:web:pages` creates the Expo export and prepares it for GitHub Pages.

`build:web:pages` must preserve:

- `dist/CNAME` for `app.withluna.dev`
- `dist/.nojekyll` for Expo/Metro assets
- `dist/404.html` for SPA refresh/deep-link fallback

## CI workflow

`.github/workflows/ci.yml` is intentionally non-deploying.

It runs on PRs and selected pushes:

1. `npm ci`
2. `npm run typecheck`
3. `npm run test:unit -- --ci`
4. `npm run build:web:pages`
5. uploads `dist/` as an artifact

A PR should not be merged if CI is red.

## Pull requests

Use small branches and conventional commits:

```text
feat/add-food-calendar
fix/magic-link-redirect
ci/add-pages-deploy
```

Commit examples:

```text
feat: add food calendar weekly view
fix: preserve magic-link redirect origin
ci: add non-deploy verification workflow
```

Before saying code is backed up or synced, verify remote SHA:

```bash
BRANCH=$(git branch --show-current)
LOCAL=$(git rev-parse HEAD)
REMOTE=$(git ls-remote origin "refs/heads/$BRANCH" | awk '{print $1}')
test "$LOCAL" = "$REMOTE" && echo "verified: $BRANCH $LOCAL"
```

## Deployment plan

Deployment automation should be added only after the non-deploying CI workflow is green.

Planned rollout:

1. Canonical scripts, CI checks, PR template, and this doc.
2. Preview/local Playwright smoke tests.
3. Gated GitHub Pages deployment from `main` only.
4. Production smoke tests against `https://app.withluna.dev` after deploy.
5. Authenticated E2E only after secrets are moved out of local vault assumptions and into protected GitHub Secrets.

## Production caution

Do not use the old Netlify path as the primary deploy route unless explicitly re-enabled. The current production surface is `app.withluna.dev` via GitHub Pages.

Do not put Supabase service-role keys in any `EXPO_PUBLIC_*` variable. Expo public variables are embedded in the web bundle.
