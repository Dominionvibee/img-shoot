# shoot-frontend

F01 uses React 18 and React Router 6.30.1 for local routes. The public IMG Models sitemap has 3,563 URLs; the route inventory also includes archive pagination. Captured original markup, CSS, SVG logos, fonts and media preserve the reference appearance. React and React Router are vendored, so no npm installation is needed.

All internal IMG links open locally, including `/directory/:territory/:talent`, `/work/:slug`, category and author routes. Pages already captured load from disk. Remaining published routes and uncaptured galleries use a read-only public reference cache on first visit and therefore require internet access. A reference rate limit returns an explicit retry message. The original theme uses document navigation between React routes to reset its page lifecycle safely.

The complete inventory and cache coverage are in `data/routes.json`. To finish storing every published page for offline use, run `node scripts/capture-all-routes.mjs` from the F01 checkout. The resumable crawler makes one request at a time and stops on HTTP 429.

Run with Node 24:

```sh
npm run dev
```

Open `http://127.0.0.1:4173`. From the repository's main checkout, use `npm run dev --prefix .f01-work/shoot-frontend` to run the F01 worktree.

```sh
npm test
npm run build
npm run preview
```

The production build includes `dist/server.mjs`, its API adapter, data, and assets. Stop the development server before previewing on the same port, or set `PORT` to another port. A plain static file host cannot serve the local API.

See [F01 validation and limitations](docs/milestones/F01/README.md) and [asset attribution](assets/README.md). Directory and search are captured data, consent choices stay in browser storage, and scouting/contact/legal destinations remain official external links. The replica does not submit applications or collect personal photos.
