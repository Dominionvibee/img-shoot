# B00 — Backend Initialization

## Objective and requirements

Create the backend foundation in `shoot-backend/` with Node.js, Express, MongoDB/Mongoose configuration, environment variables, development server, API structure, middleware, a health route, documentation, and validation. Do not add product-specific endpoints or mutate database contents.

## Implementation

- Express 5 API with Helmet security headers, bounded JSON parsing, JSON 404 handling, and a sanitized server error response.
- Mongoose connection helper reads `MONGODB_URI`; startup does not create or launch a database process. A failed/missing database connection does not prevent API liveness.
- Health endpoint reports service liveness and current database connection state.
- ES module layout separates config, controllers, routes, middleware, and models.
- Root development supervisor starts available frontend and backend apps without shell-specific command behavior. Per-app `npm run dev` commands remain available.

## Files

Backend files are contained in `shoot-backend/`; root shared changes are the root runner/package metadata, CI workflows, milestone tracker/index, and project workflow documentation. No frontend implementation files are changed on this branch.

## Routes, API, and database

`GET /api/health` returns `{ "service": "img-shoot-api", "status": "ok", "database": "connected|disconnected" }`. There are no business routes or models. `MONGODB_URI` is the only required database setting; `.env.example` uses `mongodb://127.0.0.1:27017/img_shoot_dev`.

## Security

Helmet sets standard HTTP security headers. JSON request bodies are limited to 100 KB. Errors avoid exposing stack traces. `.env` files and credentials are ignored by Git. No database writes, migrations, seeding, or destructive operations are part of B00.

The backend does not emit cross-origin access headers. Local frontend requests go through Vite's same-origin `/api` proxy, so CORS is not needed for this integration; a request with an unrelated `Origin` received no `Access-Control-Allow-Origin` header. When a production frontend origin is selected, add an explicit allowlist before cross-origin browser use.

## Validation

- `npm ci`: passed (182 packages; 0 reported vulnerabilities).
- `npm audit --audit-level=moderate`: passed; 0 vulnerabilities.
- `npm run lint`: passed.
- `npm test`: passed (2 tests: connected-state health response and unknown-route 404).
- `npm run build`: passed (Node syntax checks).
- Live `npm run dev` on port 4000: `/api/health` returned HTTP 200 and `database: "connected"`; unknown routes returned 404.
- Environment configuration: `node --env-file=.env.example` loaded `PORT=4000` and the local MongoDB URI. No real `.env` file or credential was created.
- MongoDB connectivity: a read-only ping to the existing local instance succeeded; no database records were changed.
- Connection failure: starting against closed local port 1 logged the failure, kept the server alive, and returned HTTP 200 with `database: "disconnected"`.
- Headers/CORS: Helmet's `X-Content-Type-Options: nosniff` was present; no cross-origin allow header was returned for an unrelated origin.
- Full-stack root `npm run dev` in a disposable F00+B00 integration copy passed from PowerShell and Git Bash. Both services listened on ports 5173/4000, the frontend rendered, `/api/health` worked directly and through the Vite proxy, MongoDB connected, and the Vite HMR websocket delivered an update after a temporary stylesheet edit.
- Headless Edge reported no F00 console errors or failed resources at 320, 390, 768, and 1440 px; `/` refreshed successfully.
- Ctrl+C stopped both services; subsequent connection attempts to ports 5173 and 4000 were refused.
- Root `npm ci --ignore-scripts`: passed.

## Outstanding items

No B00-scope blockers remain. The production CORS allowlist depends on the eventual hosted frontend origin. F00/B00 integration into `develop` requires approval; neither branch has been merged.

## Git and review

- Branch: `backend/B00-backend-initialization` (created from approved `origin/develop`).
- Implementation commit: `01d044e2d19089a97edca6a27a2f594076d53815`.
- Documentation commit: recorded immediately after the implementation commit.
- Pull request: [#4](https://github.com/Dominionvibee/img-shoot/pull/4), open and targeting `develop`.
- Status: validation passed; open for review. GitHub Actions checks passed on the pushed branch.
