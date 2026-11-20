# F00 — Frontend setup and baseline

**Status:** Implemented; awaiting review  
**Branch:** `frontend/F00-frontend-setup`  
**Baseline:** latest approved `develop` (`9322a2377e41acf605571047d56c957be1c2fbf2`)

## Objective and scope

Establish a small, accessible frontend workspace for later frontend milestones. F00 selects native HTML, CSS, and JavaScript ES modules with Node.js built-ins so contributors can run, build, and validate the app without a framework or dependency install. It does not implement product routes or the F01 website replication.

## Delivered

- `package.json` scripts for local development, static build, and Node's test runner.
- A Node HTTP development server with MIME types, 404 handling, and path traversal protection.
- A static build that copies the app shell and frontend source into ignored `dist/`.
- A minimal responsive starter page with a skip link, semantic landmarks, and visible keyboard focus.
- `.gitignore` entries for generated output, dependencies, and local environment files.
- A server smoke-test suite covering the page, stylesheet, missing paths, and traversal rejection.
- Updated workspace documentation with stack and run commands.

## Validation

Run from `shoot-frontend/`:

```sh
npm test
npm run build
```

Completed on this branch:

- `npm test`: 2 passing HTTP smoke tests, including static assets, 404 handling, and path traversal rejection.
- `npm run build`: passed; generated `dist/` output is ignored by Git.
- Browser smoke check: page loaded and JavaScript initialized at 320, 390, 768, and 1440 px without horizontal overflow; keyboard Tab focused the skip link first.
- `git diff --check`: passed.

F00 checks only the baseline runtime and shell. Product UI and interactions are specified in later frontend milestones.
