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

## Validation

- `npm ci`: passed (182 packages; 0 reported vulnerabilities).
- `npm run lint`: passed.
- `npm test`: passed (2 tests: connected-state health response and unknown-route 404).
- `npm run build`: passed (Node syntax checks).
- Direct server smoke on port 4400: `/api/health` returned HTTP 200 and `database: "connected"`.
- MongoDB connectivity: a read-only `ping` to the existing local MongoDB instance succeeded; no database records were changed.
- Combined root `npm run dev`: passed in a temporary F00+B00 integration copy; both services started, the frontend returned HTTP 200, and the Vite `/api/health` proxy returned a connected health response.

## Outstanding items

None identified before validation. Integration with F00 requires both independently reviewed milestone branches to be approved and merged into `develop`.

## Git and review

- Branch: `backend/B00-backend-initialization` (created from approved `origin/develop`).
- Implementation commit: `01d044e2d19089a97edca6a27a2f594076d53815`.
- Documentation commit: recorded immediately after the implementation commit.
- Pull request: recorded after push; target `develop`.
- Status: implementation and backend validation complete; awaiting review and PR checks.
