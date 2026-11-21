# shoot-frontend

F01 uses React 18 and React Router 6.30.1 for local routes. The inventory contains 3,643 paths, including the 3,563 public sitemap URLs, archive pagination, additional linked paths and local partner routes. Captured original markup, CSS, SVG logos, fonts and media preserve each site's presentation. React and React Router are vendored.

The landing URL is `/#`; `/home` redirects there. IMG links use React navigation, including directory, profile, work, category, author and footer routes. Pages already captured load from disk. Other public IMG paths and uncaptured galleries use a read-only reference cache on first visit and require internet access. A reference rate limit returns an explicit retry message.

Each route retains its reference header and footer, including the absence of an IMG site footer on the OneTrust form. Get Scouted uses `/get-scouted`; WME policies use `/term-of-use`, `/privacy-policy`, `/cookie-policy` and `/the-incubator-terms`. The privacy form uses `/do-not-sell-my-personal-info`; its distinct corporate policy links use `/img-privacy-policy` and `/img-cookie-policy`. Internal page navigation stays local. Original social, credit and unrelated brand destinations remain external. Whole pages are not embedded. The current privacy form is a local preview without an active CAPTCHA widget; the separately tested verification modules and backend endpoints require owner-controlled keys before use.

The scouting age gate, adult/guardian forms, photo previews, and privacy form validation work locally. Submitting either form displays an explicit local preview notice; no application, personal photos, or privacy request is sent to a production service.

The route inventory is in `data/routes.json`; every inventoried page shell is captured. This is not a complete offline media/gallery archive. Uncached galleries and remote media still require reference-site access; HTTP 429 and offline states show an explicit local message. The resumable capture tools stop on rate limits.

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

See the [current verification report](docs/milestones/F01/VERIFICATION.md) for comparison results, remaining differences and exact QA commands, and [asset attribution](assets/README.md). Directory and search use dated captured data; consent choices stay in browser storage. Forms validate locally and report explicit unsent preview results.
