# img-shoot backend

Express API and Mongoose connection foundation, with a token-only reCAPTCHA verification endpoint for the local privacy form.

## Run locally

```sh
cd shoot-backend
npm ci
Copy-Item .env.example .env # PowerShell; use cp on macOS/Linux
npm run dev
```

Set `MONGODB_URI` in `.env` to use an existing MongoDB instance. The example URI points to the local `img_shoot_dev` database. The API does not install, start, seed, clear, or otherwise modify a MongoDB server. If MongoDB is unavailable, the API remains available and reports `database: "disconnected"` from `/api/health`.

Independent checks: `npm run lint`, `npm test`, and `npm run build`. From repository root, `npm run dev` starts each initialized app concurrently.

## API

- `GET /api/health` — API liveness plus MongoDB connection state.
- `GET /api/recaptcha/config` — `{ "siteKey": "public-key-or-empty", "configured": false|true }`. No secret is exposed; responses are not cached.
- `POST /api/privacy-requests/verify` — JSON `{ "recaptchaToken": "response-from-your-widget" }`; returns `{ "verified": true }` only after server verification. It does not accept or submit a privacy request, send personal form fields, or write to a database.

## Configure real reCAPTCHA

Register a reCAPTCHA v2 checkbox site key and secret for domains you control. Configure `RECAPTCHA_SITE_KEY`, `RECAPTCHA_SECRET_KEY`, `RECAPTCHA_ALLOWED_HOSTNAMES` and `RECAPTCHA_ALLOWED_ORIGINS` in the backend environment. Use comma-separated exact hostnames/origins, without paths or wildcards. The secret belongs only in the backend environment; never put it in frontend `VITE_*` variables or tracked files. Missing, placeholder and Google's public test keys keep verification unavailable. The public config endpoint reports configuration readiness; key validity is ultimately determined by Google's verification response, which fails closed.

For local development register a **separate real key** that permits `localhost`, then use hostnames `localhost,127.0.0.1` and origins `http://localhost:4173,http://127.0.0.1:4173`. Only include hostnames supported by that site's registration. For production set `NODE_ENV=production`, use separate production keys, HTTPS frontend origins and their exact public hostnames; localhost/loopback and HTTP production configurations are rejected.

The frontend's same-origin `/api` proxy must preserve the browser's `Origin` header. Verification rejects missing or unlisted origins and checks the verified hostname matches both the hostname allowlist and the requesting origin. The API deliberately emits no cross-origin access headers. Public config is safe to read without `Origin`.

The verifier uses the fixed HTTPS Google `siteverify` endpoint, checks `success === true`, exact hostname, challenge age at most 120 seconds and future clock skew at most five seconds, and rejects contradictory errors. A five-second timeout covers both connection and response parsing. Exceptions and upstream errors are sanitized; tokens and secrets are never logged or included in responses. Only token + secret go to Google; no `remoteip` or privacy form data is sent.

Error responses use `{ "code": "...", "message": "..." }`: 400 malformed/missing token or extra body fields; 403 origin/challenge rejected; 409 reused/in-flight token; 429 too many attempts; 503 missing configuration, upstream failure or timeout. Rate failures include `Retry-After: 60`. Verification accepts no extra personal data fields, and limits JSON to 12 KB. Reuse after failed/timeout verification is also rejected: complete a fresh challenge.

Rate and replay guards use SHA-256 token hashes, not raw tokens, in bounded expiring maps (10,000 entries each). Limits are 10 token attempts per socket IP per minute, and each token hash is reserved atomically before network I/O for 150 seconds. This prevents concurrent duplicates in one Node process. There is no database dependency. **Before deploying multiple processes/instances, replace these guards with shared atomic Redis or equivalent storage and apply edge rate limits.** Restarts reset these guards; Google also enforces single-use tokens. Behind the local proxy all users share its socket IP; production must use a deliberately configured trusted ingress identity/rate policy, rather than accepting arbitrary `X-Forwarded-For`. This implementation never enables Express `trust proxy`.

The privacy UI remains an explicit local preview after verification; a successful response is not evidence of an accepted real privacy request. No live CAPTCHA is solved during automated tests. Tests inject the Google response and clock; public Google test credentials are explicitly rejected.

Protocol reference: [Google response verification](https://developers.google.com/recaptcha/docs/verify), [Google testing and localhost guidance](https://developers.google.com/recaptcha/docs/faq).
