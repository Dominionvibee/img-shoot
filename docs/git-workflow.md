# Git and GitHub workflow

## Branches

- `main`: stable, approved release history.
- `develop`: integration branch for approved milestone work.
- `frontend/Fxx-<description>`: one branch per defined frontend milestone, branched from the latest approved `develop`.
- `backend/Bxx-<description>`: one branch per defined backend milestone, branched from the latest approved `develop`.
- `milestone/Mxx-<description>`: one branch per defined repository milestone, branched from the latest approved `develop`.
- `fix/<description>` and `hotfix/<description>`: scoped fixes.

Do not create milestone branches until their scope is defined. Never combine unrelated milestones on one branch. Do not force-push or rewrite shared history.

## Component and milestone IDs

- `F00`: frontend setup/baseline in `shoot-frontend/`.
- `F01` and later: frontend feature milestones in `shoot-frontend/`.
- `B00`: backend setup/baseline in `shoot-backend/`.
- `B01` and later: backend feature milestones in `shoot-backend/`.
- `M00`: repository and workflow initialization.

Use the ID in branch names and commit scopes, for example `frontend/F00-frontend-setup`, `feat(F00): establish frontend baseline`, and `feat(B01): add first endpoint`.

## Milestone procedure

1. Define one objective, acceptance criteria, affected component/routes, and validation plan in `docs/milestones/`.
2. Update local `develop` from the approved remote `develop`.
3. Create one component-scoped branch (`frontend/Fxx-*`, `backend/Bxx-*`) or repository milestone branch (`milestone/Mxx-*`). Every milestone branch starts from the same approved `develop` baseline; never derive one milestone branch from another.
4. Implement only that milestone; make reviewable commits such as `feat(F01): ...`, `fix(B01): ...`, or `docs(F00): ...`.
5. Push the branch. CI runs and GitHub Actions opens or updates a pull request targeting `develop` when repository Actions permissions allow it. Before beginning later milestone work, merge the latest approved `develop` into its branch without force-pushing.
6. Review the diff and passing checks; merge only after approval. Never auto-merge.
7. Remove the milestone branch after merge according to repository policy.

## Pull requests

Use the shared [pull request template](../.github/pull_request_template.md). Titles should include the milestone ID, e.g. `F01: Implement first frontend route` or `B01: Implement first backend endpoint`. Explain completed work, affected routes/components, checks run, and outstanding issues.

## Validation and protection

CI validates repository structure and runs the frontend test and build commands. Add app-specific checks as each component stack is selected. Configure GitHub rulesets/branch protection for `main` and `develop` to require pull requests and successful checks, block force pushes, and prevent deletion. GitHub account/repository permissions are required for those settings.

Never commit secrets or real `.env` files. Add safe `.env.example` files when needed. Keep generated output and dependency folders out of commits.
