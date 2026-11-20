# F00 — Frontend initialization

**Status:** Validated; open for review on `frontend/F00-frontend-setup`
**Baseline branch:** latest approved `develop`
**Scope:** frontend initialization only; no product/business features.

## Objectives and requirements

Set up the React/Vite frontend, package dependencies, responsive project shell, API communication foundation, environment example, lint/build/test scripts, GitHub validation, and F00 documentation. Preserve the previously completed F01 replication work on its existing branch and PR; F00 does not rename or replace it.

## Implementation

- React 19 + Vite 8 with `@vitejs/plugin-react`; local server on port 5173.
- Source layout: `src/App.jsx`, `src/main.jsx`, `src/lib/api.js`, and `src/styles.css`; static assets in `public/`.
- Vite proxies `/api` to the backend at port 4000, configurable with `VITE_API_PROXY_TARGET`.
- API helper restricts requests to the `/api/` namespace, returns JSON, and surfaces server errors.
- Responsive accessible shell includes semantic landmarks, keyboard skip link, focus indicators, and reduced-motion handling.
- ESLint, Vitest, and Vite production build scripts.
- Root `npm run dev` process supervisor starts each initialized app independently; it reports and skips an app whose initialization package is not present. It never starts MongoDB.
- Environment examples contain only local, non-secret values; actual `.env` files are ignored.
- GitHub Actions validate app packages, lint, tests, and production builds; milestone PR automation runs after its branch validation.

## Files added or modified

- Frontend: `package.json`, `index.html`, `vite.config.js`, `eslint.config.js`, `.env.example`, `public/favicon.svg`, `src/App.jsx`, `src/main.jsx`, `src/styles.css`, `src/lib/api.js`, `src/lib/api.test.js`.
- Root: `package.json`, `package-lock.json`, `scripts/dev.mjs`, `README.md`, `.github/workflows/ci.yml`, `.github/workflows/milestone-pr.yml`, `docs/git-workflow.md`, `docs/milestones/README.md`, and `docs/MILESTONE_TRACKER.md`.

## Routes, API, and data

- Frontend route: `/` renders the initialization shell only.
- API foundation: Vite proxy forwards `/api/*` to `http://localhost:4000`.
- No business endpoints or database models are added by F00.
- B00 supplies the backend application and health endpoint on its own branch.

## Security and configuration

- No credentials or secrets are stored in the repository.
- API requests are limited to `/api/` paths; the development proxy target is configurable.
- The root command starts app processes only. It does not install, start, seed, or alter a MongoDB server/database.
- `.env.example` files are safe templates; copy and edit them locally.

## Validation

Validation completed with Node.js 24.13.0 and npm 11.6.2:

- `npm ci`: passed from the committed frontend lockfile.
- `npm audit --audit-level=moderate`: passed; 0 vulnerabilities.
- `npm run lint`: passed.
- `npm test`: 3 API-helper tests passed.
- `npm run build`: passed with Vite 8.3.8.
- Root `npm ci --ignore-scripts`: passed.
- Root `npm run dev` on F00 branch started Vite on port 5173 and skipped the absent backend package.
- Headless Edge 157 browser check: `/` rendered the React shell; direct refresh worked; skip link and favicon loaded; no console errors or failed resources.
- Responsive widths 320, 390, 768, and 1440 px: document width matched viewport width at each size.
- Vite HMR websocket connected and delivered a stylesheet update after a temporary change in a disposable integration copy.
- F00 provides `/` only and adds no React Router or product routes; refresh behavior for `/` passed.
- Full-stack integration with the separate B00 branch returned HTTP 200 for frontend, API, and Vite `/api/health` proxy; MongoDB reported connected.
- `git diff --check`: passed.

MongoDB is not part of F00. B00 provides the independent backend connection configuration and is open for review in [PR #4](https://github.com/Dominionvibee/img-shoot/pull/4).

## Outstanding integration

F00 and B00 have separate passing PR checks and target `develop`. A merge preview identified conflicts in the shared README and milestone tracking files; those files are being aligned before integration. Both branches still require approval before merging. Existing F01 remains a separate review branch and will be synchronized from approved `develop` before further feature work.

## Review references

- Branch: `frontend/F00-frontend-setup`
- Pull request: [#3 targeting `develop`](https://github.com/Dominionvibee/img-shoot/pull/3)
- Implementation commit: `cfe06b1570c48cd2c18a005b76cb95f59d204ba5`.
- Completion: F00 validation passed; open for review. B00 is independently available in PR #4.
