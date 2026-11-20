# shoot-frontend

F01 reproduces the inspected public IMG Models pages using captured original markup, CSS, SVG logos, fonts, media, and the original frontend theme. React 18 is vendored with its license; no npm dependencies are required. Public directory, search, and gallery requests resolve against a read-only local snapshot API.

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
