# Git and GitHub workflow

## Branches

- `main`: stable, approved release history.
- `develop`: integration branch for approved milestone work.
- `setup/M00`: repository workflow setup.
- `milestone/M01-<description>` and later: one branch for each milestone after the user provides its instructions.
- `fix/<description>` and `hotfix/<description>`: scoped fixes when requested.

Do not invent future milestone requirements or create milestone branches in advance. Do not overwrite an existing branch, rewrite shared history, force-push, or merge a pull request without approval.

## Processing a supplied milestone

For each new user-provided milestone prompt:

1. Read its requirements, inspect the current project, and review prior milestone documentation and the tracker.
2. Identify the milestone number, scope, acceptance criteria, and impacted component folders.
3. Check GitHub and local refs for an existing branch or implementation. Preserve it; never replace it.
4. Confirm the working tree is clean. Fetch `origin/develop` and use the latest approved `develop` baseline. Create a missing branch from `origin/develop`.
5. If resuming an existing milestone branch that is behind approved `develop`, merge `origin/develop` into it safely before implementation. Resolve and document conflicts; do not force-push.
6. Implement only the supplied milestone. Preserve existing behavior outside its scope.
7. Run applicable checks and record actual commands and results. Report failures accurately.
8. Document actual work in `docs/milestones/<ID>/README.md` and update `docs/MILESTONE_TRACKER.md`.
9. Commit with a message such as `feat(M01): implement supplied requirements` and push the milestone branch.
10. Open or update a pull request targeting `develop`. Never auto-merge.

Never start the next milestone until the user supplies its prompt.

## Components and milestone IDs

- Frontend code belongs in `shoot-frontend/`; its component-local labels, when used, are F00/F01 and later.
- Backend code belongs in `shoot-backend/`; its component-local labels, when used, are B00/B01 and later.
- The user-controlled repository milestone sequence and branch names use M00, M01, M02, and so on. A supplied M milestone may affect either or both component folders.

## Pull requests and validation

The pull request template records the objective, completed work, affected routes/components, validation, and outstanding issues. GitHub Actions currently validates the repository layout. Add stack-specific install, lint, typecheck, test, build, and security checks after each application stack is defined.

The milestone PR workflow opens or updates pull requests against `develop` for milestone branches. M00 setup PRs use `setup/M00`. Auto-merge is disabled. GitHub must permit Actions to create pull requests.

## Protection and security

Configure GitHub rulesets or branch protection for `main` and `develop` to require pull requests and passing checks, block force pushes, and prevent deletion. Never commit secrets or real `.env` files. Use `.env.example` for safe examples and keep generated output and dependency folders out of commits.
