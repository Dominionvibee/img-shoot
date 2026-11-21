# F01 — Original IMG Models favicon

Implemented and verified on 21 November 2026.

## Source and assets

The public [IMG Models homepage](https://imgmodels.com/) declares the original ICO, 32px and 16px PNG icons, an Apple touch icon and a web manifest. The manifest declares 192px and 512px Android icons. All seven source files were downloaded unchanged into `shoot-frontend/public/` in this worktree and the main React/Vite checkout.

| File | Original source | Dimensions |
| --- | --- | --- |
| `favicon.ico` | [Original ICO](https://imgmodels.com/favicon.ico?v=2.01) | 16, 32 and 48px frames |
| `favicon-32x32.png` | [Original PNG](https://imgmodels.com/favicon-32x32.png) | 32 × 32 |
| `favicon-16x16.png` | [Original PNG](https://imgmodels.com/favicon-16x16.png) | 16 × 16 |
| `apple-touch-icon.png` | [Original touch icon](https://imgmodels.com/apple-touch-icon.png) | 180 × 180 |
| `android-chrome-192x192.png` | [Original Android icon](https://imgmodels.com/android-chrome-192x192.png) | 192 × 192 |
| `android-chrome-512x512.png` | [Original Android icon](https://imgmodels.com/android-chrome-512x512.png) | 512 × 512 |
| `site.webmanifest` | [Original manifest](https://imgmodels.com/site.webmanifest) | Unmodified JSON |

[favicon-source.json](favicon-source.json) records source URLs, content types, byte counts and SHA-256 hashes. No image was resized, recolored, redrawn, recompressed or converted. The original manifest is also byte-identical to its source, including its empty name fields and original theme/background colors. Existing asset attribution remains applicable.

## Integration

Both `index.html` entry points declare the same icon set with origin-root URLs, so nested, partner and refreshed routes do not resolve icons relative to their own paths. The old placeholder `favicon.svg` and its references were removed. Existing titles, descriptions, theme metadata, page components and application routes were preserved.

The F01 server now serves `public/` files at the origin root, matching Vite's public-directory semantics, and returns `application/manifest+json` for `.webmanifest`. Its build copies public assets to the `dist/` root. Both production builds contain the seven unchanged files. No package dependency was added.

## Verification

- All **3,643 local route HTTP responses** include the six shared icon/manifest declarations; no failures.
- **Chrome 157.0.8103.79, Edge 157.0.4341.60 and Firefox 151.0** passed desktop and mobile-sized viewport checks.
- Nine representative routes per browser/viewport passed direct navigation and refresh checks: home, directory, contact, nested profile, nested archive, scouting, privacy form, WME terms and corporate privacy. Existing browser titles remained correct.
- In-app footer navigation retained the document and icon declarations.
- Each browser decoded all six original image assets at their expected dimensions and verified all seven HTTP response hashes and content types. Automatic favicon request results are recorded in the browser report.
- Both main Vite and F01 builds preserved all seven asset bytes. F01 lint and **22 tests** passed, including two favicon regressions for public-file delivery, hashes, nested-route inheritance and titles. Both builds passed.

Evidence: [browser and route verification](qa/favicon-verification.json), [asset provenance](favicon-source.json), and `tests/favicon.test.mjs`.

The checks use headless browser engines, not screenshots of the native browser tab strip. Mobile checks use emulated/mobile-sized viewports and touch settings; physical Android/iOS devices and installed home-screen behavior were not manually tested. Firefox uses its desktop engine at the mobile viewport because Playwright does not support Firefox's `isMobile` option. Original touch icons and manifest assets are provided for those clients.

## Reproduce

From this worktree:

```powershell
npm test --prefix shoot-frontend
npm run build --prefix shoot-frontend
node scripts/verify-favicon.mjs
```

The browser script uses an existing `playwright-core` installation. If it is outside the project, set `PLAYWRIGHT_CORE_PATH` to its package directory. Set `FIREFOX_EXECUTABLE` to an already-installed test Firefox if required. Chrome and Edge use their installed browser channels. No browser or package installation is performed by the script. `FRONTEND_URL` defaults to `http://localhost:4173`.
