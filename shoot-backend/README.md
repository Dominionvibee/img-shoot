# img-shoot backend

Express API and Mongoose connection foundation. No business-specific API routes are included.

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
