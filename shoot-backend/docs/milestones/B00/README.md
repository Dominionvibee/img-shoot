# B00 — Backend Initialization

## Authorized reCAPTCHA integration — 21 November 2026

The user requested genuine server verification for the local privacy preview. This follow-up extends the initialized API with `GET /api/recaptcha/config` and `POST /api/privacy-requests/verify`; it does not implement privacy-request submission, storage, email delivery, or database writes. The historical B00 foundation description below remains the baseline.

The public config endpoint returns only the site key and a readiness flag. Four explicit backend settings are required: `RECAPTCHA_SITE_KEY`, `RECAPTCHA_SECRET_KEY`, `RECAPTCHA_ALLOWED_HOSTNAMES`, and `RECAPTCHA_ALLOWED_ORIGINS`. The secret is backend-only; placeholder/public Google test keys fail closed. Production requires HTTPS frontend origins and excludes localhost/loopback configurations. The public readiness flag validates configuration shape, not Google's acceptance of the credentials; an invalid secret returned by Google makes verification unavailable.

The verification route accepts only `{ "recaptchaToken": "..." }`, with a 12 KB JSON limit. It requires a browser Origin matching the explicit origin allowlist. The fixed HTTPS Google verifier receives only token and secret; local form personal fields and remote IP are never sent. Google success must be the boolean `true`, contain no error codes, match the exact configured hostname and requesting browser host, and carry an ISO challenge timestamp no more than 120 seconds old or five seconds in the future. A five-second abort deadline covers connection and response parsing. Responses contain `{ "verified": true }` or a sanitized `{ "code", "message" }`; no secrets, raw tokens, upstream errors or request-accepted claims are emitted.

Per-process guards reserve token SHA-256 hashes synchronously before I/O for 150 seconds, reject concurrent/replayed tokens (including failed attempts), and limit verification to 10 attempts per socket IP per minute. Replay/client maps hold at most 10,000 entries each and prune expired entries. These bounds require shared atomic storage and an explicit ingress rate policy before horizontal scaling; process restarts clear local state, while Google still enforces token single-use. The app never trusts arbitrary forwarded IP headers. No new dependency was added, and no database access is needed by the verifier.

Validation: backend lint/build and 59 tests pass, including the two existing health tests. Verification tests use dependency-injected fetch and clocks and cover real protocol success shape, missing/test configuration, malicious origins, unexpected personal fields, malformed/oversized input, wrong/expired/future host/timestamp responses, Google errors, network/body timeouts, response parsing/size failures, concurrent duplicate and used tokens, per-socket rate limits, memory bounds and expiry. No CAPTCHA is solved during testing, no real test key is accepted, and no live privacy request is sent. Live Google success remains untested until the owner configures legitimate separately registered keys.

Operational commands and exact environment examples are in the backend [README](../../../README.md). Google's protocol is documented at [response verification](https://developers.google.com/recaptcha/docs/verify); test-key and localhost guidance is in [the official FAQ](https://developers.google.com/recaptcha/docs/faq).

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
- Environment configuration: copied `.env.example` to a temporary `.env` in the disposable integration copy and ran root `npm run dev` without shell variables; the backend loaded `PORT=4000` and connected using `MONGODB_URI`. The temporary file was removed after the test.
- MongoDB connectivity: a read-only ping to the existing local instance succeeded; no database records were changed.
- Connection failure: starting against closed local port 1 logged the failure, kept the server alive, and returned HTTP 200 with `database: "disconnected"`.
- Headers/CORS: Helmet's `X-Content-Type-Options: nosniff` was present; no cross-origin allow header was returned for an unrelated origin.
- Full-stack root `npm run dev` in a disposable F00+B00 integration copy passed from PowerShell and Git Bash. Both services listened on ports 5173/4000, the frontend rendered, `/api/health` worked directly and through the Vite proxy, MongoDB connected, and the Vite HMR websocket delivered an update after a temporary stylesheet edit.
- Headless Edge reported no F00 console errors or failed resources at 320, 390, 768, and 1440 px; `/` refreshed successfully.
- Ctrl+C stopped both services; subsequent connection attempts to ports 5173 and 4000 were refused.
- Root `npm ci --ignore-scripts`: passed.

## Outstanding items

No B00-scope blockers remain. A read-only merge preview of the current F00 and B00 branch heads reports no conflicts. The production CORS allowlist depends on the eventual hosted frontend origin. Integration into `develop` requires approval; neither branch has been merged.

## Git and review

- Branch: `backend/B00-backend-initialization` (created from approved `origin/develop`).
- Implementation commit: `01d044e2d19089a97edca6a27a2f594076d53815`.
- Documentation commit: recorded immediately after the implementation commit.
- Pull request: [#4](https://github.com/Dominionvibee/img-shoot/pull/4), open and targeting `develop`.
- Status: validation passed; open for review. GitHub Actions checks passed on the pushed branch.
