# F01 — IMG Models reference reclone

**Branch:** `frontend/F01-website-replication`
**Reference:** [IMG Models](https://imgmodels.com/)
**Inspected:** 20 November 2026
**Status:** recloned and browser validated for the captured scope; remaining coverage limits are listed below. No claim of whole-site 100% fidelity.

## Completed pages and components

The previous approximate layout has been replaced with the actual public page markup, original compiled theme CSS, original SVG logos, original fonts and media, and the original frontend interaction bundle. F01 retains its existing Node server/native-module structure. Vendored React 18 provides the original directory/search/gallery behavior; its license is included.

| Route | Implementation |
| --- | --- |
| `/` | Actual Leticia Hall V Magazine desktop image/mobile video, roster links, horizontal editorial carousel, Latest grid, Anok Yai split feature, Covers grid, both archive links |
| `/directory/` | Original territory/category/gender picker, link filters, alphabet, grid/list modes and responsive controls; 18 captured territory/category rosters |
| `/search/` | Original header autocomplete, result types, sidebar filters, sorting, directory and work groups; local snapshot data |
| `/from-the-archive/` and `/from-the-archive/page/2/` through `/page/29/` | Exact captured markup for all 29 pages, 1,020 cards, original previous/next links and statuses |
| `/contact/` | Original six-office contact grid, mail and telephone links |
| `/about-us/` | Original copy and office information |
| `/recruitmentwarning/` | Original recruitment safety content |
| `/under-18-faq/` | Original parent/guardian FAQ content |
| `/new-york-state-fashion-workers-act/` | Both actual certificate images, replacing the former unavailable-content notice |
| `/directory/london/vanesa-lorenzo/` | Captured profile, original portfolio carousel, social link, mobile portfolio interface and locally served official PDF |

The shared fixed/scrolling header, mobile navigation, footer and consent interface use the reference appearance. The 19 homepage editorial links open their actual captured galleries, media, credits and footer. Other uncaptured galleries display an explicit local snapshot notice. The local API supports six GET contracts and rejects writes; videos/PDFs support HTTP byte ranges.

237 URL mappings resolve to 236 local assets. All mapped paths were checked and exist. Source attribution and the React license are in [assets/README.md](../../../assets/README.md).

## Browser comparison results

Installed Chrome was controlled through its DevTools protocol after native browser control proved unavailable. Original and local viewport PNGs were captured at identical dimensions, with computed geometry/font measurements and Pillow pixel comparisons. Videos were paused at time zero for deterministic comparisons. Media-dependent captures were repeated after metadata loaded.

**90 route/viewport pairs were compared:** home plus nine other captured route types at all nine widths. **82 pairs were pixel-identical.** The remaining eight had mean absolute RGB channel error between 0.0006 and 0.062084 on a 0–255 scale. Differences were limited to small image/video raster regions; the identified archive JPEG has identical reference/local file hashes. No layout correction was indicated by those residual differences.

The cookie preference center was also compared at 390 and 1440px; both screenshots were pixel-identical after correcting runtime panel height, mobile footer, scrollbar behavior, opt-out notice and focus.

These are viewport comparisons at 900px height and DPR 1, not a guarantee for every full-page pixel, browser, animation frame or untested interaction state. Archive pages 2–29 were checked for exact captured markup and pagination; representative pages 2 and 29 were also exercised in the browser. They did not each receive a separate nine-width screenshot matrix.

Evidence:

- [Viewport comparison data](qa/viewport-comparison.json)
- [Interaction results](qa/interaction-results.json)
- [Reference desktop](qa/home-reference-desktop.png) / [local desktop](qa/home-local-desktop.png)
- [Reference mobile](qa/home-reference-mobile.png) / [local mobile](qa/home-local-mobile.png)
- [Reference consent](qa/consent-reference-desktop.png) / [local consent](qa/consent-local-desktop.png)

The complete local capture set remains in the ignored worktree `reference/qa/` directory. Reproduction helpers are in the checkout's `scripts/` directory.

## Responsive and interaction validation

Widths tested: **320, 375, 390, 430, 768, 1024, 1280, 1440 and 1920px**. The content pages, default directory/search, certificates and captured profile matched measured reference geometry. No local horizontal overflow, broken mapped assets or runtime exceptions were found in the final checks. Original delayed media loading causes temporary layout changes; comparisons were repeated after loading instead of mistaking those for different CSS.

Browser checks exercised:

- Editorial gallery opening, four-image sample content, URL state, close and Escape.
- New York/Model selection returning the same 272 talent cards, list view with 272 names, and closing the picker.
- Search for Anok returning the same 101 results: one directory profile and 100 captured works. Header autocomplete also returned talent and work suggestions.
- Mobile menu open/close with the original navigation and footer content.
- Archive page 2 previous/home and next/page-3 links; page 29 previous/page-28 and disabled next behavior.
- Captured profile controls and local official PDF destination.
- Cookie settings, accordion, custom checkbox persistence, focus containment, Escape and background inert restoration. Choices are a local simulation and do not activate production analytics.

No scouting form is copied locally. Scouting, social, email, telephone and external legal links retain their official destinations.

## Checks and production build

`npm test` passed all **9 tests**. Coverage includes directory/category/gender filtering, captured search contracts, genuine gallery data, disclosed missing galleries, write rejection, missing-asset 404s and bounded/suffix/invalid video byte ranges. Node syntax checks passed for the application modules. This branch has no separate lint script.

`npm run build` passed. The generated `dist/server.mjs` was launched on port 4174 and checked in Chrome. Production HTTP checks returned 200 for home, directory, archive page 29, local search API and the official PDF. The build includes its local API, data and original assets; a plain static file host is insufficient.

## Remaining differences and coverage limits

- Only Vanesa Lorenzo's complete profile is captured locally. Other talent profile links remain on the official website. Their individual portfolio states have not all been cloned or compared.
- Search and directory are dated snapshots, not live IMG data. Search beyond captured regular works uses the archive snapshot. Results can diverge as the live site changes.
- The 19 homepage galleries are fully captured. Most other archive/search galleries do not have full local gallery data and disclose that limitation.
- Some later archive pages, uncaptured search works and filtered directory photographs still use original remote media URLs. They require network access; mapped assets, homepage galleries and the captured profile are local.
- The consent host/vendor list was empty in the captured markup. Its details view does not invent records and announces that local snapshot limit. The full live OneTrust service is not reproduced.
- Authentication/editor tools, external scouting submissions and external legal/service sites are outside the captured local implementation. Cross-browser, real touch-device and every hover/loading/error state have not been exhaustively compared.

## Run

From the user's main workspace checkout:

```sh
npm run dev --prefix .f01-work/shoot-frontend
```

Open `http://127.0.0.1:4173`. This explicitly runs F01 while the main checkout remains on F00.

From this F01 checkout:

```sh
npm run dev --prefix shoot-frontend
npm test --prefix shoot-frontend
npm run build --prefix shoot-frontend
npm run preview --prefix shoot-frontend
```

Stop the development server before previewing on the same port. Node 24 is used; no frontend npm dependencies need installing.
