# img-shoot

Full-stack monorepo with one Git repository, one `main` branch, and one `develop` integration branch.

- `shoot-frontend/` — frontend application; frontend milestones use F-series IDs (F00 establishes React and Vite).
- `shoot-backend/` — Node.js, Express, and Mongoose API; backend milestones use B-series IDs.
- `docs/` — project workflow and independent frontend/backend milestone tracking.

## Development

Install the available app packages after checkout:

```sh
npm ci --prefix shoot-frontend
npm ci
npm run dev
```

The root command starts each initialized application concurrently. F00's React/Vite server uses `http://127.0.0.1:4175`; the preserved F01 implementation currently serves on `http://localhost:4173`. The backend listens at `http://localhost:4000` after B00 is approved and merged into `develop`; until then the runner reports that the backend package is not initialized on this branch.

Independent commands:

Frontend:

```sh
cd shoot-frontend
npm run dev
```

Backend:

```sh
cd shoot-backend
npm run dev
```

Set `MONGODB_URI` in the backend's local `.env` file to connect an already-running MongoDB service. The development command never installs or starts MongoDB and does not seed, drop, or reset databases.

## Validation

Each app provides independent `lint`, `test`, and build scripts. GitHub Actions runs applicable checks on milestone branches and pull requests. See [Git workflow](docs/git-workflow.md), the [milestone index](docs/milestones/README.md), and [milestone tracker](docs/MILESTONE_TRACKER.md).
