# M00 — Repository and Git workflow setup

- **Status:** Implemented — PR #1 open for review
- **Branch:** `setup/M00`
- **Pull request:** https://github.com/Dominionvibee/img-shoot/pull/1; the fix retargets it to `develop`.

## Original requirements and objectives

Configure img-shoot for user-directed, sequential milestone work. The user supplies each milestone prompt one at a time, beginning with M01. Do not invent future milestone requirements, create future branches in advance, or begin a later milestone without its prompt.

## Implementation scope

- Established `main` as the stable branch and `develop` as the integration branch.
- Added repository documentation, a pull request template, `.gitignore`, and GitHub Actions workflows.
- Added component workspaces `shoot-frontend/` and `shoot-backend/`.
- Documented frontend milestone IDs F00/F01... in `shoot-frontend/` and backend IDs B00/B01... in `shoot-backend/`; global M-series IDs are used only when supplied by the user.
- Added the central milestone tracker with M00 and only the next supplied milestone, M01, awaiting instructions.
- Set up a dedicated `setup/M00` branch from the latest `origin/develop` for this workflow update.

## Files created

- `docs/MILESTONE_TRACKER.md`
- `docs/milestones/M00/README.md`

## Files modified

- `docs/git-workflow.md`
- `docs/milestones/README.md`
- `.github/workflows/ci.yml`
- `.github/workflows/milestone-pr.yml`
- `.github/pull_request_template.md`
- `shoot-frontend/README.md`
- `shoot-backend/README.md`

## Routes, endpoints, features, and integrations

- Application routes/endpoints: none; application folders contain documentation only.
- Product features: none implemented in M00.
- Frontend/backend integration: none; application stacks have not been provided.
- Database changes: none.

## Security and validation considerations

The repository `.gitignore` excludes environment secrets, keys, dependency folders, and generated outputs. GitHub Actions declare least-privilege workflow permissions. The current CI checks repository structure; stack-specific checks remain pending until the stacks are defined.

## Tests performed and actual results

- Repository layout/documentation preflight: passed locally.
- `git diff --cached --check`: passed locally after removing trailing whitespace.
- GitHub CI run: passed — https://github.com/Dominionvibee/img-shoot/actions/runs/44744279175
- Milestone PR workflow before the fix: validation passed, but it filtered existing PRs by base `develop`. PR #1 used base `main`, so the workflow tried to create another PR and failed because GitHub Actions cannot create PRs here. Run: https://github.com/Dominionvibee/img-shoot/actions/runs/44746945382
- The fix locates the existing PR by source branch regardless of its base, then updates it to target `develop`.
- No application tests were available or run because there is no application code yet.
- The updated GitHub Actions workflow must be verified by the run triggered by this M00 fix.

## Bugs discovered and resolved

No application bugs were in scope. Documentation now explicitly keeps milestone creation under the user's control and disallows speculative milestone branches.

## Outstanding issues and limitations

- M01 instructions have not been supplied; its scope and branch do not exist yet.
- Frontend and backend stacks and their checks remain undefined.
- GitHub branch protection could not be inspected with the available API authentication. Configure protection for `main` and `develop` in repository settings.
- GitHub Actions still cannot create a new PR when none exists for a milestone branch. This fix updates the existing PR #1. To enable automatic creation for future branches, allow GitHub Actions to create and approve pull requests in repository settings (and ensure organization policy permits it).

## Git and review references

- Branch: `setup/M00`
- Commit reference: latest commit on `setup/M00` and PR #1.
- Pull request link/status: [PR #1](https://github.com/Dominionvibee/img-shoot/pull/1); the updated workflow retargets it to `develop`.
- Completion status: implemented and pushed; awaiting PR review. No merge has been performed.
