# shoot-frontend

F01 uses React 18 and React Router 6.30.1 for local routes. The public IMG Models sitemap has 3,563 URLs; the route inventory also includes archive pagination. Captured original markup, CSS, SVG logos, fonts and media preserve the reference appearance. React and React Router are vendored, so no npm installation is needed.

The landing URL is `/#`; `/home` redirects there. IMG links use React navigation, including directory, profile, work, category, author and footer routes. Pages already captured load from disk. Other public IMG paths and uncaptured galleries use a read-only reference cache on first visit and require internet access. A reference rate limit returns an explicit retry message.

Every pictured footer destination renders directly in the React document with local content and assets. Get Scouted and We Love Your Genes both use `/get-scouted`; policies use `/term-of-use`, `/privacy-policy`, and `/cookie-policy`. The privacy form uses `/do-not-sell-my-personal-info`. Legacy paths redirect to those canonical URLs. Site Credits, Instagram and TikTok retain their external destinations; copyright is non-clickable. No page is embedded in an iframe.

The scouting age gate, adult/guardian forms, photo previews, and privacy form validation work locally. Submitting either form displays an explicit local preview notice; no application, personal photos, or privacy request is sent to a production service.

The complete inventory and cache coverage are in `data/routes.json`. To finish storing every published page for offline use, run `node scripts/capture-all-routes.mjs` from the F01 checkout. The resumable crawler makes one request at a time and stops on HTTP 429.

Run with Node 24:

```sh
npm run dev
```

Open `http://localhost:4173/#`. From the repository's main checkout, use `npm run dev --prefix .f01-work/shoot-frontend` to run the F01 worktree.

```sh
npm test
npm run build
npm run preview
```

The production build includes `dist/server.mjs`, its API adapter, data, and assets. Stop the development server before previewing on the same port, or set `PORT` to another port. A plain static file host cannot serve the local API.

See [F01 validation and limitations](docs/milestones/F01/README.md) and [asset attribution](assets/README.md). Directory and search use captured data, and consent choices stay in browser storage. The scouting and privacy interfaces use local validation and explicit preview results.
