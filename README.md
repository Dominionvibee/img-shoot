# img-shoot

Full-stack monorepo with one Git repository, one `main` branch, and one `develop` integration branch.

- `shoot-frontend/` — React and Vite application; frontend milestones use F-series IDs.
- `shoot-backend/` — Node.js, Express, and Mongoose API; backend milestones use B-series IDs.
- `docs/` — project workflow and independent frontend/backend milestone tracking.

## Development

Install the frontend and root packages after checkout:

```sh
npm install --prefix shoot-frontend
npm install
npm run dev
```

The root command starts each initialized application concurrently. The frontend listens at `http://localhost:5173`; the backend listens at `http://localhost:4000` after B00 is present. During the F00-only phase, the root supervisor starts the frontend and clearly reports that the backend package is not initialized yet.

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
