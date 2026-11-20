# F01 — IMG Models Website Replication

**Branch:** `frontend/F01-website-replication`  
**Reference:** [imgmodels.com](https://imgmodels.com/)  
**Status:** refreshed implementation; visual acceptance remains incomplete.

## Scope and reference inspection

The attached master prompt requires page, state, responsive, and browser screenshot comparisons. I inspected the live public text and links exposed by the reference for the home page, directory, search, archive page 1, contact, About Us, Recruitment Warning, Under 18 FAQs, and the Fashion Workers Act route on 20 November 2026. The public page exposes Directory, Get Scouted, Search, Contact, Instagram, TikTok, and footer links for About Us, privacy, legal and safety information.

The computer-use browser service was unavailable in this session, and direct network requests from the shell were blocked. As a result, I could not capture reference screenshots, read computed styles, inspect hover/focus/consent states, or complete the required side-by-side comparisons at the nine requested viewport widths. The implementation must not be described as pixel-perfect. The Fashion Workers Act page content could not be read by the available page reader; the local route links to the official New York State Department of Labor information and documents that limitation instead of inventing copy.

## Implemented routes

| Route | Local behavior |
| --- | --- |
| `/` | Current captured Met Gala 2026 feature, Latest work and Covers sections, archive link |
| `/directory/` | Captured talent records with location, category and gender filters, alphabet links, grid/list modes |
| `/search/` | Local search over the captured talent and work records, with Directory and Work result tabs |
| `/from-the-archive/` | Captured editorial archive, 29-page snapshot and previous/next navigation |
| `/contact/` | Six public office addresses, email links and telephone links |
| `/about-us/` | Public About copy and observed office information |
| `/recruitmentwarning/` | Public recruitment safety warning text |
| `/under-18-faq/` | Seven public FAQs, shown as static question-and-answer sections |
| `/new-york-state-fashion-workers-act/` | Route notice with official NY Department of Labor link; reference page text unavailable to inspect |

The header follows the live public navigation labels. The footer includes the public legal, social, contact and safety links. Public IMG profile links and Get Scouted remain external; the clone does not collect credentials, photos, or applications.

## Data and behavior limits

The directory and editorial archive are snapshots (`data/talent.json`, `data/archive.json`), not live IMG APIs. They can become stale. Search only covers the captured records. Pagination and filters operate on local JSON. The archive and homepage cards use local presentation behavior; their exact destination/interaction on the live site was not verified. The Fashion Workers Act body, cookie-consent banner, detailed mobile menu states, loading states, and page-specific work/profile pages remain unverified or incomplete.

## Design and responsiveness

Styles use the existing Lay Grotesk font URLs and IMG public media URLs from the captured data. The layout has mobile and tablet breakpoints and responsive image grids. These rules were updated to reflect the observed black-and-white IMG presentation and current page hierarchy. Local headless Chrome captures were taken at all nine requested widths (320, 375, 390, 430, 768, 1024, 1280, 1440, and 1920px). The 320px, 390px, and 1920px captures were visually reviewed for layout; the hero and editorial image slots were blank because external IMG media/font requests were denied (`net::ERR_NETWORK_ACCESS_DENIED`). A screenshot of the live reference could not be captured from this environment, so no valid side-by-side visual comparison or pixel-diff score is available. Actual visual fidelity remains unverified.

## Run locally

```sh
cd shoot-frontend
npm run dev
```

The Node development server listens at `http://127.0.0.1:4173`. In another shell, the checks are:

```sh
npm test
npm run build
```

## Validation record

For this refresh, `npm test` passed (4 tests), `npm run build` passed, and `node --check src/app.mjs` passed. HTTP smoke checks returned 200 for all nine local content routes and both local JS/CSS assets. Headless local screenshots were captured at 320, 375, 390, 430, 768, 1024, 1280, 1440, and 1920px; selected widths were visually checked, but remote images/fonts did not load. Browser interaction checks and comparison against a live reference screenshot remain incomplete because the computer-use service failed to connect and direct browser requests were denied. Do not treat earlier F01 checks as evidence for this refreshed implementation.

## Source URLs

- [Home](https://imgmodels.com/)
- [Directory](https://imgmodels.com/directory/)
- [Search](https://imgmodels.com/search/)
- [From the Archive](https://imgmodels.com/from-the-archive/)
- [Contact](https://imgmodels.com/contact/)
- [About Us](https://imgmodels.com/about-us/)
- [Recruitment Warning](https://imgmodels.com/recruitmentwarning/)
- [Under 18 FAQs](https://imgmodels.com/under-18-faq/)
- [New York State Fashion Workers Act](https://imgmodels.com/new-york-state-fashion-workers-act/)