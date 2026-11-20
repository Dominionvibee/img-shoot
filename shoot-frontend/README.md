# shoot-frontend

Frontend milestone F01 is a dependency-free static replication of publicly accessible IMG Models pages. Its implementation, routes, source inspection, and known fidelity limits are documented in [F01](docs/milestones/F01/README.md).

## Run

```sh
npm run dev
```

The F01 development server listens at `http://127.0.0.1:4173`. The implementation uses native HTML/CSS/JavaScript modules and the captured public data in `data/`.

## Validate

```sh
npm test
npm run build
```

The directory and editorial data are snapshots. The local search does not query IMG Models, and the site does not collect scouting submissions or personal photos.