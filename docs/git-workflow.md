# Git and GitHub workflow

## Branches

- `main`: stable, approved release history.
- `develop`: integration branch for approved milestone work.
- `milestone/<ID>-<description>`: one branch per defined milestone, branched from the latest approved `develop`.
- `fix/<description>` and `hotfix/<description>`: scoped fixes.

Do not create milestone branches until their scope is defined. Never combine unrelated milestones on one branch. Do not force-push or rewrite shared history.

## Component and milestone IDs

- `F00`: frontend setup/baseline in `shoot-frontend/`.
- `F01` and later: frontend feature milestones in `shoot-frontend/`.
- `B00`: backend setup/baseline in `shoot-backend/`.
- `B01` and later: backend feature milestones in `shoot-backend/`.
- `M00`: repository and workflow initialization.

Use the ID in branch names and commit scopes, for example `milestone/F01-first-route`, `feat(F01): add first route`, and `feat(B01): add first endpoint`.

## Milestone procedure

1. Define one objective, acceptance criteria, affected component/routes, and validation plan in `docs/milestones/`.
2. Update local `develop` from the approved remote `develop`.
3. Create one `milestone/<ID>-<description>` branch.
4. Implement only that milestone; make reviewable commits such as `feat(F01): ...`, `fix(B01): ...`, or `docs(F00): ...`.
5. Push the branch. CI runs and GitHub Actions opens or updates a pull request targeting `develop`.
6. Review the diff and passing checks; merge only after approval. Never auto-merge.
7. Remove the milestone branch after merge according to repository policy.

## Pull requests

Use the shared [pull request template](../.github/pull_request_template.md). Titles should include the milestone ID, e.g. `F01: Implement first frontend route` or `B01: Implement first backend endpoint`. Explain completed work, affected routes/components, checks run, and outstanding issues.

## Validation and protection

The current CI validates that the repository documentation and component directories exist. App-specific checks must be added after each stack and package manager are selected. Configure GitHub rulesets/branch protection for `main` and `develop` to require pull requests and successful checks, block force pushes, and prevent deletion. GitHub account/repository permissions are required for those settings.

Never commit secrets or real `.env` files. Add safe `.env.example` files when needed. Keep generated output and dependency folders out of commits.
