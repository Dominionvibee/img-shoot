# shoot-frontend

React frontend workspace for img-shoot. Frontend milestone IDs use the `F` prefix: F00 establishes the application foundation; F01 and later add only user-approved features.

## Stack

- React 19 with Vite 8 and the official React plugin.
- JavaScript ES modules and ESLint flat configuration.
- Vitest for unit tests.
- Vite proxies `/api/*` to `http://localhost:4000` during development.

Use Node.js 22.13 or newer (Node 24 is supported).

## Commands

```sh
npm install
npm run dev
npm run lint
npm test
npm run build
npm run preview
```

The dev server is at `http://localhost:5173`; the preview server is at `http://localhost:4173`. Copy `.env.example` to `.env.local` to override the API proxy target. Never commit real `.env` files.
