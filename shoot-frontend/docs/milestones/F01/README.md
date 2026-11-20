# F01 — Website Replication

**Status:** Implemented; awaiting review on `frontend/F01-website-replication`  
**Reference inspected:** [imgmodels.com](https://imgmodels.com/) on 20 November 2026  
**Scope:** `shoot-frontend/` plus the shared milestone tracker and Git workflow/CI files.

## Delivered

This is a dependency-free static frontend implemented with native HTML, CSS, JavaScript modules, and Node.js. It reproduces the publicly accessible site areas inspected for the milestone and uses a captured public-content snapshot for the directory and editorial archive.

- Home page with the reference hero, latest editorials, and cover grid.
- Directory with location/category/gender filtering, alphabetical jump links, grid/list display, and links through to official IMG profile pages. Snapshot includes 1,156 public talent records.
- Search page with directory and work results, query URL state, result tabs, and combined result counts.
- From the Archive with all 29 captured pages and 1,020 public cards, plus previous/next pagination and image/video lightbox.
- Contact page with six public IMG office contact blocks.
- About page, recruitment warning, under-18 FAQ, and New York State Fashion Workers Act information route.
- Responsive header/navigation, mobile menu, cookie notice, and responsive layouts for narrow phones through wide desktop screens.

### Public route inventory

| Route | Implemented behavior |
|---|---|
| `/` | Hero, editorial cards, cover section, archive links |
| `/directory/` | Filterable 1,156-person captured catalog, alphabet links, grid/list modes |
| `/search/?q=...` | Local directory/archive search with result type tabs |
| `/from-the-archive/` and `/from-the-archive/page/N/` | Captured archive cards with pagination |
| `/contact/` | Six office addresses, email and telephone links |
| `/about-us/` | Public company overview and directory link |
| `/recruitmentwarning/` | Public anti-impersonation warning and verified contact route |
| `/under-18-faq/` | Parent/guardian safety guidance in accessible accordions |
| `/new-york-state-fashion-workers-act/` | Information route and official state labor resource |

Unknown routes show a simple not-found view. External destinations, including Get Scouted and individual talent profile pages, remain on their official IMG domains.

## Fidelity and safety notes

Reference inspection covered the homepage, directory, search, contact, about, archive, recruitment warning, under-18 FAQ, and Fashion Workers Act routes, along with desktop and mobile layouts. The frontend reuses the public reference’s wordmark text treatment, typefaces, public image/video URLs, and layout proportions. Search and directory data are local snapshots; profile links open the official IMG site. Get Scouted remains an external official link; this reproduction does not collect credentials or personal submissions. Cookie preferences are stored locally only; analytics/advertising scripts are not installed.

Some differences remain: the wordmark and some UI glyphs are text/CSS instead of the reference SVG/icon set; non-home long-form legal/about copy is summarized rather than duplicated in full; profile details and search results are not live-updated; search covers the captured directory plus archive, not every current server-side result type. The browser comparison environment denied outbound media/font requests (`net::ERR_NETWORK_ACCESS_DENIED`), so local comparison screenshots could not render the remote reference images, video, or fonts. With network access, those URLs are used directly. The original site may change independently of this snapshot.

## Run and validate

From this directory:

```sh
npm run dev
npm test
npm run build
```

The build writes static output to ignored `dist/`. Validation completed on this branch:

- `npm test`: 3 passing tests; checks catalog size/search, combined directory filters, and all 1,020 captured archive cards.
- `npm run build`: passed; generated static output in ignored `dist/`.
- Browser routes checked: `/`, `/directory/`, `/search/?q=Anok%20Yai`, `/contact/`, `/from-the-archive/`.
- Browser interactions checked: New York directory filter, list view, mobile navigation open, and search result render; no page JavaScript errors observed.
- Responsive viewport widths checked: 320, 375, 390, 430, 768, 1024, 1280, 1440, and 1920 px; no horizontal overflow observed on the home route.
- Visual screenshots were captured and compared with reference screenshots. Layout structure was comparable, but blocked remote media/font loads prevent a full visual asset comparison in this environment.

## Captured public data

- `data/talent.json`: directory API snapshot, 1,156 entries.
- `data/archive.json`: 29 archive pages, 1,020 cards.
- `data/homepage.json`: homepage hero, latest cards, and cover cards.
- `data/work.json`: supplementary public work query snapshot.

Data was obtained from unauthenticated public pages/endpoints. Only publicly accessible material is represented.
