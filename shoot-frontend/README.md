# shoot-frontend

F01 uses React 18 and React Router 6.30.1 for local routes. The public IMG Models sitemap has 3,563 URLs; the route inventory also includes archive pagination. Captured original markup, CSS, SVG logos, fonts and media preserve the reference appearance. React and React Router are vendored, so no npm installation is needed.

The landing URL is `/home` and `/` redirects there. IMG links use React navigation, including directory, profile, work, category, author and footer routes. Pages already captured load from disk. Other public IMG paths and uncaptured galleries use a read-only reference cache on first visit and require internet access. A reference rate limit returns an explicit retry message.

The footer's WME terms, privacy and cookie pages use captured current policy content within local React routes. Get Scouted and the OneTrust privacy form open inside local React routes as live embedded pages, so those two experiences require internet access. Site Credits, Instagram and TikTok retain their official external destinations; the copyright line is non-clickable.

The complete inventory and cache coverage are in `data/routes.json`. To finish storing every published page for offline use, run `node scripts/capture-all-routes.mjs` from the F01 checkout. The resumable crawler makes one request at a time and stops on HTTP 429.

Run with Node 24:

```sh
npm run dev
```

Open `http://127.0.0.1:4173/home`. From the repository's main checkout, use `npm run dev --prefix .f01-work/shoot-frontend` to run the F01 worktree.

```sh
npm test
npm run build
npm run preview
```

The production build includes `dist/server.mjs`, its API adapter, data, and assets. Stop the development server before previewing on the same port, or set `PORT` to another port. A plain static file host cannot serve the local API.

See [F01 validation and limitations](docs/milestones/F01/README.md) and [asset attribution](assets/README.md). Directory and search use captured data, and consent choices stay in browser storage. The embedded scouting and privacy services retain their official form handling; F01 itself does not submit applications or collect personal photos.
