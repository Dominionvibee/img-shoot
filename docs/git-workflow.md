# Git and GitHub workflow

## Repository and branches

- One repository contains both `shoot-frontend/` and `shoot-backend/`.
- `main` holds approved releases; `develop` integrates approved work.
- Frontend milestones use `frontend/Fxx-<description>`.
- Backend milestones use `backend/Bxx-<description>`.
- Each milestone branch starts from the latest approved `develop`; never derive one milestone branch from another.

Only create a milestone branch after its instructions are provided. Reuse an existing scoped branch when one already exists. Never overwrite branches, force-push, rewrite history, or merge without approval.

## Component scopes

- F00/F01 and later: frontend initialization/features in `shoot-frontend/`.
- B00/B01 and later: backend initialization/features in `shoot-backend/`.
- Keep each milestone in its own branch and document it in the corresponding app's `docs/milestones/<ID>/README.md`.

## Milestone procedure

1. Read the supplied requirements and prior milestone documentation.
2. Check local and remote refs; preserve existing branches and PRs.
3. Fetch `origin/develop`, confirm the working tree is clean, and create a missing branch from that approved baseline.
4. Implement only the supplied milestone and its shared tracking/workflow updates.
5. Run relevant install, lint, test, build, and startup checks; document actual results and limitations.
6. Commit with the component ID, push the branch, and create/update its PR targeting `develop`.
7. Review and merge only after approval. Before later work resumes, synchronize its branch safely with approved `develop` changes.

## Validation and safety

GitHub Actions validates each initialized app with its lockfile, lint, tests, and production build. PR creation automation runs after successful branch validation; if repository permissions prohibit creation, it provides a manual PR link without failing the validation run. PR checks target `main` and `develop` only.

Never commit secrets, local `.env` files, dependency folders, or generated output. Keep `.env.example` values non-secret. The root development command starts app servers only; it must never start, seed, erase, or replace a database service.
